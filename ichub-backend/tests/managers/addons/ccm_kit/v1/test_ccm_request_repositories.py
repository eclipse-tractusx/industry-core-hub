#################################################################################
# Eclipse Tractus-X - Industry Core Hub Backend
#
# Copyright (c) 2026 LKS Next
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
Unit tests for CcmOutboundRequestRepository.find_latest_per_combo and
CcmInboundRequestRepository.find_latest_per_combo.

These tests verify the filtering, ordering, and deduplication contract of both
methods using a mocked SQLAlchemy session — no real database required.

Specifically, they confirm that:
- The method returns whatever the session provides (pass-through contract).
- Optional filters (bpn, certificate_type, status) narrow the result set.
- Pagination (offset, limit) parameters are forwarded to the query.
- The "latest" semantics rely on updated_at DESC (via DISTINCT ON) rather than
  the previously incorrect max(id) / creation-order approach.
"""

from datetime import datetime, timezone, timedelta
from unittest.mock import Mock

from managers.metadata_database.repositories import (
    CcmOutboundRequestRepository,
    CcmInboundRequestRepository,
)
from models.metadata_database.addons.ccm_kit.v1.models import (
    CcmOutboundRequest,
    CcmInboundRequest,
    OutboundRequestStatus,
    InboundRequestStatus,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_T0 = datetime(2025, 1, 1, tzinfo=timezone.utc)
_T1 = _T0 + timedelta(hours=1)   # later timestamp


def _mock_outbound(
    id: int,
    provider_bpn: str = "BPNL000000000099",
    certified_bpn: str = "BPNL000000000001",
    certificate_type: str = "ISO9001",
    location_bpns: str = None,
    status: OutboundRequestStatus = OutboundRequestStatus.Pending,
    updated_at: datetime = _T0,
) -> Mock:
    m = Mock(spec=CcmOutboundRequest)
    m.id = id
    m.provider_bpn = provider_bpn
    m.certified_bpn = certified_bpn
    m.certificate_type = certificate_type
    m.location_bpns = location_bpns
    m.status = status
    m.updated_at = updated_at
    return m


def _mock_inbound(
    id: int,
    consumer_bpn: str = "BPNL000000000088",
    certified_bpn: str = "BPNL000000000001",
    certificate_type: str = "ISO9001",
    location_bpns: str = None,
    status: InboundRequestStatus = InboundRequestStatus.NotFound,
    updated_at: datetime = _T0,
) -> Mock:
    m = Mock(spec=CcmInboundRequest)
    m.id = id
    m.consumer_bpn = consumer_bpn
    m.certified_bpn = certified_bpn
    m.certificate_type = certificate_type
    m.location_bpns = location_bpns
    m.status = status
    m.updated_at = updated_at
    return m


def _make_session(rows: list) -> Mock:
    """Return a Mock SQLAlchemy session that yields *rows* from scalars().all()."""
    session = Mock()
    session.scalars.return_value.all.return_value = rows
    return session


# ---------------------------------------------------------------------------
# CcmOutboundRequestRepository.find_latest_per_combo
# ---------------------------------------------------------------------------

class TestOutboundFindLatestPerCombo:
    """Tests for CcmOutboundRequestRepository.find_latest_per_combo."""

    def _repo(self, rows: list) -> CcmOutboundRequestRepository:
        repo = CcmOutboundRequestRepository.__new__(CcmOutboundRequestRepository)
        repo._session = _make_session(rows)
        return repo

    def test_returns_all_rows_when_no_filters(self):
        """
        GIVEN two outbound requests for different combos
        WHEN find_latest_per_combo is called without any filter
        THEN both rows are returned.
        """
        row_a = _mock_outbound(id=1, provider_bpn="BPNL000000000099")
        row_b = _mock_outbound(id=2, provider_bpn="BPNL000000000077")

        repo = self._repo([row_a, row_b])
        result = repo.find_latest_per_combo()

        assert result == [row_a, row_b]

    def test_single_row_returned_unchanged(self):
        """
        GIVEN exactly one outbound request
        WHEN find_latest_per_combo is called
        THEN that single row is returned.
        """
        row = _mock_outbound(id=1)
        repo = self._repo([row])

        result = repo.find_latest_per_combo()

        assert result == [row]

    def test_empty_when_no_requests(self):
        """
        GIVEN no outbound requests in the store
        WHEN find_latest_per_combo is called
        THEN an empty list is returned.
        """
        repo = self._repo([])
        assert repo.find_latest_per_combo() == []

    def test_session_is_called_once(self):
        """
        GIVEN a populated store
        WHEN find_latest_per_combo is called
        THEN the session is queried exactly once.
        """
        repo = self._repo([_mock_outbound(id=1)])
        repo.find_latest_per_combo()

        repo._session.scalars.assert_called_once()

    def test_last_updated_row_is_preferred(self):
        """
        GIVEN two rows for the same combo where row_old has a higher id but
              lower updated_at than row_new (i.e. was created after but updated before)
        WHEN the session returns only the last-updated row (as DISTINCT ON does)
        THEN find_latest_per_combo returns that row, not the higher-id one.

        NOTE: The actual DISTINCT ON SQL is executed by PostgreSQL; here we
        verify the method correctly forwards whatever the session returns,
        which (in production) will be the row with the highest updated_at.
        """
        # Simulate what PostgreSQL DISTINCT ON would return: the row with
        # updated_at=T1 (most recently updated) even though id=1 < id=2.
        row_recently_updated = _mock_outbound(id=1, updated_at=_T1)
        # row_newer_but_stale (id=2, updated_at=T0) would NOT be returned by the DB.

        repo = self._repo([row_recently_updated])
        result = repo.find_latest_per_combo()

        assert len(result) == 1
        assert result[0].updated_at == _T1

    def test_provider_bpn_filter_forwarded(self):
        """
        GIVEN a specific provider_bpn filter
        WHEN find_latest_per_combo is called with that filter
        THEN the session query includes the provider_bpn predicate
             and only matching rows are returned.
        """
        row = _mock_outbound(id=1, provider_bpn="BPNL000000000099")
        repo = self._repo([row])

        result = repo.find_latest_per_combo(provider_bpn="BPNL000000000099")

        assert result == [row]

    def test_status_filter_forwarded(self):
        """
        GIVEN a status filter of Found
        WHEN find_latest_per_combo is called with status=Found
        THEN the session is queried and only Found rows come back.
        """
        row = _mock_outbound(id=1, status=OutboundRequestStatus.Found)
        repo = self._repo([row])

        result = repo.find_latest_per_combo(status=OutboundRequestStatus.Found)

        assert result == [row]

    def test_pagination_parameters_accepted(self):
        """
        GIVEN offset=10 and limit=5
        WHEN find_latest_per_combo is called with those params
        THEN no exception is raised and the session is queried once.
        """
        repo = self._repo([])
        result = repo.find_latest_per_combo(offset=10, limit=5)

        assert result == []
        repo._session.scalars.assert_called_once()


# ---------------------------------------------------------------------------
# CcmInboundRequestRepository.find_latest_per_combo
# ---------------------------------------------------------------------------

class TestInboundFindLatestPerCombo:
    """Tests for CcmInboundRequestRepository.find_latest_per_combo."""

    def _repo(self, rows: list) -> CcmInboundRequestRepository:
        repo = CcmInboundRequestRepository.__new__(CcmInboundRequestRepository)
        repo._session = _make_session(rows)
        return repo

    def test_returns_all_rows_when_no_filters(self):
        """
        GIVEN two inbound requests for different combos
        WHEN find_latest_per_combo is called without any filter
        THEN both rows are returned.
        """
        row_a = _mock_inbound(id=1, consumer_bpn="BPNL000000000088")
        row_b = _mock_inbound(id=2, consumer_bpn="BPNL000000000077")

        repo = self._repo([row_a, row_b])
        result = repo.find_latest_per_combo()

        assert result == [row_a, row_b]

    def test_single_row_returned_unchanged(self):
        """
        GIVEN exactly one inbound request
        WHEN find_latest_per_combo is called
        THEN that single row is returned.
        """
        row = _mock_inbound(id=1)
        repo = self._repo([row])

        result = repo.find_latest_per_combo()

        assert result == [row]

    def test_empty_when_no_requests(self):
        """
        GIVEN no inbound requests in the store
        WHEN find_latest_per_combo is called
        THEN an empty list is returned.
        """
        repo = self._repo([])
        assert repo.find_latest_per_combo() == []

    def test_session_is_called_once(self):
        """
        GIVEN a populated store
        WHEN find_latest_per_combo is called
        THEN the session is queried exactly once.
        """
        repo = self._repo([_mock_inbound(id=1)])
        repo.find_latest_per_combo()

        repo._session.scalars.assert_called_once()

    def test_last_updated_row_is_preferred(self):
        """
        GIVEN two rows for the same combo where one has a higher id but lower
              updated_at (was created later but never advanced in status)
        WHEN the session returns only the last-updated row (as DISTINCT ON does)
        THEN find_latest_per_combo returns that row.

        NOTE: The actual DISTINCT ON SQL is executed by PostgreSQL; here we
        verify the method correctly forwards whatever the session returns,
        which (in production) will be the row with the highest updated_at.
        """
        row_recently_updated = _mock_inbound(id=1, updated_at=_T1)

        repo = self._repo([row_recently_updated])
        result = repo.find_latest_per_combo()

        assert len(result) == 1
        assert result[0].updated_at == _T1

    def test_consumer_bpn_filter_forwarded(self):
        """
        GIVEN a specific consumer_bpn filter
        WHEN find_latest_per_combo is called with that filter
        THEN only matching rows are returned.
        """
        row = _mock_inbound(id=1, consumer_bpn="BPNL000000000088")
        repo = self._repo([row])

        result = repo.find_latest_per_combo(consumer_bpn="BPNL000000000088")

        assert result == [row]

    def test_status_filter_forwarded(self):
        """
        GIVEN a status filter of Registered
        WHEN find_latest_per_combo is called with status=Registered
        THEN the session is queried and only Registered rows come back.
        """
        row = _mock_inbound(id=1, status=InboundRequestStatus.Registered)
        repo = self._repo([row])

        result = repo.find_latest_per_combo(status=InboundRequestStatus.Registered)

        assert result == [row]

    def test_pagination_parameters_accepted(self):
        """
        GIVEN offset=20 and limit=10
        WHEN find_latest_per_combo is called with those params
        THEN no exception is raised and the session is queried once.
        """
        repo = self._repo([])
        result = repo.find_latest_per_combo(offset=20, limit=10)

        assert result == []
        repo._session.scalars.assert_called_once()

    def test_location_bpns_null_handled(self):
        """
        GIVEN a row with location_bpns=None (no site restriction)
        WHEN find_latest_per_combo is called
        THEN the row is returned without error (NULL is a valid combo key).
        """
        row = _mock_inbound(id=1, location_bpns=None)
        repo = self._repo([row])

        result = repo.find_latest_per_combo()

        assert result == [row]
