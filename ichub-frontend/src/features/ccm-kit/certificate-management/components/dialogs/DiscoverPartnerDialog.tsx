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

import { useState, useCallback, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Chip,
  Autocomplete,
  TextField,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Tooltip,
  IconButton,
  Stepper,
  Step,
  StepLabel,
  CircularProgress,
  Alert,
  Snackbar,
  Paper,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import VisibilityIcon from '@mui/icons-material/Visibility';

import {
  Certificate,
  PartnerCertificate,
  PartnerCertificateSearchResult,
} from '../../types/types';
import { searchPartnerCertificates } from '../../api';
import { certificateManagementConfig } from '../../config';
import { useNegotiationFlow } from '../consumer/hooks/useNegotiationFlow';
import { fetchPartners } from '@/features/business-partner-kit/partner-management/api';
import { PartnerInstance } from '@/features/business-partner-kit/partner-management/types/types';

// ─── Discovery stepper labels ─────────────────────────────────────────────────
const DISCOVERY_STEPS = ['BPN Lookup', 'DTR Resolution', 'Asset Discovery'];

interface DiscoverPartnerDialogProps {
  open: boolean;
  onClose: () => void;
  certificates: Certificate[];
}

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

// ─── Dark style helpers ────────────────────────────────────────────────────────
const darkAutocomplete = {
  '& .MuiOutlinedInput-root': {
    backgroundColor: 'rgba(255,255,255,0.05)',
    color: 'rgba(255,255,255,0.87)',
    borderRadius: '10px',
    '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' },
    '&:hover fieldset': { borderColor: 'rgba(157,111,212,0.45)' },
    '&.Mui-focused fieldset': { borderColor: '#9D6FD4', borderWidth: '1.5px' },
  },
  '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.45)' },
  '& .MuiInputLabel-root.Mui-focused': { color: '#9D6FD4' },
  '& .MuiInputLabel-shrink': {
    backgroundColor: 'rgba(18,18,22,0.98)',
    padding: '0 4px',
    borderRadius: '2px',
  },
  '& .MuiAutocomplete-popupIndicator': { color: 'rgba(255,255,255,0.45)' },
  '& .MuiAutocomplete-clearIndicator': { color: 'rgba(255,255,255,0.45)' },
  '& input::placeholder': { color: 'rgba(255,255,255,0.3)', opacity: 1 },
};

const sectionCard = {
  backgroundColor: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '12px',
  p: 2.5,
  mb: 3,
};

const darkTableSx = {
  container: {
    borderRadius: '10px',
    border: '1px solid rgba(255,255,255,0.08)',
    background: 'linear-gradient(135deg, rgba(30,30,30,0.95) 0%, rgba(20,20,20,0.95) 100%)',
  },
  headRow: { backgroundColor: 'rgba(255,255,255,0.06)' },
  headCell: {
    color: 'rgba(255,255,255,0.6)',
    fontWeight: 600,
    fontSize: '0.7rem',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.07em',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
  },
  bodyRow: {
    '&:last-child td': { border: 0 },
    '&:hover': { backgroundColor: 'rgba(255,255,255,0.04)' },
  },
  bodyCell: { borderBottom: '1px solid rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.87)' },
  dimCell: { borderBottom: '1px solid rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.75)' },
  actionCell: { borderBottom: '1px solid rgba(255,255,255,0.06)' },
};

const amberButton = {
  background: 'linear-gradient(135deg, #6B3FA0 0%, #9D6FD4 100%)',
  color: '#fff',
  textTransform: 'none' as const,
  fontWeight: 600,
  borderRadius: '10px',
  boxShadow: '0 4px 12px rgba(157,111,212,0.3)',
  '&:hover': { filter: 'brightness(1.1)', boxShadow: '0 6px 18px rgba(157,111,212,0.4)' },
  '&:disabled': {
    background: 'rgba(255,255,255,0.1)',
    color: 'rgba(255,255,255,0.3)',
    boxShadow: 'none',
  },
};

