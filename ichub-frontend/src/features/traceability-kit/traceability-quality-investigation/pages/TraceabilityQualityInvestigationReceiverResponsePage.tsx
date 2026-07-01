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

import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Container,
  TextField,
  Typography,
} from '@mui/material';
import { ArrowBack, Send } from '@mui/icons-material';
import { getParticipantId } from '@/services/EnvironmentService';
import {
  fetchQualityInvestigationNotifications,
  QI_CONTEXT_FAULT,
  QI_CONTEXT_REQUEST,
  QualityInvestigationNotification,
  sendQualityInvestigationFault,
} from '../api';

const localBpn = getParticipantId();

const getContentString = (notification: QualityInvestigationNotification, key: string): string => {
  const value = notification.content[key];
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number') {
    return String(value);
  }
  return '';
};

const TraceabilityQualityInvestigationReceiverResponsePage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const globalId = searchParams.get('globalId') ?? '';

  const [notifications, setNotifications] = useState<QualityInvestigationNotification[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [faultMessage, setFaultMessage] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const loadNotifications = async () => {
      try {
        const list = await fetchQualityInvestigationNotifications(localBpn);
        setNotifications(list);
      } catch (loadError) {
        const message = loadError instanceof Error ? loadError.message : 'Failed to load quality investigation notifications.';
        setError(message);
      }
    };

    loadNotifications();
  }, []);

  const pendingRequest = useMemo(() => {
    if (!globalId) {
      return null;
    }

    const incomingRequests = notifications.filter((notification) => {
      return notification.context === QI_CONTEXT_REQUEST
        && notification.receiverBpn === localBpn
        && getContentString(notification, 'localPartGlobalId') === globalId;
    });

    const unresolvedRequest = incomingRequests.find((request) => {
      const hasFaultReply = notifications.some((notification) => {
        return notification.context === QI_CONTEXT_FAULT
          && notification.senderBpn === localBpn
          && notification.relatedMessageId === request.messageId;
      });

      return !hasFaultReply;
    });

    return unresolvedRequest ?? null;
  }, [globalId, notifications]);

  const handleSendFault = async () => {
    if (!pendingRequest) {
      return;
    }

    const trimmedFaultMessage = faultMessage.trim();
    if (!trimmedFaultMessage) {
      setError('Please provide the fault notification message.');
      return;
    }

    try {
      setSending(true);
      setError(null);
      await sendQualityInvestigationFault({
        localBpn,
        remoteBpn: pendingRequest.senderBpn,
        relatedMessageId: pendingRequest.messageId,
        localPartGlobalId: getContentString(pendingRequest, 'localPartGlobalId'),
        remotePartGlobalId: getContentString(pendingRequest, 'remotePartGlobalId'),
        faultMessage: trimmedFaultMessage,
      });

      setSuccess('Fault notification sent successfully. The request status is now OK.');
      setTimeout(() => {
        navigate('/traceability/quality-investigation');
      }, 700);
    } catch (sendError) {
      const message = sendError instanceof Error ? sendError.message : 'Failed to send fault notification.';
      setError(message);
    } finally {
      setSending(false);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Button
        startIcon={<ArrowBack />}
        variant="outlined"
        onClick={() => navigate('/traceability/quality-investigation')}
        sx={{
          mb: 2,
          borderColor: 'rgba(255, 122, 0, 0.5)',
          color: '#fff',
          '&:hover': {
            borderColor: 'rgba(255, 122, 0, 0.9)',
            backgroundColor: 'rgba(255, 122, 0, 0.12)',
          },
        }}
      >
        Back To Quality Investigation
      </Button>

      <Card
        sx={{
          background: 'linear-gradient(135deg, rgba(30, 30, 30, 0.95) 0%, rgba(20, 20, 20, 0.95) 100%)',
          border: '1px solid rgba(255, 140, 0, 0.45)',
          borderRadius: 3,
          boxShadow: '0 10px 35px rgba(0, 0, 0, 0.4)',
        }}
      >
        <CardContent>
          <Typography variant="h4" sx={{ color: '#fff', mb: 1 }}>
            Respond To Quality Investigation Request
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.75)', mb: 2 }}>
            Prepare and send the fault notification message to the partner that opened the quality investigation.
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {success}
            </Alert>
          )}

          {!pendingRequest && !error && (
            <Alert severity="info" sx={{ mb: 2 }}>
              No pending quality investigation request was found for this local part instance.
            </Alert>
          )}

          {pendingRequest && (
            <>
              <Box sx={{ display: 'grid', gap: 1, mb: 2 }}>
                <Typography variant="body2" sx={{ color: '#fff' }}>
                  <strong>Requester BPN:</strong> {pendingRequest.senderBpn}
                </Typography>
                <Typography variant="body2" sx={{ color: '#fff', fontFamily: 'monospace' }}>
                  <strong>Request Message ID:</strong> {pendingRequest.messageId}
                </Typography>
                <Typography variant="body2" sx={{ color: '#fff', fontFamily: 'monospace' }}>
                  <strong>Remote Part globalAssetId:</strong> {getContentString(pendingRequest, 'remotePartGlobalId') || 'n/a'}
                </Typography>
              </Box>

              <TextField
                label="Fault notification message"
                fullWidth
                multiline
                minRows={4}
                value={faultMessage}
                onChange={(event) => setFaultMessage(event.target.value)}
                sx={{
                  mb: 2,
                  '& .MuiInputBase-input': {
                    color: '#fff',
                  },
                  '& .MuiInputLabel-root': {
                    color: 'rgba(255,255,255,0.7)',
                  },
                }}
              />

              <Button
                variant="contained"
                startIcon={<Send />}
                onClick={handleSendFault}
                disabled={sending}
                sx={{
                  background: 'linear-gradient(135deg, #ff7a00 0%, #ff5a00 100%)',
                  color: '#fff',
                  textTransform: 'none',
                  '&:hover': {
                    filter: 'brightness(1.05)',
                  },
                }}
              >
                {sending ? 'Sending Fault Notification...' : 'Send Fault Notification'}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </Container>
  );
};

export default TraceabilityQualityInvestigationReceiverResponsePage;
