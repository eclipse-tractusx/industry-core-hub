/********************************************************************************
 * Eclipse Tractus-X - Industry Core Hub Frontend
 *
 * Copyright (c) 2025 LKS Next
 * Copyright (c) 2025 Contributors to the Eclipse Foundation
 *
 * See the NOTICE file(s) distributed with this work for additional
 * information regarding copyright ownership.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Apache License, Version 2.0 which is available at
 * https://www.apache.org/licenses/LICENSE-2.0.
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND,
 * either express or implied. See the
 * License for the specific language govern in permissions and limitations
 * under the License.
 *
 * SPDX-License-Identifier: Apache-2.0
 ********************************************************************************/

import { useMemo } from 'react';

/**
 * Error state for a single field
 */
export interface FieldErrorState {
    hasError: boolean;
    hasChildErrors: boolean;
    totalErrors: number;
    formattedMessages: string[];
}

/**
 * Map of field paths to their error states
 */
export type ErrorStateMap = Map<string, FieldErrorState>;

/**
 * Simplified hook to build error state map
 * Marks fields red if their exact path appears in the errors array
 */
export function useErrorStateMap(
    errors: string[],
    _fieldErrors?: Set<string>,
    _formFields?: any[],
    _data?: any
): ErrorStateMap {
    return useMemo(() => {
        const errorMap = new Map<string, FieldErrorState>();

        // For each error path, mark it and all parent paths
        errors.forEach(errorPath => {
            // Mark the field itself
            if (!errorMap.has(errorPath)) {
                errorMap.set(errorPath, {
                    hasError: true,
                    hasChildErrors: false,
                    totalErrors: 1,
                    formattedMessages: [`Validation error in ${errorPath}`]
                });
            }

            // Mark all parent paths as having child errors
            const parts = errorPath.split(/[.\[\]]/).filter(Boolean);
            for (let i = 1; i < parts.length; i++) {
                let parentPath = '';
                for (let j = 0; j < i; j++) {
                    if (j > 0) {
                        // Check if next part is a number (array index)
                        if (!isNaN(Number(parts[j]))) {
                            parentPath += `[${parts[j]}]`;
                        } else {
                            parentPath += `.${parts[j]}`;
                        }
                    } else {
                        parentPath = parts[j];
                    }
                }

                if (parentPath) {
                    const existing = errorMap.get(parentPath);
                    if (existing) {
                        existing.hasChildErrors = true;
                        existing.totalErrors += 1;
                    } else {
                        errorMap.set(parentPath, {
                            hasError: false,
                            hasChildErrors: true,
                            totalErrors: 1,
                            formattedMessages: []
                        });
                    }
                }
            }
        });

        return errorMap;
    }, [errors]);
}

/**
 * Get error state for a specific field path
 */
export function getErrorState(errorMap: ErrorStateMap, fieldPath: string): FieldErrorState {
    return errorMap.get(fieldPath) || {
        hasError: false,
        hasChildErrors: false,
        totalErrors: 0,
        formattedMessages: []
    };
}

/**
 * Check if a field or any of its children have errors
 */
export function hasAnyErrors(errorMap: ErrorStateMap, fieldPath: string): boolean {
    const state = getErrorState(errorMap, fieldPath);
    return state.hasError || state.hasChildErrors;
}

/**
 * Get total error count for a field and its children
 */
export function getTotalErrorCount(errorMap: ErrorStateMap, fieldPath: string): number {
    const state = getErrorState(errorMap, fieldPath);
    return state.totalErrors;
}
