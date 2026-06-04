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
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid2,
  InputAdornment,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import { Search as SearchIcon, Visibility as VisibilityIcon } from '@mui/icons-material';
import { discoverShells } from '@/features/industry-core-kit/part-discovery/api';
import { fetchAllSerializedPartTwins } from '@/features/industry-core-kit/serialized-parts/api';
import { SerializedPartTwinRead } from '@/features/industry-core-kit/serialized-parts/types/twin-types';
import { getParticipantId } from '@/services/EnvironmentService';
import { fetchSubmodelContent } from '@/features/industry-core-kit/catalog-management/api';
import { darkCardStyles } from '@/features/eco-pass-kit/passport-provision/styles/cardStyles';

const BOM_AS_BUILT_SEMANTIC_IDS = new Set([
  'urn:samm:io.catenax.single_level_bom_as_built:4.0.0#SingleLevelBomAsBuilt',
  'urn:samm:io.catenax.single_level_bom_as_built:4.0.0#SingleLevelBoMAsBuilt',
]);

interface InvestigationRow {
  id: string;
  name: string;
  manufacturerId: string;
  manufacturerPartId: string;
  partInstanceId: string;
  globalId: string;
  dtrAasId: string;
  bomSubmodelId: string;
  bomSemanticId: string;
}

interface SemanticKey {
  value?: string;
}

interface SubmodelDescriptorLike {
  id?: string;
  submodelId?: string;
  semanticId?: {
    keys?: SemanticKey[];
  };
}

interface ShellDescriptorLike {
  globalAssetId?: string;
  specificAssetIds?: Array<{ name?: string; value?: string }>;
  submodelDescriptors?: SubmodelDescriptorLike[];
}

const getSubmodelSemanticIds = (descriptor: SubmodelDescriptorLike): string[] => {
  const keys = descriptor.semanticId?.keys ?? [];
  return keys.map((key) => key.value).filter((value): value is string => Boolean(value));
};

const extractGlobalAssetId = (shell: ShellDescriptorLike): string | null => {
  if (shell.globalAssetId) {
    return shell.globalAssetId;
  }

  const fromSpecificAssets = shell.specificAssetIds?.find((asset) => asset.name === 'globalAssetId')?.value;
  return fromSpecificAssets || null;
};

const findBomDescriptor = (shell: ShellDescriptorLike): SubmodelDescriptorLike | null => {
  const descriptors = shell.submodelDescriptors ?? [];
  for (const descriptor of descriptors) {
    const semanticIds = getSubmodelSemanticIds(descriptor);
    if (semanticIds.some((semanticId) => BOM_AS_BUILT_SEMANTIC_IDS.has(semanticId))) {
      return descriptor;
    }
  }
  return null;
};

const TraceabilityQualityInvestigationPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<InvestigationRow[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRow, setSelectedRow] = useState<InvestigationRow | null>(null);
  const [selectedSubmodelContent, setSelectedSubmodelContent] = useState<Record<string, unknown> | null>(null);
  const [loadingSubmodel, setLoadingSubmodel] = useState(false);
  const [submodelError, setSubmodelError] = useState<string | null>(null);

  useEffect(() => {
    const loadInvestigationData = async () => {
      setLoading(true);
      setError(null);

      try {
        const participantId = getParticipantId();
        if (!participantId) {
          throw new Error('Participant ID is not configured.');
        }

        const [localTwins, discoveryResponse] = await Promise.all([
          fetchAllSerializedPartTwins(),
          discoverShells({
            counterPartyId: participantId,
            querySpec: [{ name: 'digitalTwinType', value: 'PartInstance' }],
            dtrGovernance: [],
            limit: 500,
          }),
        ]);

        if (discoveryResponse.error) {
          throw new Error(discoveryResponse.error);
        }

        const localTwinByGlobalId = new Map<string, SerializedPartTwinRead>(
          localTwins
            .filter((twin) => Boolean(twin.globalId))
            .map((twin) => [twin.globalId as string, twin])
        );

        const discoveredRows: InvestigationRow[] = [];
        const shellDescriptors = (discoveryResponse.shellDescriptors ?? []) as ShellDescriptorLike[];

        for (const shell of shellDescriptors) {
          const globalAssetId = extractGlobalAssetId(shell);
          if (!globalAssetId) {
            continue;
          }

          const localTwin = localTwinByGlobalId.get(globalAssetId);
          if (!localTwin) {
            continue;
          }

          const bomDescriptor = findBomDescriptor(shell);
          if (!bomDescriptor) {
            continue;
          }

          const bomSemanticId = getSubmodelSemanticIds(bomDescriptor)[0] || 'n/a';
          discoveredRows.push({
            id: `${localTwin.globalId}-${bomDescriptor.id || bomDescriptor.submodelId || 'n-a'}`,
            name: `${localTwin.manufacturerPartId} / ${localTwin.partInstanceId}`,
            manufacturerId: localTwin.manufacturerId,
            manufacturerPartId: localTwin.manufacturerPartId,
            partInstanceId: localTwin.partInstanceId,
            globalId: localTwin.globalId as string,
            dtrAasId: localTwin.dtrAasId as string,
            bomSubmodelId: bomDescriptor.id || bomDescriptor.submodelId || 'n/a',
            bomSemanticId,
          });
        }

        discoveredRows.sort((a, b) => {
          const byPart = a.manufacturerPartId.localeCompare(b.manufacturerPartId);
          if (byPart !== 0) {
            return byPart;
          }
          return a.partInstanceId.localeCompare(b.partInstanceId);
        });

        setRows(discoveredRows);
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
      row.bomSubmodelId.toLowerCase().includes(query)
    );
  }, [rows, searchQuery]);

  const handleViewSubmodel = async (row: InvestigationRow) => {
    setSelectedRow(row);
    setLoadingSubmodel(true);
    setSelectedSubmodelContent(null);
    setSubmodelError(null);

    try {
      const content = await fetchSubmodelContent(row.bomSemanticId, row.bomSubmodelId);
      setSelectedSubmodelContent(content);
    } catch (viewError) {
      const message = viewError instanceof Error ? viewError.message : 'Failed to load BoMAsBuilt submodel.';
      setSubmodelError(message);
    } finally {
      setLoadingSubmodel(false);
    }
  };

  const handleCloseDialog = () => {
    setSelectedRow(null);
    setSelectedSubmodelContent(null);
    setSubmodelError(null);
    setLoadingSubmodel(false);
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
          placeholder="Search by manufacturer part ID, part instance ID, global asset ID or submodel ID"
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
                        <strong>BoM Submodel ID:</strong> {row.bomSubmodelId}
                      </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
                      <Button
                        variant="outlined"
                        startIcon={<VisibilityIcon />}
                        onClick={() => handleViewSubmodel(row)}
                        sx={{
                          borderColor: 'rgba(255, 122, 0, 0.5)',
                          color: '#fff',
                          '&:hover': {
                            borderColor: 'rgba(255, 122, 0, 0.9)',
                            backgroundColor: 'rgba(255, 122, 0, 0.12)',
                          },
                        }}
                      >
                        View BoMAsBuilt
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </Grid2>
            ))}
          </Grid2>
        )}
      </Paper>

      <Dialog
        open={Boolean(selectedRow)}
        onClose={handleCloseDialog}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            background: 'linear-gradient(135deg, rgba(30, 30, 30, 0.98) 0%, rgba(15, 15, 15, 0.98) 100%)',
            color: '#fff',
          },
        }}
      >
        <DialogTitle>
          {selectedRow ? `BoMAsBuilt - ${selectedRow.manufacturerPartId} / ${selectedRow.partInstanceId}` : 'BoMAsBuilt'}
        </DialogTitle>
        <DialogContent dividers sx={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          {loadingSubmodel && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 2 }}>
              <CircularProgress size={20} />
              <Typography sx={{ color: 'rgba(255,255,255,0.8)' }}>Loading submodel content...</Typography>
            </Box>
          )}

          {submodelError && (
            <Alert severity="error" sx={{ mt: 1 }}>
              {submodelError}
            </Alert>
          )}

          {!loadingSubmodel && !submodelError && selectedSubmodelContent && (
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                background: 'rgba(18, 18, 18, 0.92)',
                borderColor: 'rgba(255,255,255,0.12)',
                overflow: 'auto',
              }}
            >
              <pre style={{ margin: 0, color: '#fff', whiteSpace: 'pre-wrap' }}>
                {JSON.stringify(selectedSubmodelContent, null, 2)}
              </pre>
            </Paper>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} sx={{ color: '#fff' }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default TraceabilityQualityInvestigationPage;
