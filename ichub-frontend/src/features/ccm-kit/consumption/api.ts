/********************************************************************************
 * Eclipse Tractus-X - Industry Core Hub Frontend
 *
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
 * License for the specific language governing permissions and limitations
 * under the License.
 *
 * SPDX-License-Identifier: Apache-2.0
 ********************************************************************************/

/**
 * CCM Consumer API — wraps the backend consumer endpoints
 * (`/v1/addons/ccm-kit/consumer/*`). All bodies/responses use camelCase aliases.
 */

import axios from 'axios';
import httpClient from '@/services/HttpClient';
import { getIchubBackendUrl } from '@/services/EnvironmentService';
import {
  CatalogSearchResult,
  OutboundRequestItem,
  PullRequestPayload,
  PullResult,
  ReceivedCertificateDetail,
  ReceivedCertificateItem,
  SendRequestPayload,
  SendResult,
  SendStatusPayload,
} from './types/types';

const CONSUMER_BASE = '/addons/ccm-kit/consumer';

const baseUrl = (): string => {
  const url = getIchubBackendUrl();
  if (!url) throw new Error('[CCM] Backend URL not configured');
  return url;
};

/**
 * Step 1.1 — Check whether a provider supports CCM (has a notification asset).
 * POST /consumer/catalog-search
 */
export const catalogSearch = async (providerBpn: string): Promise<CatalogSearchResult> => {
  const response = await httpClient.post<CatalogSearchResult>(
    `${baseUrl()}${CONSUMER_BASE}/catalog-search`,
    { providerBpn },
  );
  return response.data;
};

/**
 * Step 1.2 — Send a certificate request to a provider.
 * POST /consumer/request
 */
export const createRequest = async (payload: SendRequestPayload): Promise<SendResult> => {
  const response = await httpClient.post<SendResult>(
    `${baseUrl()}${CONSUMER_BASE}/request`,
    payload,
  );
  return response.data;
};

/**
 * Step 1.3 — List outbound requests (latest entry per combination).
 * GET /consumer/requests
 */
export const fetchRequests = async (params?: {
  providerBpn?: string;
  certifiedBpn?: string;
  certificateType?: string;
  status?: string;
  offset?: number;
  limit?: number;
}): Promise<OutboundRequestItem[]> => {
  const response = await httpClient.get<OutboundRequestItem[]>(
    `${baseUrl()}${CONSUMER_BASE}/requests`,
    { params },
  );
  return response.data ?? [];
};

/**
 * Step 1.3 — Full history for a single (provider, certified, type) combination.
 * GET /consumer/requests/history  (all three params required)
 */
export const fetchRequestsHistory = async (params: {
  providerBpn: string;
  certifiedBpn: string;
  certificateType: string;
  offset?: number;
  limit?: number;
}): Promise<OutboundRequestItem[]> => {
  const response = await httpClient.get<OutboundRequestItem[]>(
    `${baseUrl()}${CONSUMER_BASE}/requests/history`,
    { params },
  );
  return response.data ?? [];
};

/**
 * Step 1.4 — Pull a certificate from the provider's catalog.
 * POST /consumer/pull
 */
export const pullCertificate = async (payload: PullRequestPayload): Promise<PullResult> => {
  const response = await httpClient.post<PullResult>(
    `${baseUrl()}${CONSUMER_BASE}/pull`,
    payload,
  );
  return response.data;
};

/**
 * Step 1.4 — List certificates already received/stored locally (metadata only).
 * GET /consumer/received
 */
export const fetchReceived = async (params?: {
  certifiedBpn?: string;
  certificateType?: string;
  offset?: number;
  limit?: number;
}): Promise<ReceivedCertificateItem[]> => {
  const response = await httpClient.get<ReceivedCertificateItem[]>(
    `${baseUrl()}${CONSUMER_BASE}/received`,
    { params },
  );
  return response.data ?? [];
};

/**
 * Step 1.4 — Detail (incl. base64 PDF) for one received certificate.
 * GET /consumer/received/{documentId}?providerBpn=...
 * Returns `null` when the certificate has not been received/downloaded yet (404).
 */
export const fetchReceivedDetail = async (
  documentId: string,
  providerBpn: string,
): Promise<ReceivedCertificateDetail | null> => {
  try {
    const response = await httpClient.get<ReceivedCertificateDetail>(
      `${baseUrl()}${CONSUMER_BASE}/received/${encodeURIComponent(documentId)}`,
      { params: { providerBpn } },
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return null;
    }
    throw error;
  }
};

/**
 * Step 1.5 — Send processing status feedback to the provider.
 * POST /consumer/status
 */
export const sendStatus = async (payload: SendStatusPayload): Promise<SendResult> => {
  const response = await httpClient.post<SendResult>(
    `${baseUrl()}${CONSUMER_BASE}/status`,
    payload,
  );
  return response.data;
};
