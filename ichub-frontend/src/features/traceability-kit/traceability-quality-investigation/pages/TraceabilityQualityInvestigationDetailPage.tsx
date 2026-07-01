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
  Chip,
  CircularProgress,
  Container,
  Grid2,
  Paper,
  Typography,
} from '@mui/material';
import { ArrowBack, PlayArrow } from '@mui/icons-material';
import { fetchSerializedPartTwinDetails } from '@/features/industry-core-kit/serialized-parts/api';
import { SerializedPartTwinDetailsRead } from '@/features/industry-core-kit/serialized-parts/types/twin-types';
import { getParticipantId } from '@/services/EnvironmentService';
import {
  fetchBomAsBuiltSubmodelContent,
  fetchQualityInvestigationNotifications,
  getFinishedQualityInvestigationRequestIds,
  QI_CONTEXT_ACK,
  QI_CONTEXT_FAULT,
  QI_CONTEXT_REQUEST,
  QualityInvestigationNotification,
  QualityInvestigationStatus,
  sendQualityInvestigationRequest,
} from '../api';
import {
  BOM_AS_BUILT_SEMANTIC_ID,
  BOM_AS_BUILT_SEMANTIC_ID_ALT,
  BomChildItem,
  TwinAspectRead,
  toChildItems,
} from '../utils/bomAsBuilt';

interface BomSubmodelView {
  id: string;
  semanticId: string;
  submodelId: string;
  content: Record<string, unknown>;
  childItems: BomChildItem[];
}

interface ChildInvestigationState {
  status: QualityInvestigationStatus;
  requestMessageId?: string;
  faultMessageId?: string;
}

const localBpn = getParticipantId();

const getChildString = (childItem: BomChildItem, key: string): string => {
  const value = childItem[key];
  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number') {
    return String(value);
  }

  return '';
};

const getNotificationContentString = (notification: QualityInvestigationNotification, key: string): string => {
  const value = notification.content[key];
  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number') {
    return String(value);
  }

  return '';
};

const getStatusChipConfig = (status: QualityInvestigationStatus): {
  label: string;
  backgroundColor: string;
  color: string;
} => {
  switch (status) {
    case 'OPEN':
      return { label: 'QI Sent', backgroundColor: '#f7d358', color: '#1a1a1a' };
    case 'ACK':
      return { label: 'QI Ack', backgroundColor: '#f7d358', color: '#1a1a1a' };
    case 'ACCEPTED':
      return { label: 'QI Accepted', backgroundColor: '#8ed1fc', color: '#082032' };
    case 'OK':
    default:
      return { label: 'OK', backgroundColor: '#6ccf7d', color: '#0f2716' };
  }
};

const TraceabilityQualityInvestigationDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const globalId = searchParams.get('globalId') || '';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [localTwin, setLocalTwin] = useState<SerializedPartTwinDetailsRead | null>(null);
  const [bomSubmodels, setBomSubmodels] = useState<BomSubmodelView[]>([]);
  const [notifications, setNotifications] = useState<QualityInvestigationNotification[]>([]);
  const [activeChildKey, setActiveChildKey] = useState<string | null>(null);

  const getBomAsBuiltAspects = (twinDetails: SerializedPartTwinDetailsRead): TwinAspectRead[] => {
    const fromAllAspects = twinDetails.allAspects ?? [];
    const fromAspectMap = Object.values(twinDetails.aspects ?? {});

    return [...fromAllAspects, ...fromAspectMap].filter((aspect, index, allAspects) => {
      const isBomAspect = aspect.semanticId === BOM_AS_BUILT_SEMANTIC_ID || aspect.semanticId === BOM_AS_BUILT_SEMANTIC_ID_ALT;
      if (!isBomAspect) {
        return false;
      }

      return allAspects.findIndex((candidate) => candidate.submodelId === aspect.submodelId) === index;
    });
  };

  useEffect(() => {
    const loadDetailData = async () => {
      setLoading(true);
      setError(null);
      setInfoMessage(null);

      try {
        if (!globalId) {
          throw new Error('Missing local part globalAssetId in URL.');
        }

        const matchedLocalTwin = await fetchSerializedPartTwinDetails(globalId);
        if (!matchedLocalTwin) {
          throw new Error('The selected local Part Instance was not found.');
        }
        setLocalTwin(matchedLocalTwin);

        const bomAsBuiltAspects = getBomAsBuiltAspects(matchedLocalTwin);
        if (bomAsBuiltAspects.length === 0) {
          setBomSubmodels([]);
          return;
        }

        const loadedSubmodels = await Promise.all(
          bomAsBuiltAspects.map(async (aspect, index) => {
            const content = await fetchBomAsBuiltSubmodelContent(aspect.submodelId);
            return {
              id: `${aspect.submodelId}-${index}`,
              semanticId: BOM_AS_BUILT_SEMANTIC_ID,
              submodelId: aspect.submodelId,
              content,
              childItems: toChildItems(content),
            } as BomSubmodelView;
          })
        );

        setBomSubmodels(loadedSubmodels);

        const loadedNotifications = await fetchQualityInvestigationNotifications(localBpn);
        setNotifications(loadedNotifications);
      } catch (loadError) {
        const message = loadError instanceof Error ? loadError.message : 'Failed to load quality investigation detail.';
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    loadDetailData();
  }, [globalId]);

  const totalChildItems = useMemo(() => {
    return bomSubmodels.reduce((acc, model) => acc + model.childItems.length, 0);
  }, [bomSubmodels]);

  const finishedRequestIds = useMemo(() => new Set(getFinishedQualityInvestigationRequestIds()), [notifications]);

  const resolveChildInvestigationState = (childItem: BomChildItem): ChildInvestigationState => {
    if (!localTwin) {
      return { status: 'OK' };
    }

    const remoteBpn = getChildString(childItem, 'businessPartner');
    const remotePartGlobalId = getChildString(childItem, 'globalAssetId');
    const localPartGlobalId = String(localTwin.globalId ?? '');

    if (!remoteBpn || !remotePartGlobalId || !localPartGlobalId) {
      return { status: 'OK' };
    }

    const request = notifications.find((notification) => {
      return notification.context === QI_CONTEXT_REQUEST
        && notification.senderBpn === localBpn
        && notification.receiverBpn === remoteBpn
        && getNotificationContentString(notification, 'localPartGlobalId') === localPartGlobalId
        && getNotificationContentString(notification, 'remotePartGlobalId') === remotePartGlobalId;
    });

    if (!request) {
      return { status: 'OK' };
    }

    if (finishedRequestIds.has(request.messageId)) {
      return { status: 'OK' };
    }

    const fault = notifications.find((notification) => {
      return notification.context === QI_CONTEXT_FAULT
        && notification.senderBpn === remoteBpn
        && notification.receiverBpn === localBpn
        && notification.relatedMessageId === request.messageId;
    });

    if (fault) {
      return {
        status: 'ACCEPTED',
        requestMessageId: request.messageId,
        faultMessageId: fault.messageId,
      };
    }

    const ack = notifications.find((notification) => {
      return notification.context === QI_CONTEXT_ACK
        && notification.senderBpn === remoteBpn
        && notification.receiverBpn === localBpn
        && notification.relatedMessageId === request.messageId;
    });

    if (ack) {
      return {
        status: 'ACK',
        requestMessageId: request.messageId,
      };
    }

    return {
      status: 'OPEN',
      requestMessageId: request.messageId,
    };
  };

  const refreshNotifications = async () => {
    const loadedNotifications = await fetchQualityInvestigationNotifications(localBpn);
    setNotifications(loadedNotifications);
  };

  const handleStartInvestigation = async (childItem: BomChildItem) => {
    if (!localTwin) {
      return;
    }

    const remoteBpn = getChildString(childItem, 'businessPartner');
    const remotePartGlobalId = getChildString(childItem, 'globalAssetId');
    const localPartGlobalId = String(localTwin.globalId ?? '');
    const localPartInstanceId = String(localTwin.partInstanceId ?? '');

    if (!remoteBpn || !remotePartGlobalId || !localPartGlobalId || !localPartInstanceId) {
      setInfoMessage('Missing local or remote BoMAsBuilt identifiers required to start a Quality Investigation.');
      return;
    }

    const childKey = `${remoteBpn}::${remotePartGlobalId}`;

    try {
      setActiveChildKey(childKey);
      const messageId = await sendQualityInvestigationRequest({
        localBpn,
        remoteBpn,
        localPartGlobalId,
        localPartInstanceId,
        remotePartGlobalId,
        information: 'Traceability quality investigation started by local partner.',
      });

      await refreshNotifications();
      setInfoMessage(`Quality Investigation notification sent (messageId: ${messageId}).`);
    } catch (sendError) {
      const message = sendError instanceof Error ? sendError.message : 'Failed to send Quality Investigation notification.';
      setError(message);
    } finally {
      setActiveChildKey(null);
    }
  };

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
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
          border: '1px solid rgba(255, 122, 0, 0.4)',
          borderRadius: 3,
          boxShadow: '0 10px 35px rgba(0, 0, 0, 0.4)',
          mb: 3,
        }}
      >
        <CardContent>
          <Typography variant="h4" sx={{ color: '#fff', mb: 1 }}>
            Part Instance Investigation Detail
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.72)' }}>
            Local Part Instance and linked Partner Offered Part Instances extracted from BoMAsBuilt childItems.
          </Typography>
        </CardContent>
      </Card>

      {loading && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2 }}>
          <CircularProgress size={20} />
          <Typography sx={{ color: 'rgba(255,255,255,0.8)' }}>Loading investigation detail...</Typography>
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {infoMessage && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {infoMessage}
        </Alert>
      )}

      {!loading && !error && localTwin && (
        <Grid2 container spacing={2}>
          <Grid2 size={12}>
            <Card
              sx={{
                background: 'linear-gradient(135deg, rgba(24, 24, 24, 0.95) 0%, rgba(14, 14, 14, 0.95) 100%)',
                border: '1px solid rgba(255,255,255,0.12)',
              }}
            >
              <CardContent>
                <Typography variant="h6" sx={{ color: '#fff', mb: 2 }}>Local Part Instance</Typography>
                <Grid2 container spacing={2}>
                  <Grid2 size={{ xs: 12, md: 6 }}>
                    <Typography variant="body2" sx={{ color: '#fff' }}>
                      <strong>Manufacturer ID:</strong> {localTwin.manufacturerId}
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#fff' }}>
                      <strong>Manufacturer Part ID:</strong> {localTwin.manufacturerPartId}
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#fff' }}>
                      <strong>Part Instance ID:</strong> {localTwin.partInstanceId}
                    </Typography>
                  </Grid2>
                  <Grid2 size={{ xs: 12, md: 6 }}>
                    <Typography variant="body2" sx={{ color: '#fff', fontFamily: 'monospace' }}>
                      <strong>Global Asset ID:</strong> {localTwin.globalId}
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#fff', fontFamily: 'monospace' }}>
                      <strong>DTR AAS ID:</strong> {localTwin.dtrAasId || 'n/a'}
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#fff' }}>
                      <strong>BoMAsBuilt Submodels:</strong> {bomSubmodels.length}
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#fff' }}>
                      <strong>Total ChildItems:</strong> {totalChildItems}
                    </Typography>
                  </Grid2>
                </Grid2>
              </CardContent>
            </Card>
          </Grid2>

          {bomSubmodels.length === 0 && (
            <Grid2 size={12}>
              <Alert severity="warning">
                No BoMAsBuilt submodel content was found for this local Part Instance.
              </Alert>
            </Grid2>
          )}

          {bomSubmodels.map((submodel) => (
            <Grid2 key={submodel.id} size={12}>
              <Card
                sx={{
                  background: 'linear-gradient(135deg, rgba(30, 30, 30, 0.95) 0%, rgba(15, 15, 15, 0.95) 100%)',
                  border: '1px solid rgba(255, 122, 0, 0.25)',
                }}
              >
                <CardContent>
                  <Typography variant="h6" sx={{ color: '#fff', mb: 1 }}>
                    BoMAsBuilt Submodel
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.78)', mb: 0.5, fontFamily: 'monospace' }}>
                    <strong>Submodel ID:</strong> {submodel.submodelId}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.78)', mb: 2, fontFamily: 'monospace' }}>
                    <strong>Semantic ID:</strong> {submodel.semanticId}
                  </Typography>

                  <Typography variant="subtitle2" sx={{ color: '#fff', mb: 1 }}>
                    BoMAsBuilt JSON
                  </Typography>
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 2,
                      mb: 2,
                      background: 'rgba(18, 18, 18, 0.92)',
                      borderColor: 'rgba(255,255,255,0.12)',
                      overflow: 'auto',
                      maxHeight: 320,
                    }}
                  >
                    <pre style={{ margin: 0, color: '#fff', whiteSpace: 'pre-wrap' }}>
                      {JSON.stringify(submodel.content, null, 2)}
                    </pre>
                  </Paper>

                  <Typography variant="subtitle2" sx={{ color: '#fff', mb: 1 }}>
                    Partner Offered Part Instances (ChildItems)
                  </Typography>

                  {submodel.childItems.length === 0 && (
                    <Alert severity="info">No childItems found in this BoMAsBuilt submodel.</Alert>
                  )}

                  {submodel.childItems.map((childItem, index) => (
                    (() => {
                      const state = resolveChildInvestigationState(childItem);
                      const remoteBpn = getChildString(childItem, 'businessPartner');
                      const remotePartGlobalId = getChildString(childItem, 'globalAssetId');
                      const childKey = `${remoteBpn}::${remotePartGlobalId}`;
                      const statusChip = getStatusChipConfig(state.status);

                      return (
                    <Paper
                      key={`${submodel.id}-child-${index}`}
                      variant="outlined"
                      sx={{
                        p: 2,
                        mb: 1.5,
                        background: 'rgba(255, 255, 255, 0.03)',
                        borderColor: 'rgba(255,255,255,0.12)',
                      }}
                    >
                      <Grid2 container spacing={1.5} alignItems="center">
                        <Grid2 size={{ xs: 12, md: 8 }}>
                          <Typography variant="body2" sx={{ color: '#fff', fontFamily: 'monospace' }}>
                            <strong>Child globalAssetId:</strong> {String(childItem.globalAssetId ?? 'n/a')}
                          </Typography>
                          <Typography variant="body2" sx={{ color: '#fff' }}>
                            <strong>Business Partner:</strong> {String(childItem.businessPartner ?? 'n/a')}
                          </Typography>
                          <Typography variant="body2" sx={{ color: '#fff' }}>
                            <strong>Quantity:</strong> {String(childItem.quantity?.value ?? 'n/a')} {String(childItem.quantity?.unit ?? '')}
                          </Typography>
                        </Grid2>
                        <Grid2 size={{ xs: 12, md: 4 }}>
                          <Box sx={{ display: 'flex', justifyContent: { xs: 'flex-start', md: 'flex-end' }, gap: 1, flexWrap: 'wrap' }}>
                            <Chip
                              label={statusChip.label}
                              onClick={() => {
                                if (state.status !== 'ACCEPTED' || !state.requestMessageId || !state.faultMessageId) {
                                  return;
                                }

                                navigate(
                                  `/traceability/quality-investigation/fault-detail?globalId=${encodeURIComponent(globalId)}&requestMessageId=${encodeURIComponent(state.requestMessageId)}&faultMessageId=${encodeURIComponent(state.faultMessageId)}`
                                );
                              }}
                              clickable={state.status === 'ACCEPTED'}
                              sx={{
                                fontWeight: 700,
                                backgroundColor: statusChip.backgroundColor,
                                color: statusChip.color,
                                cursor: state.status === 'ACCEPTED' ? 'pointer' : 'default',
                              }}
                            />
                            <Button
                              variant="contained"
                              startIcon={<PlayArrow />}
                              onClick={() => handleStartInvestigation(childItem)}
                              disabled={state.status !== 'OK' || activeChildKey === childKey}
                              sx={{
                                background: 'linear-gradient(135deg, #ff7a00 0%, #ff5a00 100%)',
                                color: '#fff',
                                textTransform: 'none',
                                '&.Mui-disabled': {
                                  background: 'rgba(255,255,255,0.2)',
                                  color: 'rgba(255,255,255,0.6)',
                                },
                                '&:hover': {
                                  filter: 'brightness(1.05)',
                                },
                              }}
                            >
                              {activeChildKey === childKey ? 'Sending...' : 'Start Quality Investigation'}
                            </Button>
                          </Box>
                        </Grid2>
                      </Grid2>
                    </Paper>
                      );
                    })()
                  ))}
                </CardContent>
              </Card>
            </Grid2>
          ))}
        </Grid2>
      )}
    </Container>
  );
};

export default TraceabilityQualityInvestigationDetailPage;
