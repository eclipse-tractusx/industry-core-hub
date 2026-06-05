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

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import VerifiedIcon from '@mui/icons-material/Verified';

import PartnerAutocomplete from '@/features/business-partner-kit/partner-management/components/general/PartnerAutocomplete';
import { fetchPartners } from '@/features/business-partner-kit/partner-management/api';
import { PartnerInstance } from '@/features/business-partner-kit/partner-management/types/types';
import { getParticipantId } from '@/services/EnvironmentService';

import { catalogSearch, createRequest } from '../../api';
import { CCM_POLICY_GOVERNANCE, ccmSharedConfig } from '../../config';

interface RequestCertificateDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (messageId?: string | null) => void;
}

type SupportState = 'unknown' | 'checking' | 'supported' | 'unsupported';

const BPN_PATTERN = ccmSharedConfig.validation.bpn.pattern;
const BPNS_PATTERN = ccmSharedConfig.validation.bpns.pattern;

const RequestCertificateDialog = ({ open, onClose, onSuccess }: RequestCertificateDialogProps) => {
  const [providerBpn, setProviderBpn] = useState('');
  const [selectedPartner, setSelectedPartner] = useState<PartnerInstance | null>(null);
  const [certifiedBpn, setCertifiedBpn] = useState('');
  const [certificateType, setCertificateType] = useState('');
  const [locationBpns, setLocationBpns] = useState<string[]>([]);
  const [locationInput, setLocationInput] = useState('');

  const [partners, setPartners] = useState<PartnerInstance[]>([]);
  const [isLoadingPartners, setIsLoadingPartners] = useState(false);
  const [partnersError, setPartnersError] = useState(false);

  const [support, setSupport] = useState<SupportState>('unknown');
  const [supportError, setSupportError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const loadPartners = useCallback(async () => {
    setIsLoadingPartners(true);
    setPartnersError(false);
    try {
      setPartners(await fetchPartners());
    } catch {
      setPartnersError(true);
    } finally {
      setIsLoadingPartners(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      void loadPartners();
    } else {
      // reset on close
      setProviderBpn('');
      setSelectedPartner(null);
      setCertifiedBpn('');
      setCertificateType('');
      setLocationBpns([]);
      setLocationInput('');
      setSupport('unknown');
      setSupportError(null);
      setSubmitError(null);
    }
  }, [open, loadPartners]);

  // Any change to the provider invalidates a previous support check.
  const handleProviderChange = (bpnl: string) => {
    setProviderBpn(bpnl);
    setSupport('unknown');
    setSupportError(null);
  };

  const providerValid = BPN_PATTERN.test(providerBpn);
  const certifiedValid = BPN_PATTERN.test(certifiedBpn);
  const locationInputValid = locationInput === '' || BPNS_PATTERN.test(locationInput);

  const verifySupport = useCallback(async () => {
    if (!providerValid) return;
    setSupport('checking');
    setSupportError(null);
    try {
      const result = await catalogSearch(providerBpn);
      if (result.found) {
        setSupport('supported');
      } else {
        setSupport('unsupported');
        setSupportError(result.error ?? 'This provider does not support CCM.');
      }
    } catch {
      setSupport('unsupported');
      setSupportError('Could not verify CCM support for this provider.');
    }
  }, [providerBpn, providerValid]);

  const addLocation = () => {
    const value = locationInput.trim();
    if (!value || !BPNS_PATTERN.test(value) || locationBpns.includes(value)) return;
    setLocationBpns((prev) => [...prev, value]);
    setLocationInput('');
  };

  const removeLocation = (bpn: string) =>
    setLocationBpns((prev) => prev.filter((b) => b !== bpn));

  const canSubmit = useMemo(
    () => providerValid && certifiedValid && !!certificateType && support === 'supported' && !submitting,
    [providerValid, certifiedValid, certificateType, support, submitting],
  );

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const result = await createRequest({
        senderBpn: getParticipantId(),
        providerBpn,
        certifiedBpn,
        certificateType,
        locationBpns: locationBpns.length ? locationBpns : undefined,
        governance: CCM_POLICY_GOVERNANCE,
      });
      if (!result.success) {
        setSubmitError(result.error ?? 'Failed to send the certificate request.');
        return;
      }
      onSuccess(result.messageId);
    } catch {
      setSubmitError('Failed to send the certificate request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>New Certificate Request</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2.5} sx={{ mt: 1 }}>
          {/* Provider selection + CCM support check */}
          <Box>
            <PartnerAutocomplete
              value={providerBpn}
              availablePartners={partners}
              selectedPartner={selectedPartner}
              isLoadingPartners={isLoadingPartners}
              partnersError={partnersError}
              onBpnlChange={handleProviderChange}
              onPartnerChange={setSelectedPartner}
              onRetryLoadPartners={loadPartners}
              label="Provider BPN"
              placeholder="Select or type the provider's BPNL"
            />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 1 }}>
              <Button
                size="small"
                variant="outlined"
                startIcon={support === 'checking' ? <CircularProgress size={16} /> : <VerifiedIcon />}
                disabled={!providerValid || support === 'checking'}
                onClick={verifySupport}
              >
                Verify CCM support
              </Button>
              {support === 'supported' && (
                <Chip
                  size="small"
                  color="success"
                  icon={<CheckCircleIcon />}
                  label="CCM supported"
                />
              )}
            </Box>
            {support === 'unsupported' && supportError && (
              <Alert severity="warning" sx={{ mt: 1 }}>
                {supportError}
              </Alert>
            )}
          </Box>

          <TextField
            label="Certified BPN"
            value={certifiedBpn}
            onChange={(e) => setCertifiedBpn(e.target.value.toUpperCase())}
            error={!!certifiedBpn && !certifiedValid}
            helperText={!!certifiedBpn && !certifiedValid ? ccmSharedConfig.validation.bpn.errorMessage : 'BPNL of the certified legal entity'}
            fullWidth
            required
          />

          <TextField
            label="Certificate Type"
            value={certificateType}
            onChange={(e) => setCertificateType(e.target.value)}
            select
            fullWidth
            required
          >
            {ccmSharedConfig.certificateTypes.map((type) => (
              <MenuItem key={type.value} value={type.value}>
                {type.label}
              </MenuItem>
            ))}
          </TextField>

          {/* Dynamic location BPNS list */}
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Locations (BPNS) — optional
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                label="Add location BPNS"
                value={locationInput}
                onChange={(e) => setLocationInput(e.target.value.toUpperCase())}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addLocation();
                  }
                }}
                error={!locationInputValid}
                helperText={!locationInputValid ? ccmSharedConfig.validation.bpns.errorMessage : ' '}
                size="small"
                fullWidth
              />
              <IconButton
                color="primary"
                onClick={addLocation}
                disabled={!locationInput.trim() || !BPNS_PATTERN.test(locationInput)}
                aria-label="add location"
                sx={{ height: 40 }}
              >
                <AddIcon />
              </IconButton>
            </Box>
            {locationBpns.length > 0 && (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                {locationBpns.map((bpn) => (
                  <Chip
                    key={bpn}
                    label={bpn}
                    onDelete={() => removeLocation(bpn)}
                    deleteIcon={<DeleteOutlineIcon />}
                    sx={{ fontFamily: 'monospace' }}
                  />
                ))}
              </Box>
            )}
          </Box>

          {submitError && <Alert severity="error">{submitError}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={!canSubmit}
          startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : undefined}
        >
          Send Request
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default RequestCertificateDialog;
