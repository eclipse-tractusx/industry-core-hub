/********************************************************************************
 * Eclipse Tractus-X - Industry Core Hub Frontend
 *
 * Copyright (c) 2026 Capgemini Deutschland GmbH
 * Copyright (c) 2026 Contributors to the Eclipse Foundation
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

/** Multi-language text entry: an object with a language code as key, e.g. { "en": "Hello" } */
export type MultiLangEntry = Record<string, string>;

/** Extract the display value from a MultiLangEntry or array of entries, preferring English. */
export function getMultiLangValue(
  entries: MultiLangEntry | MultiLangEntry[] | undefined,
  preferredLang = 'en'
): string {
  if (!entries) return '';
  const arr = Array.isArray(entries) ? entries : [entries];
  if (arr.length === 0) return '';
  const preferred = arr.find(e => e[preferredLang]);
  if (preferred) return preferred[preferredLang];
  const first = arr[0];
  return Object.values(first)[0] ?? '';
}
