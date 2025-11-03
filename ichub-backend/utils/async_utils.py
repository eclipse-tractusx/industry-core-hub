#################################################################################
# Eclipse Tractus-X - Industry Core Hub Backend
#
# Copyright (c) 2025 Contributors to the Eclipse Foundation
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

import asyncio
import functools
from functools import wraps
from typing import Callable, Any, Dict, List
import logging

logger = logging.getLogger(__name__)

def async_blocking(func: Callable) -> Callable:
    """
    Decorator to automatically run blocking functions in the default thread pool.
    
    This eliminates the need to manually call loop.run_in_executor in every endpoint.
    Simply decorate any blocking function call and it will automatically run asynchronously.
    
    Usage:
        @async_blocking
        def my_blocking_function(arg1, arg2):
            # This will automatically run in thread pool
            return some_blocking_operation(arg1, arg2)
        
        # In your async endpoint:
        result = await my_blocking_function(value1, value2)
    """
    @wraps(func)
    async def wrapper(*args, **kwargs):
        loop = asyncio.get_event_loop()
        # Use functools.partial to bind keyword arguments
        bound_func = functools.partial(func, *args, **kwargs)
        return await loop.run_in_executor(None, bound_func)
    return wrapper

async def run_blocking(func: Callable, *args, **kwargs) -> Any:
    """
    Utility function to run any blocking function in the thread pool.
    
    Usage:
        result = await run_blocking(blocking_function, arg1, arg2, kwarg1=value1)
    """
    loop = asyncio.get_event_loop()
    # Use functools.partial to bind keyword arguments
    bound_func = functools.partial(func, *args, **kwargs)
    return await loop.run_in_executor(None, bound_func)

class AsyncManagerWrapper:
    """
    Universal wrapper class that automatically makes ANY manager's methods async-friendly.
    This provides a clean interface without modifying the original managers.
    
    Usage:
        # Wrap any manager
        async_manager = AsyncManagerWrapper(some_manager)
        
        # Call any method asynchronously
        result = await async_manager.call_method('method_name', arg1, arg2, kwarg1=value1)
        
        # Or use the more direct approach
        result = await async_manager.some_method(arg1, arg2)
    """
    
    def __init__(self, manager, name: str = "Manager"):
        self._manager = manager
        self._name = name
    
    async def call_method(self, method_name: str, *args, **kwargs):
        """Generic method caller that runs any method in thread pool."""
        if not hasattr(self._manager, method_name):
            raise AttributeError(f"{self._name} has no method '{method_name}'")
        
        method = getattr(self._manager, method_name)
        loop = asyncio.get_event_loop()
        # Use functools.partial to bind keyword arguments
        bound_method = functools.partial(method, *args, **kwargs)
        return await loop.run_in_executor(None, bound_method)
    
    def __getattr__(self, name):
        """Dynamically create async versions of manager methods."""
        if hasattr(self._manager, name):
            original_method = getattr(self._manager, name)
            if callable(original_method):
                async def async_method(*args, **kwargs):
                    loop = asyncio.get_event_loop()
                    # Use functools.partial to bind keyword arguments
                    bound_method = functools.partial(original_method, *args, **kwargs)
                    return await loop.run_in_executor(None, bound_method)
                return async_method
        raise AttributeError(f"'{self._name}' object has no attribute '{name}'")

