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
export function getValueByPath(obj: any, path: string): any {
    if (!path) return obj;
    return path.split('.').reduce((acc, part) => (acc && acc[part] !== undefined ? acc[part] : ''), obj);
}

export function setValueByPath(obj: any, path: string, value: any): any {
    if (!path) return value;
    const keys = path.split('.');
    const result = { ...obj };
    let current = result;
    for (let i = 0; i < keys.length - 1; i++) {
        const key = keys[i];
        if (!current[key] || typeof current[key] !== 'object') {
            current[key] = {};
        } else {
            current[key] = { ...current[key] };
        }
        current = current[key];
    }
    const lastKey = keys[keys.length - 1];
    // For top-level keys (primitive sections), always set the value even if empty string
    // However, for undefined values, always delete to remove from JSON completely
    // For nested keys, delete if empty/null/undefined
    const isTopLevel = keys.length === 1;
    if (value === undefined) {
        // Always delete undefined values to remove them from JSON completely
        delete current[lastKey];
    } else if ((value === '' || value === null) && !isTopLevel) {
        // For nested keys, delete if empty string or null
        delete current[lastKey];
    } else {
        current[lastKey] = value;
    }
    return result;
}
