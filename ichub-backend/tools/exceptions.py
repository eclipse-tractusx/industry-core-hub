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

from pydantic import BaseModel

class ErrorDetail(BaseModel):
    status: int
    message: str

exception_responses ={
        400: {
            "description": "Invalid input provided. Please check your request and try again.",
            "model": ErrorDetail
        },
        403: {
            "description": "Access denied. You do not have permission to perform this action.",
            "model": ErrorDetail
        },
        404: {
            "description": "Catalog not found",
            "model": ErrorDetail
        },
        409: {
            "description": "Catalog part already exists",
            "model": ErrorDetail
        },
        422: {
            "description": "Validation Error",
            "model": ErrorDetail
        },
        502: {
            "description": "Bad Gateway - The server received an invalid response from the upstream server.",
            "model": ErrorDetail
        },
        503: {
            "description": "Service unavailable. Please try again later.",
            "model": ErrorDetail
        }
    }

class BaseError(Exception):
    def __init__(self, status_code: int, message: str):
        self.status_code = status_code
        self.detail = ErrorDetail(status=status_code, message=message)
        super().__init__(message)

class InvalidError(BaseError):
    """
    Exception raised when an invalid value is provided.
    """
    def __init__(self, message: str):
        super().__init__(status_code=400, message=message)

class NotFoundError(BaseError):
    """
    Exception raised when a requested resource is not found.
    """
    def __init__(self, message: str):
        super().__init__(status_code=404, message=message)

class AlreadyExistsError(BaseError):
    """
    Exception raised when a resource already exists.
    """
    def __init__(self, message: str):
        super().__init__(status_code=409, message=message)

class ValidationError(BaseError):
    """
    Exception raised when validation fails.
    """
    def __init__(self, message: str):
        super().__init__(status_code=422, message=message)

class ExternalAPIError(BaseError):
    """
    Exception raised when an external API call fails.
    """
    def __init__(self, message: str):
        super().__init__(status_code=502, message=message)

class NotAvailableError(BaseError):
    """
    Exception raised when a requested resource is not available.
    """
    def __init__(self, message: str):
        super().__init__(status_code=503, message=message)

class SubmodelNotSharedWithBusinessPartnerError(BaseError):
    """
    Exception raised when a requested twin is not shared with the specified business partner.
    """
    def __init__(self, message: str):
        super().__init__(status_code=403, message=message)
