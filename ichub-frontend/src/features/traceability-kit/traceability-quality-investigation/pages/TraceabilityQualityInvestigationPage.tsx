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
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Container,
  Grid2,
  InputAdornment,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import { Launch as LaunchIcon, Search as SearchIcon } from '@mui/icons-material';
import { fetchAllSerializedPartTwins, fetchSerializedPartTwinDetails } from '@/features/industry-core-kit/serialized-parts/api';
import { SerializedPartTwinDetailsRead } from '@/features/industry-core-kit/serialized-parts/types/twin-types';
import { darkCardStyles } from '@/features/eco-pass-kit/passport-provision/styles/cardStyles';
import { getParticipantId } from '@/services/EnvironmentService';
import {
  fetchQualityInvestigationNotifications,
  QI_CONTEXT_ACK,
  QI_CONTEXT_FAULT,
  QI_CONTEXT_REQUEST,
  QualityInvestigationNotification,
  sendQualityInvestigationAck,
} from '../api';
import { BOM_AS_BUILT_SEMANTIC_ID, BOM_AS_BUILT_SEMANTIC_ID_ALT, TwinAspectRead } from '../utils/bomAsBuilt';

interface InvestigationRow {
  id: string;
  name: string;
  manufacturerId: string;
  manufacturerPartId: string;
  partInstanceId: string;
  globalId: string;
  dtrAasId: string;
  bomSubmodelCount: number;
}

const localBpn = getParticipantId();

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

const TraceabilityQualityInvestigationPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<InvestigationRow[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [notifications, setNotifications] = useState<QualityInvestigationNotification[]>([]);

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
    const loadInvestigationData = async () => {
      setLoading(true);
      setError(null);

      try {
        const localTwins = await fetchAllSerializedPartTwins();
        const detailedTwins = await Promise.all(
          localTwins
            .filter((twin) => Boolean(twin.globalId))
            .map(async (twin) => {
              const twinDetails = await fetchSerializedPartTwinDetails(String(twin.globalId));
              return twinDetails;
            })
        );

        const uniqueRows = detailedTwins
          .filter((twinDetails): twinDetails is SerializedPartTwinDetailsRead => Boolean(twinDetails))
          .map((twinDetails) => {
            const bomAsBuiltAspects = getBomAsBuiltAspects(twinDetails);
            if (bomAsBuiltAspects.length === 0) {
              return null;
            }

            return {
              id: String(twinDetails.globalId),
              name: `${twinDetails.manufacturerPartId} / ${twinDetails.partInstanceId}`,
              manufacturerId: twinDetails.manufacturerId,
              manufacturerPartId: twinDetails.manufacturerPartId,
              partInstanceId: twinDetails.partInstanceId,
              globalId: String(twinDetails.globalId),
              dtrAasId: String(twinDetails.dtrAasId),
              bomSubmodelCount: bomAsBuiltAspects.length,
            } as InvestigationRow;
          })
          .filter((row): row is InvestigationRow => Boolean(row));

        uniqueRows.sort((a, b) => {
          const byPart = a.manufacturerPartId.localeCompare(b.manufacturerPartId);
          if (byPart !== 0) {
            return byPart;
          }
          return a.partInstanceId.localeCompare(b.partInstanceId);
        });

        setRows(uniqueRows);

        const fetchedNotifications = await fetchQualityInvestigationNotifications(localBpn);
        const incomingRequests = fetchedNotifications.filter((notification) => {
          return notification.context === QI_CONTEXT_REQUEST
            && notification.receiverBpn === localBpn;
        });

        const requestsMissingAck = incomingRequests.filter((requestNotification) => {
          return !fetchedNotifications.some((notification) => {
            return notification.context === QI_CONTEXT_ACK
              && notification.senderBpn === localBpn
              && notification.receiverBpn === requestNotification.senderBpn
              && notification.relatedMessageId === requestNotification.messageId;
          });
        });

        if (requestsMissingAck.length > 0) {
          await Promise.all(
            requestsMissingAck.map(async (requestNotification) => {
              await sendQualityInvestigationAck({
                localBpn,
                remoteBpn: requestNotification.senderBpn,
                relatedMessageId: requestNotification.messageId,
                localPartGlobalId: getNotificationContentString(requestNotification, 'localPartGlobalId'),
                remotePartGlobalId: getNotificationContentString(requestNotification, 'remotePartGlobalId'),
              });
            })
          );
        }

        const refreshedNotifications = await fetchQualityInvestigationNotifications(localBpn);
        setNotifications(refreshedNotifications);
      } catch (loadError) {
        const message = loadError instanceof Error ? loadError.message : 'Failed to load investigation data.';
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    loadInvestigationData();
  }, []);

  const title = useMemo(() => 'Traceability Quality Investigation', []);

  const filteredRows = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return rows;
    }

    return rows.filter((row) =>
      row.manufacturerId.toLowerCase().includes(query) ||
      row.manufacturerPartId.toLowerCase().includes(query) ||
      row.partInstanceId.toLowerCase().includes(query) ||
      row.globalId.toLowerCase().includes(query) ||
      String(row.bomSubmodelCount).includes(query)
    );
  }, [rows, searchQuery]);

  const handleOpenDetail = (row: InvestigationRow) => {
    navigate(`/traceability/quality-investigation/detail?globalId=${encodeURIComponent(row.globalId)}`);
  };

  const getReceiverStatus = (row: InvestigationRow): { requested: boolean; requestMessageId?: string } => {
    const incomingRequests = notifications.filter((notification) => {
      return notification.context === QI_CONTEXT_REQUEST
        && notification.receiverBpn === localBpn
        && getNotificationContentString(notification, 'localPartGlobalId') === row.globalId;
    });

    const unresolvedRequest = incomingRequests.find((requestNotification) => {
      const hasFaultResponse = notifications.some((notification) => {
        return notification.context === QI_CONTEXT_FAULT
          && notification.senderBpn === localBpn
          && notification.relatedMessageId === requestNotification.messageId;
      });

      return !hasFaultResponse;
    });

    if (!unresolvedRequest) {
      return { requested: false };
    }

    return { requested: true, requestMessageId: unresolvedRequest.messageId };
  };

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Card
        sx={{
          background: 'linear-gradient(135deg, rgba(30, 30, 30, 0.95) 0%, rgba(20, 20, 20, 0.95) 100%)',
          border: '1px solid rgba(255, 122, 0, 0.4)',
          borderRadius: 3,
          boxShadow: '0 10px 35px rgba(0, 0, 0, 0.4)',
        }}
      >
        <CardContent>
          <Typography variant="h4" sx={{ color: '#fff', mb: 1 }}>
            {title}
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.72)' }}>
            Local Part Instances with BoMAsBuilt submodels attached.
          </Typography>
        </CardContent>
      </Card>

      <Paper
        sx={{
          mt: 3,
          background: 'linear-gradient(135deg, rgba(30, 30, 30, 0.95) 0%, rgba(15, 15, 15, 0.95) 100%)',
          borderRadius: 3,
          border: '1px solid rgba(255,255,255,0.08)',
          p: 2,
        }}
      >
        <TextField
          fullWidth
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search by manufacturer part ID, part instance ID, global asset ID or BoM submodel count"
          sx={{
            ...darkCardStyles.textField,
            mb: 3,
            '& .MuiInputBase-input': {
              color: '#fff',
            },
            '& .MuiInputBase-input::placeholder': {
              color: 'rgba(255,255,255,0.5)',
              opacity: 1,
            },
          }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: 'rgba(255,255,255,0.7)' }} />
                </InputAdornment>
              ),
            },
          }}
        />

        {loading && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2 }}>
            <CircularProgress size={20} />
            <Typography sx={{ color: 'rgba(255,255,255,0.8)' }}>Loading local BoMAsBuilt part instances...</Typography>
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mt: 1 }}>
            {error}
          </Alert>
        )}

        {!loading && !error && filteredRows.length === 0 && (
          <Alert severity="info" sx={{ mt: 1 }}>
            No local part instances with an attached BoMAsBuilt submodel match the current filter.
          </Alert>
        )}

        {!loading && !error && filteredRows.length > 0 && (
          <Grid2 container spacing={2}>
            {filteredRows.map((row) => (
              <Grid2 key={row.id} size={{ xs: 12, md: 6, xl: 4 }}>
                <Card
                  sx={{
                    ...darkCardStyles.card,
                    height: '100%',
                    border: '1px solid rgba(255, 122, 0, 0.22)',
                  }}
                >
                  <CardContent sx={{ ...darkCardStyles.cardContent }}>
                    <Typography variant="h6" sx={{ color: '#fff', mb: 1 }}>
                      {row.name}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', mb: 2 }}>
                      Local relation created through Traceability Preparation.
                    </Typography>

                    <Box sx={{ display: 'grid', gap: 1.25 }}>
                      <Typography variant="body2" sx={{ color: '#fff' }}>
                        <strong>Manufacturer ID:</strong> {row.manufacturerId}
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#fff' }}>
                        <strong>Manufacturer Part ID:</strong> {row.manufacturerPartId}
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#fff' }}>
                        <strong>Part Instance ID:</strong> {row.partInstanceId}
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#fff', fontFamily: 'monospace' }}>
                        <strong>Global Asset ID:</strong> {row.globalId}
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#fff', fontFamily: 'monospace' }}>
                        <strong>BoMAsBuilt Submodels:</strong> {row.bomSubmodelCount}
                      </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 3, flexWrap: 'wrap' }}>
                      <Button
                        variant="contained"
                        onClick={() => navigate(`/traceability/quality-investigation/respond?globalId=${encodeURIComponent(row.globalId)}`)}
                        disabled={!getReceiverStatus(row).requested}
                        sx={{
                          background: getReceiverStatus(row).requested
                            ? 'linear-gradient(135deg, #ff9f1c 0%, #ff7a00 100%)'
                            : 'linear-gradient(135deg, #41c77b 0%, #2f8f49 100%)',
                          color: '#fff',
                          textTransform: 'none',
                          '&.Mui-disabled': {
                            color: '#fff',
                            opacity: 0.85,
                          },
                        }}
                      >
                        {getReceiverStatus(row).requested ? 'QI Requested' : 'OK'}
                      </Button>

                      <Button
                        variant="outlined"
                        startIcon={<LaunchIcon />}
                        onClick={() => handleOpenDetail(row)}
                        sx={{
                          borderColor: 'rgba(255, 122, 0, 0.5)',
                          color: '#fff',
                          '&:hover': {
                            borderColor: 'rgba(255, 122, 0, 0.9)',
                            backgroundColor: 'rgba(255, 122, 0, 0.12)',
                          },
                        }}
                      >
                        Open Investigation Detail
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </Grid2>
            ))}
          </Grid2>
        )}
      </Paper>
    </Container>
  );
};

export default TraceabilityQualityInvestigationPage;
