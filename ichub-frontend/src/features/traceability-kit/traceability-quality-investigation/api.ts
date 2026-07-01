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
 * License for the specific language govern in permissions and limitations
 * under the License.
 *
 * SPDX-License-Identifier: Apache-2.0
 ********************************************************************************/

import httpClient from '@/services/HttpClient';
import { getIchubBackendUrl } from '@/services/EnvironmentService';
import { NotificationApiResponse, notificationApiService } from '@/features/notifications/services/notificationApiService';
import { BOM_AS_BUILT_SEMANTIC_ID } from './utils/bomAsBuilt';

export interface BomAsBuiltSubmodelContent {
  [key: string]: unknown;
}

const backendUrl = getIchubBackendUrl();
const QI_FINISHED_REQUESTS_STORAGE_KEY = 'traceability.qi.finishedRequests';

export const QI_CONTEXT_REQUEST = 'IndustryCore-Traceability-QualityInvestigationRequest:1.0.0';
export const QI_CONTEXT_ACK = 'IndustryCore-Traceability-QualityInvestigationAcknowledge:1.0.0';
export const QI_CONTEXT_FAULT = 'IndustryCore-Traceability-QualityInvestigationFault:1.0.0';

export const TRACEABILITY_USE_CASE = 'Traceability';
const QI_ENDPOINT_PATH = '/feedback';

export type QualityInvestigationStatus = 'OK' | 'OPEN' | 'ACK' | 'ACCEPTED';

export interface QualityInvestigationNotification {
  messageId: string;
  senderBpn: string;
  receiverBpn: string;
  relatedMessageId?: string;
  context: string;
  direction: string;
  status: string;
  content: Record<string, unknown>;
}

export interface QualityInvestigationRequestPayload {
  localBpn: string;
  remoteBpn: string;
  localPartGlobalId: string;
  localPartInstanceId: string;
  remotePartGlobalId: string;
  information: string;
}

export interface QualityInvestigationAckPayload {
  localBpn: string;
  remoteBpn: string;
  relatedMessageId: string;
  localPartGlobalId: string;
  remotePartGlobalId: string;
}

export interface QualityInvestigationFaultPayload {
  localBpn: string;
  remoteBpn: string;
  relatedMessageId: string;
  localPartGlobalId: string;
  remotePartGlobalId: string;
  faultMessage: string;
}

interface CreateNotificationResponse {
  message_id: string;
}

const getMessageIdFromHeader = (notification: NotificationApiResponse): string => {
  return notification.fullNotification.header.messageId
    ?? notification.fullNotification.header.message_id
    ?? notification.messageId;
};

const getSenderBpnFromHeader = (notification: NotificationApiResponse): string => {
  return notification.fullNotification.header.senderBpn
    ?? notification.fullNotification.header.sender_bpn
    ?? notification.senderBpn;
};

const getReceiverBpnFromHeader = (notification: NotificationApiResponse): string => {
  return notification.fullNotification.header.receiverBpn
    ?? notification.fullNotification.header.receiver_bpn
    ?? notification.receiverBpn;
};

const getRelatedMessageIdFromHeader = (notification: NotificationApiResponse): string | undefined => {
  return notification.fullNotification.header.relatedMessageId
    ?? notification.fullNotification.header.related_message_id
    ?? undefined;
};

const isQiContext = (context: string): boolean => {
  return context.startsWith('IndustryCore-Traceability-QualityInvestigation');
};

const createAndSendNotification = async (
  context: string,
  senderBpn: string,
  receiverBpn: string,
  content: Record<string, unknown>,
  relatedMessageId?: string,
): Promise<string> => {
  const payload = {
    header: {
      context,
      senderBpn,
      receiverBpn,
      version: '1.0.0',
      ...(relatedMessageId ? { relatedMessageId } : {}),
    },
    content,
  };

  const createResponse = await httpClient.post<CreateNotificationResponse>(
    '/notifications-management/notification',
    payload,
  );

  const createdMessageId = createResponse.data.message_id;

  await notificationApiService.sendNotification({
    message_id: createdMessageId,
    provider_bpn: receiverBpn,
    endpoint_path: QI_ENDPOINT_PATH,
  });

  return createdMessageId;
};

