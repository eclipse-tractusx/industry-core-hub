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

## This file was created using an LLM (Claude Sonnet 4) and reviewed by a human committer

import json
import base64
from typing import Dict, Optional
from dataclasses import dataclass

@dataclass
class DtrPaginationState:
    asset_id: str
    cursor: Optional[str] = None
    exhausted: bool = False

@dataclass
class PageState:
    dtr_states: Dict[str, DtrPaginationState]
    page_number: int = 0
    limit: Optional[int] = None  # Store the limit used for this page
    previous_state: Optional['PageState'] = None  # Store only immediate previous state

class PaginationManager:
    
    @staticmethod
    def encode_page_token(page_state: PageState) -> str:
        """Encode page state into a lightweight cursor token."""
        token_data = {
            "dtr_states": {
                asset_id: {
                    "cursor": state.cursor,
                    "exhausted": state.exhausted
                }
                for asset_id, state in page_state.dtr_states.items()
            },
            "page_number": page_state.page_number,
            "limit": page_state.limit
        }
        
        # Include previous state for backward navigation (only one level)
        if page_state.previous_state:
            token_data["previous_state"] = {
                "dtr_states": {
                    asset_id: {
                        "cursor": state.cursor,
                        "exhausted": state.exhausted
                    }
                    for asset_id, state in page_state.previous_state.dtr_states.items()
                },
                "page_number": page_state.previous_state.page_number,
                "limit": page_state.previous_state.limit
            }
        
        json_str = json.dumps(token_data)
        return base64.b64encode(json_str.encode()).decode()
    
    @staticmethod
    def decode_page_token(page_token: str) -> PageState:
        """Decode page token back to page state."""
        try:
            json_str = base64.b64decode(page_token.encode()).decode()
            token_data = json.loads(json_str)
            
            # Decode DTR states
            dtr_states = {}
            for asset_id, state_data in token_data.get("dtr_states", {}).items():
                dtr_states[asset_id] = DtrPaginationState(
                    asset_id=asset_id,
                    cursor=state_data.get("cursor"),
                    exhausted=state_data.get("exhausted", False)
                )
            
            # Decode previous state if present
            previous_state = None
            if "previous_state" in token_data:
                prev_data = token_data["previous_state"]
                prev_dtr_states = {}
                for asset_id, state_data in prev_data.get("dtr_states", {}).items():
                    prev_dtr_states[asset_id] = DtrPaginationState(
                        asset_id=asset_id,
                        cursor=state_data.get("cursor"),
                        exhausted=state_data.get("exhausted", False)
                    )
                
                previous_state = PageState(
                    dtr_states=prev_dtr_states,
                    page_number=prev_data.get("page_number", 0),
                    limit=prev_data.get("limit")
                )
            
            return PageState(
                dtr_states=dtr_states,
                page_number=token_data.get("page_number", 0),
                limit=token_data.get("limit"),
                previous_state=previous_state
            )
            
        except Exception:
            return PageState(dtr_states={}, page_number=0)
    
    @staticmethod
    def distribute_limit(total_limit: int, active_dtrs: int) -> int:
        """Distribute the total limit across active DTRs."""
        return max(1, total_limit // active_dtrs) if active_dtrs > 0 else total_limit
    
    @staticmethod
    def has_more_data(dtr_states: Dict[str, DtrPaginationState]) -> bool:
        """Check if any DTR has more data available."""
        return any(not state.exhausted for state in dtr_states.values())
    
    @staticmethod
    def is_cursor_compatible(page_state: PageState, current_limit: Optional[int]) -> bool:
        """Check if the cursor is compatible with the current request limit."""
        # If no limit in cursor, it's compatible with any limit
        if page_state.limit is None:
            return True
        
        # If current request has no limit, but cursor has limit, not compatible
        if current_limit is None and page_state.limit is not None:
            return False
            
        # Both have limits - they must match
        return page_state.limit == current_limit
