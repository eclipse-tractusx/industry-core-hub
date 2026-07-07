#################################################################################
# Eclipse Tractus-X - Industry Core Hub Backend
#
# Copyright (c) 2026 Contributors to the Eclipse Foundation
#
# See the NOTICE file(s) distributed with this work for additional
# information regarding copyright ownership.
#
# This program and the accompanying materials are made available under the
# terms of the Apache License, Version 2.0 which is available at
# https://www.apache.org/licenses/LICENSE-2.0.
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND,
# either express or implied. See the
# License for the specific language govern in permissions and limitations
# under the License.
#
# SPDX-License-Identifier: Apache-2.0
#################################################################################

"""
Thread-safe log capture utilities for SDK diagnostic messages.

The Tractus-X SDK emits detailed policy-mismatch diffs at DEBUG level via the
``tractusx_sdk.dataspace.tools.dsp_tools`` logger.  This module provides the
infrastructure to capture those messages per-worker-thread so they can be
surfaced to the caller (and ultimately to the API consumer) instead of being
silently swallowed by the log stream.

Usage (inside an ``asyncio.to_thread`` call-site)::

    from tools.log_capture import run_with_policy_log_capture

    captured_logs: list[str] = []
    try:
        result = await asyncio.to_thread(
            run_with_policy_log_capture(some_sdk_fn, captured_logs),
            arg1, kwarg=value,
        )
    except ValueError as e:
        # captured_logs now contains the per-policy diff lines
        ...
"""

import logging
import threading
from typing import Callable, Any

# ---------------------------------------------------------------------------
# Internal implementation
# ---------------------------------------------------------------------------

class _ThreadLocalCapturingHandler(logging.Handler):
    """
    A :class:`logging.Handler` that stores emitted records per-thread.

    The handler is permanently attached to the target logger.  Capture is
    opt-in on a per-thread basis: call :meth:`activate` inside the worker
    thread you want to capture, and :meth:`deactivate` when done.  Threads
    that have never called :meth:`activate` are transparently ignored,
    so concurrent requests cannot interfere with each other.
    """

    def __init__(self, logger_name: str, level: int = logging.DEBUG) -> None:
        super().__init__(level)
        self._local = threading.local()
        self.setFormatter(logging.Formatter("%(message)s"))
        # Permanently register with the target logger so we never miss a record.
        logging.getLogger(logger_name).addHandler(self)

    # ------------------------------------------------------------------
    # Per-thread lifecycle
    # ------------------------------------------------------------------

    def activate(self) -> None:
        """Start capturing records in **this** thread."""
        self._local.records = []

    def deactivate(self) -> list[str]:
        """
        Stop capturing and return all records collected in **this** thread.

        Resets the per-thread buffer so repeated calls return an empty list.
        """
        records: list[str] = getattr(self._local, "records", [])
        self._local.records = None
        return records

    # ------------------------------------------------------------------
    # logging.Handler interface
    # ------------------------------------------------------------------

    def emit(self, record: logging.LogRecord) -> None:  # noqa: D102
        # Only store records when this thread has opted in via activate().
        bucket: list[str] | None = getattr(self._local, "records", None)
        if bucket is not None:
            bucket.append(self.format(record))


# Singleton handler — installed once at module-import time on the SDK logger
# that emits the policy-diff details.
_DSP_LOGGER_NAME = "tractusx_sdk.dataspace.tools.dsp_tools"
_dsp_handler = _ThreadLocalCapturingHandler(_DSP_LOGGER_NAME)

# ---------------------------------------------------------------------------
# Public helper
# ---------------------------------------------------------------------------

def run_with_policy_log_capture(fn: Callable, log_sink: list[str]) -> Callable[..., Any]:
    """
    Wrap *fn* so that DSP policy-mismatch DEBUG logs are captured into *log_sink*.

    Returns a callable with the same signature as *fn*.  This wrapper is meant
    to be passed as the first argument to :func:`asyncio.to_thread` so that log
    capture runs in the **same worker thread** as the SDK call::

        captured: list[str] = []
        result = await asyncio.to_thread(
            run_with_policy_log_capture(sdk_fn, captured),
            arg1, kwarg=value,
        )

    After the thread finishes (successfully or with an exception) *log_sink*
    will contain the formatted log lines emitted by the SDK while comparing
    catalog policies against the configured allowed policies.

    Args:
        fn: The (potentially blocking) function to execute.
        log_sink: A mutable list that will be extended with captured log lines.
                  Must be created in the caller's scope so it remains accessible
                  after the ``to_thread`` call completes.

    Returns:
        A wrapper callable that activates/deactivates log capture around *fn*.
    """

    def _wrapper(*args: Any, **kwargs: Any) -> Any:
        # Activate capture in THIS worker thread.
        _dsp_handler.activate()
        try:
            return fn(*args, **kwargs)
        finally:
            # Always flush captured lines into the caller-provided sink,
            # regardless of whether fn raised or returned normally.
            log_sink.extend(_dsp_handler.deactivate())

    return _wrapper