export const fetchQualityInvestigationNotifications = async (
  localBpn: string,
): Promise<QualityInvestigationNotification[]> => {
  const notifications = await notificationApiService.fetchNotifications(localBpn, undefined, 0, 500);

  return notifications
    .filter((notification) => isQiContext(notification.fullNotification.header.context))
    .map((notification) => ({
      messageId: getMessageIdFromHeader(notification),
      senderBpn: getSenderBpnFromHeader(notification),
      receiverBpn: getReceiverBpnFromHeader(notification),
      relatedMessageId: getRelatedMessageIdFromHeader(notification),
      context: notification.fullNotification.header.context,
      direction: notification.direction,
      status: notification.status,
      content: notification.fullNotification.content,
    }));
};

export const sendQualityInvestigationRequest = async (
  payload: QualityInvestigationRequestPayload,
): Promise<string> => {
  return createAndSendNotification(
    QI_CONTEXT_REQUEST,
    payload.localBpn,
    payload.remoteBpn,
    {
      information: payload.information,
      useCase: TRACEABILITY_USE_CASE,
      qualityInvestigationType: 'REQUEST',
      localPartGlobalId: payload.localPartGlobalId,
      localPartInstanceId: payload.localPartInstanceId,
      remotePartGlobalId: payload.remotePartGlobalId,
    },
  );
};

export const sendQualityInvestigationAck = async (
  payload: QualityInvestigationAckPayload,
): Promise<string> => {
  return createAndSendNotification(
    QI_CONTEXT_ACK,
    payload.localBpn,
    payload.remoteBpn,
    {
      information: 'Quality Investigation request acknowledged.',
      useCase: TRACEABILITY_USE_CASE,
      qualityInvestigationType: 'ACK',
      localPartGlobalId: payload.localPartGlobalId,
      remotePartGlobalId: payload.remotePartGlobalId,
    },
    payload.relatedMessageId,
  );
};

export const sendQualityInvestigationFault = async (
  payload: QualityInvestigationFaultPayload,
): Promise<string> => {
  return createAndSendNotification(
    QI_CONTEXT_FAULT,
    payload.localBpn,
    payload.remoteBpn,
    {
      information: payload.faultMessage,
      useCase: TRACEABILITY_USE_CASE,
      qualityInvestigationType: 'FAULT',
      localPartGlobalId: payload.localPartGlobalId,
      remotePartGlobalId: payload.remotePartGlobalId,
    },
    payload.relatedMessageId,
  );
};

export const getFinishedQualityInvestigationRequestIds = (): string[] => {
  try {
    const raw = window.localStorage.getItem(QI_FINISHED_REQUESTS_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((entry): entry is string => typeof entry === 'string');
  } catch {
    return [];
  }
};

export const markQualityInvestigationRequestAsFinished = (requestMessageId: string): void => {
  const current = new Set(getFinishedQualityInvestigationRequestIds());
  current.add(requestMessageId);
  window.localStorage.setItem(QI_FINISHED_REQUESTS_STORAGE_KEY, JSON.stringify([...current]));
};

/**
 * Fetch only BoMAsBuilt submodel content for a known submodel ID.
 *
 * Required endpoint pattern for this feature:
 * /v1/v1/submodel-dispatcher/{semantic_id}/{submodel_id}/submodel
 * (first /v1 usually comes from backend base URL, second from dispatcher path).
 */
export const fetchBomAsBuiltSubmodelContent = async (submodelId: string): Promise<BomAsBuiltSubmodelContent> => {
  const encodedSemanticId = encodeURIComponent(BOM_AS_BUILT_SEMANTIC_ID);
  const encodedSubmodelId = encodeURIComponent(submodelId);

  const response = await httpClient.get<BomAsBuiltSubmodelContent>(
    `${backendUrl}/v1/submodel-dispatcher/${encodedSemanticId}/${encodedSubmodelId}/submodel`
  );

  if (!response.data) {
    throw new Error(`Failed to fetch BoMAsBuilt submodel content for submodel ${submodelId}.`);
  }

  return response.data;
};