export const DiscoverPartnerDialog = ({
  open,
  onClose,
  certificates: _certificates,
}: DiscoverPartnerDialogProps) => {
  // ── Partner autocomplete ──────────────────────────────────────────────────
  const [partners, setPartners] = useState<PartnerInstance[]>([]);
  const [loadingPartners, setLoadingPartners] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState<PartnerInstance | null>(null);

  // ── Discovery state ───────────────────────────────────────────────────────
  const [bpnInput, setBpnInput] = useState('');
  const [bpnError, setBpnError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [discoveryStep, setDiscoveryStep] = useState(-1);
  const [searchResult, setSearchResult] = useState<PartnerCertificateSearchResult | null>(null);
  const { states: negotiationStates, startNegotiation } = useNegotiationFlow();
  const [viewDialogCert, setViewDialogCert] = useState<PartnerCertificate | null>(null);

  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({ open: false, message: '', severity: 'success' });

  // Load partners when dialog opens
  useEffect(() => {
    if (open) {
      setLoadingPartners(true);
      fetchPartners()
        .then(setPartners)
        .catch(() => setPartners([]))
        .finally(() => setLoadingPartners(false));
    }
  }, [open]);

  // ── Discovery handlers ────────────────────────────────────────────────────
  const handleSearch = useCallback(async () => {
    const bpn = bpnInput.trim().toUpperCase();
    if (!certificateManagementConfig.validation.bpn.pattern.test(bpn)) {
      setBpnError(certificateManagementConfig.validation.bpn.errorMessage);
      return;
    }
    setBpnError(null);
    setIsSearching(true);
    setSearchResult(null);
    setDiscoveryStep(0);
    const stepDelay = 600;
    setTimeout(() => setDiscoveryStep(1), stepDelay);
    setTimeout(() => setDiscoveryStep(2), stepDelay * 2);
    try {
      const result = await searchPartnerCertificates(bpn);
      setSearchResult(result);
      setDiscoveryStep(3);
    } catch {
      setSnackbar({
        open: true,
        message: 'Discovery failed. Check the BPN and try again.',
        severity: 'error',
      });
      setDiscoveryStep(-1);
    } finally {
      setIsSearching(false);
    }
  }, [bpnInput]);

  const handleRequestAccess = async (partnerBpn: string, cert: PartnerCertificate) => {
    await startNegotiation(partnerBpn, cert.edcAssetId);
  };

  const renderNegotiationButton = (cert: PartnerCertificate, partnerBpn: string) => {
    const negState = negotiationStates[cert.edcAssetId];
    const status = negState?.status ?? 'idle';

    if (status === 'completed') {
      return (
        <Button
          size="small"
          variant="contained"
          color="success"
          startIcon={<VisibilityIcon />}
          onClick={() => setViewDialogCert(cert)}
        >
          View Certificate
        </Button>
      );
    }
    if (
      status === 'negotiating' ||
      status === 'transferring' ||
      status === 'discovering'
    ) {
      const label =
        status === 'negotiating'
          ? 'Negotiating…'
          : status === 'transferring'
            ? 'Transferring…'
            : 'Discovering…';
      return (
        <Button
          size="small"
          variant="outlined"
          disabled
          startIcon={<CircularProgress size={12} />}
        >
          {label}
        </Button>
      );
    }
    if (status === 'failed') {
      return (
        <Button
          size="small"
          variant="outlined"
          color="error"
          onClick={() => void handleRequestAccess(partnerBpn, cert)}
        >
          Retry
        </Button>
      );
    }
    return (
      <Button
        size="small"
        variant="outlined"
        startIcon={<LockOpenIcon />}
        onClick={() => void handleRequestAccess(partnerBpn, cert)}
      >
        Request Access
      </Button>
    );
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 6 } }}
      >
        <DialogTitle
          sx={{
            backgroundColor: 'primary.main',
            color: 'primary.contrastText',
            px: 3,
            py: 2,
            pr: 6,
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            position: 'relative',
          }}
        >
          <SearchIcon sx={{ fontSize: 22, color: 'inherit' }} />
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600, color: 'inherit', lineHeight: 1.2 }}>
              Discover Partners
            </Typography>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.75)' }}>
              Search partner certificates in the Catena-X dataspace
            </Typography>
          </Box>
          <IconButton
            size="medium"
            onClick={onClose}
            aria-label="close"
            sx={{
              position: 'absolute',
              right: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'primary.contrastText',
              '&:hover': { backgroundColor: 'rgba(255,255,255,0.15)' },
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ backgroundColor: 'background.paper', px: 3, pt: 6, pb: 3 }}>
          {/* BPN Search */}
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2, mt: 2 }}>
            Enter a partner BPN or select from your contact list to discover their compliance
            certificates in the Catena-X dataspace.
          </Typography>
          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start', mb: 3 }}>
              <Autocomplete
                freeSolo
                options={partners}
                loading={loadingPartners}
                value={selectedPartner}
                inputValue={bpnInput}
                getOptionLabel={(option) =>
                  typeof option === 'string' ? option : option.bpnl
                }
                onInputChange={(_, value) => {
                  setBpnInput(value);
                  setBpnError(null);
                }}
                onChange={(_, value) => {
                  if (value && typeof value !== 'string') {
                    setSelectedPartner(value);
                    setBpnInput(value.bpnl);
                  } else {
                    setSelectedPartner(null);
                  }
                }}
                PaperComponent={undefined}
                renderOption={(props, option) => (
                  <li {...props} key={option.bpnl}>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {option.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                        {option.bpnl}
                      </Typography>
                    </Box>
                  </li>
                )}
                sx={{ flex: 1, maxWidth: 540 }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    size="small"
                    label="Partner BPN"
                    placeholder="BPNL0000000000XX or select from contacts"
                    error={!!bpnError}
                    helperText={bpnError}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !isSearching) void handleSearch();
                    }}
                    InputProps={{
                      ...params.InputProps,
                      endAdornment: (
                        <>
                          {loadingPartners && <CircularProgress size={16} sx={{ mr: 1 }} />}
                          {params.InputProps.endAdornment}
                        </>
                      ),
                    }}
                  />
                )}
              />
              <Button
                variant="contained"
                startIcon={
                  isSearching ? <CircularProgress size={16} color="inherit" /> : <SearchIcon />
                }
                disabled={!bpnInput.trim() || isSearching}
                onClick={() => void handleSearch()}
                sx={{ textTransform: 'none', fontWeight: 600, height: 40, flexShrink: 0 }}
              >
                {isSearching ? 'Searching…' : 'Discover'}
              </Button>
          </Box>

          {/* Discovery Stepper */}
          {discoveryStep >= 0 && (
            <Box sx={{ mb: 3 }}>
              <Stepper activeStep={discoveryStep} alternativeLabel>
                {DISCOVERY_STEPS.map((label) => (
                  <Step key={label}>
                    <StepLabel>{label}</StepLabel>
                  </Step>
                ))}
              </Stepper>
            </Box>
          )}

          {/* Results */}
          {searchResult && !isSearching && (
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  {searchResult.partnerName ?? searchResult.partnerBpn}
                </Typography>
                {searchResult.dtrEndpoint && (
                  <Tooltip title={searchResult.dtrEndpoint}>
                    <Chip label="DTR resolved" size="small" color="success" variant="outlined" />
                  </Tooltip>
                )}
                <Chip
                  label={`${searchResult.certificates.length} certificate(s)`}
                  size="small"
                  variant="outlined"
                />
              </Box>

              {searchResult.certificates.length === 0 ? (
                <Box sx={{ py: 3, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    No certificates found for this partner.
                  </Typography>
                </Box>
              ) : (
                <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ backgroundColor: 'grey.50' }}>
                        {['Type', 'Issuer', 'Valid Until', 'Status', 'Action'].map((h) => (
                          <TableCell key={h} sx={{ fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'text.secondary' }}>
                            {h}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {searchResult.certificates.map((cert) => {
                        const statusColor =
                          cert.status === 'valid' ? 'success' : cert.status === 'expiring' ? 'warning' : 'error';
                        return (
                          <TableRow key={cert.id} hover>
                            <TableCell>
                              {certificateManagementConfig.certificateTypes.find(
                                (t) => t.value === cert.type
                              )?.label ?? cert.type}
                            </TableCell>
                            <TableCell>{cert.issuer}</TableCell>
                            <TableCell>{formatDate(cert.validUntil)}</TableCell>
                            <TableCell>
                              <Chip
                                label={cert.status}
                                size="small"
                                color={statusColor}
                                variant="outlined"
                                sx={{ fontWeight: 600, textTransform: 'capitalize' }}
                              />
                            </TableCell>
                            <TableCell>
                              {renderNegotiationButton(cert, searchResult.partnerBpn)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Box>
          )}

          {/* Retrieved certificate preview sub-dialog */}
          {viewDialogCert && (
            <Dialog
              open
              maxWidth="sm"
              fullWidth
              onClose={() => setViewDialogCert(null)}
              PaperProps={{ sx: { borderRadius: 3 } }}
            >
              <DialogTitle
                sx={{
                  backgroundColor: 'primary.main',
                  color: 'primary.contrastText',
                  px: 3,
                  py: 2,
                  pr: 6,
                }}
              >
                <Typography variant="h6" sx={{ fontWeight: 600, color: 'inherit' }}>
                  Retrieved Certificate
                </Typography>
                <IconButton
                  size="small"
                  onClick={() => setViewDialogCert(null)}
                  sx={{ position: 'absolute', right: 12, top: 12, color: 'primary.contrastText', '&:hover': { backgroundColor: 'rgba(255,255,255,0.15)' } }}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              </DialogTitle>
              <DialogContent sx={{ backgroundColor: 'background.paper', px: 3, py: 3 }}>
                <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {certificateManagementConfig.certificateTypes.find(
                    (t) => t.value === viewDialogCert.type
                  )?.label ?? viewDialogCert.type}
                </Typography>
                <Typography variant="h6" sx={{ mt: 0.5, mb: 1.5 }}>
                  Issued by {viewDialogCert.issuer}
                </Typography>
                <Chip
                  label={viewDialogCert.semanticId}
                  size="small"
                  variant="outlined"
                  sx={{ fontFamily: 'monospace', fontSize: '0.7rem', mb: 2 }}
                />
                {negotiationStates[viewDialogCert.edcAssetId]?.retrievedData && (
                  <Box
                    component="pre"
                    sx={{
                      fontSize: '0.75rem',
                      overflowX: 'auto',
                      p: 1.5,
                      borderRadius: 2,
                      backgroundColor: 'grey.100',
                      border: '1px solid',
                      borderColor: 'divider',
                    }}
                  >
                    {JSON.stringify(
                      negotiationStates[viewDialogCert.edcAssetId].retrievedData,
                      null,
                      2
                    )}
                  </Box>
                )}
              </DialogContent>
              <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid', borderColor: 'divider', backgroundColor: 'grey.50' }}>
                <Button onClick={() => setViewDialogCert(null)} variant="outlined" sx={{ textTransform: 'none' }}>
                  Close
                </Button>
              </DialogActions>
            </Dialog>
          )}
        </DialogContent>

        <DialogActions
          sx={{
            px: 3,
            py: 2,
            borderTop: '1px solid',
            borderColor: 'divider',
            backgroundColor: 'grey.50',
          }}
        >
          <Button onClick={onClose} variant="outlined" sx={{ textTransform: 'none' }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={5000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};
