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

import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Paper,
  Typography,
} from '@mui/material';
import { ArrowBack, Done } from '@mui/icons-material';
import { getParticipantId } from '@/services/EnvironmentService';
import {
  fetchQualityInvestigationNotifications,
  markQualityInvestigationRequestAsFinished,
  QualityInvestigationNotification,
} from '../api';

const localBpn = getParticipantId();

const TraceabilityQualityInvestigationFaultDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const requestMessageId = searchParams.get('requestMessageId') ?? '';
  const faultMessageId = searchParams.get('faultMessageId') ?? '';
  const globalId = searchParams.get('globalId') ?? '';

  const [faultNotification, setFaultNotification] = useState<QualityInvestigationNotification | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadFaultMessage = async () => {
      try {
        const notifications = await fetchQualityInvestigationNotifications(localBpn);
        const matchedFault = notifications.find((notification) => {
          return notification.messageId === faultMessageId
            && notification.relatedMessageId === requestMessageId;
        });

        if (!matchedFault) {
          setError('The fault notification associated to this quality investigation was not found.');
          return;
        }

        setFaultNotification(matchedFault);
      } catch (loadError) {
        const message = loadError instanceof Error ? loadError.message : 'Failed to load fault notification.';
        setError(message);
      }
    };

    loadFaultMessage();
  }, [faultMessageId, requestMessageId]);

  const information = typeof faultNotification?.content.information === 'string'
    ? faultNotification.content.information
    : 'No fault information provided.';

  const handleFinish = () => {
    if (!requestMessageId) {
      return;
    }

    markQualityInvestigationRequestAsFinished(requestMessageId);
    navigate(`/traceability/quality-investigation/detail?globalId=${encodeURIComponent(globalId)}`);
  };

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
        <Button
          startIcon={<ArrowBack />}
          variant="outlined"
          onClick={() => navigate(`/traceability/quality-investigation/detail?globalId=${encodeURIComponent(globalId)}`)}
          sx={{
            borderColor: 'rgba(255, 122, 0, 0.5)',
            color: '#fff',
            '&:hover': {
              borderColor: 'rgba(255, 122, 0, 0.9)',
              backgroundColor: 'rgba(255, 122, 0, 0.12)',
            },
          }}
        >
          Back To Investigation Detail
        </Button>

        <Button
          startIcon={<Done />}
          variant="contained"
          onClick={handleFinish}
          sx={{
            background: 'linear-gradient(135deg, #31a354 0%, #2f8f49 100%)',
            color: '#fff',
            textTransform: 'none',
            '&:hover': {
              filter: 'brightness(1.05)',
            },
          }}
        >
          Finish Quality Investigation
        </Button>
      </Box>

      <Card
        sx={{
          background: 'linear-gradient(135deg, rgba(30, 30, 30, 0.95) 0%, rgba(20, 20, 20, 0.95) 100%)',
          border: '1px solid rgba(142, 209, 252, 0.45)',
          borderRadius: 3,
          boxShadow: '0 10px 35px rgba(0, 0, 0, 0.4)',
        }}
      >
        <CardContent>
          <Typography variant="h4" sx={{ color: '#fff', mb: 1 }}>
            Quality Investigation Result
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.75)', mb: 2 }}>
            Fault notification received from remote partner for the opened quality investigation.
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {!error && (
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                background: 'rgba(17, 17, 17, 0.92)',
                borderColor: 'rgba(255,255,255,0.2)',
              }}
            >
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)', mb: 1, fontFamily: 'monospace' }}>
                <strong>Request Message ID:</strong> {requestMessageId || 'n/a'}
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)', mb: 1, fontFamily: 'monospace' }}>
                <strong>Fault Message ID:</strong> {faultMessageId || 'n/a'}
              </Typography>
              <Typography variant="body1" sx={{ color: '#fff', mt: 2 }}>
                {information}
              </Typography>
            </Paper>
          )}
        </CardContent>
      </Card>
    </Container>
  );
};

export default TraceabilityQualityInvestigationFaultDetailPage;
