/********************************************************************************
 * Eclipse Tractus-X - Industry Core Hub Frontend
 *
 * Copyright (c) 2025 Contributors to the Eclipse Foundation
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

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  Chip,
  IconButton,
  MenuItem
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { ShareCertificateDialogProps } from '../../types/dialog-types';
import { certificateManagementConfig } from '../../config';
import { PartnerAutocomplete } from '@/features/business-partner-kit/partner-management/components';
import { fetchPartners } from '@/features/business-partner-kit/partner-management/api';
import { PartnerInstance } from '@/features/business-partner-kit/partner-management/types/types';

// Mock access policies - in real implementation these would come from EDC
const ACCESS_POLICIES = [
  { value: 'default', label: 'Default Policy' },
  { value: 'restricted', label: 'Restricted Access' },
  { value: 'membership', label: 'Membership Verification' },
  { value: 'framework', label: 'Framework Agreement' }
];

export const ShareCertificateDialog = ({
  open,
  onClose,
  certificate,
  onShare,
  defaultMethod = 'PULL'
}: ShareCertificateDialogProps) => {
  const [partnerBpn, setPartnerBpn] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [accessPolicy, setAccessPolicy] = useState('');
  const [message, setMessage] = useState('');
  const [method] = useState<'PULL' | 'PUSH'>(defaultMethod);
  const [error, setError] = useState('');

  // Partner autocomplete state
  const [partnersList, setPartnersList] = useState<PartnerInstance[]>([]);
  const [selectedPartner, setSelectedPartner] = useState<PartnerInstance | null>(null);
  const [isLoadingPartners, setIsLoadingPartners] = useState(false);
  const [partnersError, setPartnersError] = useState(false);

  /**
   * Load available partners from the API
   */
  const loadPartners = async () => {
    setIsLoadingPartners(true);
    setPartnersError(false);
    try {
      const data = await fetchPartners();
      setPartnersList(data);
    } catch (err) {
      console.error('Error fetching partners:', err);
      setPartnersList([]);
      setPartnersError(true);
    } finally {
      setIsLoadingPartners(false);
    }
  };

  // Reset form and load partners when dialog opens
  useEffect(() => {
    if (open) {
      setPartnerBpn('');
      setCompanyName('');
      setSelectedPartner(null);
      setAccessPolicy('');
      setMessage('');
      setError('');
      loadPartners();
    }
  }, [open, defaultMethod]);

  const handleShare = () => {
    if (!partnerBpn.trim()) {
      setError('Partner BPN is required');
      return;
    }
    if (!certificateManagementConfig.validation.bpn.pattern.test(partnerBpn)) {
      setError(certificateManagementConfig.validation.bpn.errorMessage);
      return;
    }
    if (certificate) {
      onShare(certificate.id, partnerBpn, method);
      handleClose();
    }
  };

  const handleClose = () => {
    setPartnerBpn('');
    setCompanyName('');
    setSelectedPartner(null);
    setAccessPolicy('');
    setMessage('');
    setError('');
    onClose();
  };

  /**
   * Get certificate type label
   */
  const getCertificateTypeLabel = (type: string) => {
    const typeConfig = certificateManagementConfig.certificateTypes.find(t => t.value === type);
    return typeConfig?.label || type;
  };

  // Get certificate type and status from extended certificate prop
  const certificateType = (certificate as { type?: string })?.type || 'ISO9001';
  const certificateStatus = (certificate as { status?: string })?.status || 'valid';

  return (
    <Dialog 
      open={open} 
      onClose={handleClose} 
      maxWidth="md" 
      fullWidth
      PaperProps={{
        sx: { borderRadius: 2, maxWidth: 600 }
      }}
    >
      <DialogTitle 
        sx={{ 
          backgroundColor: '#4caf50',
          color: 'white',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          py: 2,
          px: 3
        }}
      >
        <Typography variant="h6" fontWeight={600} sx={{ color: 'white' }}>
          Share Certificate
        </Typography>
        <IconButton 
          onClick={handleClose} 
          size="small"
          sx={{ color: 'white' }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: '24px !important', px: 3 }}>
        {/* Certificate Info Card */}
        {certificate && (
          <Box 
            sx={{ 
              backgroundColor: '#e8f5e9',
              borderRadius: 2,
              p: 2,
              mb: 3,
              display: 'flex',
              alignItems: 'center',
              gap: 2
            }}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Typography variant="body1" fontWeight={500}>
                {certificate.name}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Chip 
                  label={getCertificateTypeLabel(certificateType)}
                  size="small"
                  sx={{ 
                    backgroundColor: '#bbdefb',
                    color: '#1565c0',
                    fontWeight: 500,
                    fontSize: '0.75rem'
                  }}
                />
                <Chip 
                  label={certificateStatus.charAt(0).toUpperCase() + certificateStatus.slice(1)}
                  size="small"
                  sx={{ 
                    backgroundColor: certificateStatus === 'valid' ? '#c8e6c9' : '#fff9c4',
                    color: certificateStatus === 'valid' ? '#2e7d32' : '#f57f17',
                    fontWeight: 500,
                    fontSize: '0.75rem'
                  }}
                />
              </Box>
            </Box>
          </Box>
        )}

        {/* Partner BPN Field */}
        <Box sx={{ mb: 2.5 }}>
          <PartnerAutocomplete
            value={partnerBpn}
            availablePartners={partnersList}
            selectedPartner={selectedPartner}
            isLoadingPartners={isLoadingPartners}
            partnersError={partnersError}
            hasError={!!error}
            label="Partner BPN"
            placeholder="Search partner by BPN..."
            helperText="Select the partner to share the certificate with"
            errorMessage={error || 'Partner BPN is required'}
            onBpnlChange={(bpnl) => {
              setPartnerBpn(bpnl);
              if (error) {
                setError('');
              }
            }}
            onPartnerChange={(partner) => {
              setSelectedPartner(partner);
              if (partner) {
                setPartnerBpn(partner.bpnl);
                setCompanyName(partner.name);
              } else {
                setCompanyName('');
              }
            }}
            onRetryLoadPartners={loadPartners}
          />
        </Box>

        {/* Company Name (Auto-filled) */}
        <TextField
          fullWidth
          label="Company Name"
          value={companyName}
          placeholder="Auto-filled from selected partner"
          disabled
          sx={{ 
            mb: 2.5,
            '& .MuiInputBase-input.Mui-disabled': {
              WebkitTextFillColor: companyName ? 'inherit' : 'rgba(0, 0, 0, 0.38)'
            }
          }}
        />

        {/* Access Policy */}
        <TextField
          fullWidth
          select
          label="Access Policy"
          value={accessPolicy}
          onChange={(e) => setAccessPolicy(e.target.value)}
          placeholder="Select policy..."
          helperText="EDC contract policy for data sharing"
          sx={{ mb: 2.5 }}
        >
          <MenuItem value="">
            <em>Select policy...</em>
          </MenuItem>
          {ACCESS_POLICIES.map((policy) => (
            <MenuItem key={policy.value} value={policy.value}>
              {policy.label}
            </MenuItem>
          ))}
        </TextField>

        {/* Message (Optional) */}
        <TextField
          fullWidth
          label="Message (optional)"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          multiline
          rows={3}
          placeholder="Add a message for the partner..."
        />
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3, pt: 2, gap: 1 }}>
        <Button 
          onClick={handleClose}
          variant="outlined"
          sx={{ 
            textTransform: 'none',
            minWidth: 100,
            borderRadius: 1
          }}
        >
          Cancel
        </Button>
        <Button 
          onClick={handleShare} 
          variant="contained"
          sx={{ 
            textTransform: 'none',
            minWidth: 100,
            borderRadius: 1,
            backgroundColor: '#4caf50',
            '&:hover': {
              backgroundColor: '#388e3c'
            }
          }}
        >
          Share
        </Button>
      </DialogActions>
    </Dialog>
  );
};
