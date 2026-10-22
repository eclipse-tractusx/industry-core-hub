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

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  CircularProgress,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import VerifiedIcon from '@mui/icons-material/Verified';
import AssignmentIcon from '@mui/icons-material/Assignment';
import { BpnsInput, CcmDialog } from '@/features/ccm-kit/shared-components';

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

const RequestCertificateDialog = ({ open, onClose, onSuccess }: RequestCertificateDialogProps) => {
  const { t } = useTranslation('certificateManagement');
  const [providerBpn, setProviderBpn] = useState('');
  const [selectedPartner, setSelectedPartner] = useState<PartnerInstance | null>(null);
  const [certifiedBpn, setCertifiedBpn] = useState('');
  const [certificateType, setCertificateType] = useState('');
  const [locationBpns, setLocationBpns] = useState<string[]>([]);

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
        setSupportError(result.error ?? t('requestDialog.errors.notSupported'));
      }
    } catch {
      setSupport('unsupported');
      setSupportError(t('requestDialog.errors.verifyFailed'));
    }
  }, [providerBpn, providerValid]);

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
      // HTTP 200 = request created successfully. Close the dialog regardless of
      // the body's success flag (the status will be reflected in the table).
      onSuccess(result.messageId);
    } catch {
      setSubmitError(t('requestDialog.errors.submitFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <CcmDialog
      open={open}
      onClose={onClose}
      title={t('requestDialog.title')}
      subtitle={t('requestDialog.subtitle')}
      icon={<AssignmentIcon />}
      fullWidth
      actions={
        <>
          <Button onClick={onClose} variant="outlined" disabled={submitting} sx={{ textTransform: 'none' }}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={!canSubmit}
            startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : undefined}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            {t('requestDialog.sendRequest')}
          </Button>
        </>
      }
    >
      <Box sx={{ p: 3 }}>
        <Stack spacing={2.5}>
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
              label={t('requestDialog.providerBpn')}
              placeholder={t('requestDialog.providerPlaceholder')}
            />
            <Box
              role="group"
              aria-labelledby="request-dialog-ccm-support-label"
              sx={{
                mt: 1,
                p: 1.5,
                border: 1,
                borderColor: 'divider',
                borderRadius: 1,
                backgroundColor: 'action.hover',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
                <Box sx={{ minWidth: 0 }}>
                  <Typography
                    id="request-dialog-ccm-support-label"
                    variant="body2"
                    sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontWeight: 600 }}
                  >
                    {t('requestDialog.ccmSupport')}
                    <Typography component="span" aria-hidden="true" sx={{ color: 'error.main', fontWeight: 700, lineHeight: 1 }}>
                      *
                    </Typography>
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {t('requestDialog.ccmSupportDescription')}
                  </Typography>
                </Box>
                <Button
                  size="small"
                  variant="contained"
                  disableElevation
                  startIcon={support === 'checking' ? <CircularProgress size={14} /> : <VerifiedIcon sx={{ fontSize: 18 }} />}
                  disabled={!providerValid || support === 'checking'}
                  onClick={verifySupport}
                  sx={{
                    flexShrink: 0,
                    minHeight: 32,
                    px: 1.25,
                    borderRadius: 1,
                    textTransform: 'none',
                    fontWeight: 600,
                    boxShadow: 'none',
                    '&:hover': { boxShadow: 'none' },
                    '&:active': { transform: 'translateY(1px)' },
                    '&:focus-visible': { outline: '2px solid', outlineOffset: 2 },
                  }}
                >
                  {t('requestDialog.verifyCcm')}
                </Button>
              </Box>
              {support === 'supported' && (
                <Chip
                  size="small"
                  color="success"
                  icon={<CheckCircleIcon />}
                  label={t('requestDialog.ccmSupported')}
                  sx={{ mt: 1 }}
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
            label={t('requestDialog.certifiedBpn')}
            value={certifiedBpn}
            onChange={(e) => setCertifiedBpn(e.target.value.toUpperCase())}
            error={!!certifiedBpn && !certifiedValid}
            helperText={!!certifiedBpn && !certifiedValid ? ccmSharedConfig.validation.bpn.errorMessage : t('requestDialog.certifiedBpnHelper')}
            fullWidth
            required
          />

          <Autocomplete
            freeSolo
            autoSelect
            fullWidth
            forcePopupIcon={ccmSharedConfig.certificateTypes.length > 0}
            disableClearable={!certificateType}
            options={ccmSharedConfig.certificateTypes}
            value={
              ccmSharedConfig.certificateTypes.find((t) => t.value === certificateType) ??
              (certificateType || null)
            }
            getOptionLabel={(option) =>
              typeof option === 'string'
                ? ccmSharedConfig.certificateTypes.find((t) => t.value === option)?.label ?? option
                : option.label
            }
            isOptionEqualToValue={(option, value) =>
              option.value === (typeof value === 'string' ? value : value.value)
            }
            onChange={(_, newValue) => {
              setCertificateType(
                newValue == null
                  ? ''
                  : typeof newValue === 'string'
                    ? newValue.trim()
                    : newValue.value,
              );
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label={t('requestDialog.certType')}
                helperText={t('requestDialog.certTypeHelper')}
                required
              />
            )}
          />

          <BpnsInput
            value={locationBpns}
            onChange={setLocationBpns}
          />

          {submitError && <Alert severity="error">{submitError}</Alert>}
        </Stack>
      </Box>
    </CcmDialog>
  );
};

export default RequestCertificateDialog;
