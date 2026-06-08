/********************************************************************************
 * Eclipse Tractus-X - Industry Core Hub Frontend
 *
 * Copyright (c) 2026 Contributors to the Eclipse Foundation
 * Copyright (c) 2026 LKS Next
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
 * CCM Provider API — wraps the backend provider endpoints
 * (`/v1/addons/ccm-kit/provider/*`). All bodies/responses use camelCase aliases.
 */

import httpClient from '@/services/HttpClient';
import { getIchubBackendUrl } from '@/services/EnvironmentService';
import {
  AvailablePayload,
  InboundRequestItem,
  PublishedItem,
  PublishResult,
  PushPayload,
  SendResult,
  ShareItem,
} from './types/types';

const PROVIDER_BASE = '/addons/ccm-kit/provider';

const baseUrl = (): string => {
  const url = getIchubBackendUrl();
  if (!url) throw new Error('[CCM] Backend URL not configured');
  return url;
};

/**
 * Step 2.1 — List inbound certificate requests received from consumers.
 * GET /provider/inbound-requests
 */
export const fetchInboundRequests = async (params?: {
  consumerBpn?: string;
  certifiedBpn?: string;
  certificateType?: string;
  status?: string;
  offset?: number;
  limit?: number;
}): Promise<InboundRequestItem[]> => {
  const response = await httpClient.get<InboundRequestItem[]>(
    `${baseUrl()}${PROVIDER_BASE}/inbound-requests`,
    { params },
  );
  return response.data ?? [];
};

/**
 * Step 2.2 — Full inbound history for one (consumer, certified, type) combination.
 * GET /provider/inbound-requests/history  (all three params required)
 */
export const fetchInboundRequestsHistory = async (params: {
  consumerBpn: string;
  certifiedBpn: string;
  certificateType: string;
  offset?: number;
  limit?: number;
}): Promise<InboundRequestItem[]> => {
  const response = await httpClient.get<InboundRequestItem[]>(
    `${baseUrl()}${PROVIDER_BASE}/inbound-requests/history`,
    { params },
  );
  return response.data ?? [];
};

/**
 * Step 2.2 — Publish a certificate as an EDC asset (required before AVAILABLE).
 * POST /provider/publish
 */
export const publishCertificate = async (certificateId: number): Promise<PublishResult> => {
  const response = await httpClient.post<PublishResult>(
    `${baseUrl()}${PROVIDER_BASE}/publish`,
    { certificateId },
  );
  return response.data;
};

/**
 * List certificates already published as EDC assets.
 * GET /provider/published
 */
export const fetchPublished = async (): Promise<PublishedItem[]> => {
  const response = await httpClient.get<PublishedItem[]>(`${baseUrl()}${PROVIDER_BASE}/published`);
  return response.data ?? [];
};

/**
 * Step 2.2 — Notify a consumer that a certificate is available for PULL.
 * POST /provider/available
 */
export const sendAvailable = async (payload: AvailablePayload): Promise<SendResult> => {
  const response = await httpClient.post<SendResult>(
    `${baseUrl()}${PROVIDER_BASE}/available`,
    payload,
  );
  return response.data;
};

/**
 * Step 2.3 — Push a certificate directly to a consumer.
 * POST /provider/push
 */
export const pushCertificate = async (payload: PushPayload): Promise<SendResult> => {
  const response = await httpClient.post<SendResult>(
    `${baseUrl()}${PROVIDER_BASE}/push`,
    payload,
  );
  return response.data;
};

/**
 * Cross-certificate list of all share events.
 * GET /provider/shares
 */
export const fetchShares = async (params?: {
  consumerBpnl?: string;
  status?: string;
  offset?: number;
  limit?: number;
}): Promise<ShareItem[]> => {
  const response = await httpClient.get<ShareItem[]>(`${baseUrl()}${PROVIDER_BASE}/shares`, { params });
  return response.data ?? [];
};
