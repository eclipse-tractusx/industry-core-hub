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

import { Box, Chip, Divider, Typography } from '@mui/material';
import { Certificate } from '../../types/types';
import { certificateManagementConfig } from '../../config';
import { InfoPanel } from '@/features/ccm-kit/shared-components';

interface CertificateInfoPanelProps {
  open: boolean;
  certificate: Certificate | null;
  onClose: () => void;
}

const formatDate = (d?: string) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

const formatDateTime = (d?: string) => {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

interface FieldRowProps {
  label: string;
  value?: string | null;
  mono?: boolean;
}

const FieldRow = ({ label, value, mono }: FieldRowProps) => (
  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2, py: 0.75 }}>
    <Typography
      variant="caption"
      sx={{ color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em', flexShrink: 0, pt: 0.25 }}
    >
      {label}
    </Typography>
    <Typography
      variant="body2"
      sx={{
        color: value ? 'rgba(255,255,255,0.82)' : 'rgba(255,255,255,0.25)',
        textAlign: 'right',
        fontFamily: mono ? 'monospace' : undefined,
        fontSize: mono ? '0.78rem' : undefined,
        fontStyle: !value ? 'italic' : undefined,
      }}
    >
      {value ?? '—'}
    </Typography>
  </Box>
);

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <Box sx={{ mt: 2, mb: 0.5 }}>
    <Typography
      variant="overline"
      sx={{ color: 'rgba(255,255,255,0.35)', letterSpacing: '0.1em', fontSize: '0.65rem' }}
    >
      {children}
    </Typography>
    <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)', mt: 0.5 }} />
  </Box>
);

const TRUST_LEVEL_COLORS: Record<string, string> = {
  none: '#9e9e9e',
  low: '#64b5f6',
  high: '#ffb74d',
  trusted: '#81c784',
};

export const CertificateInfoPanel = ({ open, certificate, onClose }: CertificateInfoPanelProps) => {
  if (!certificate) return null;

  const typeLabel =
    certificateManagementConfig.certificateTypes.find((t) => t.value === certificate.type)?.label
    ?? certificate.type;

  const statusConfig =
    certificateManagementConfig.statusConfig[
      certificate.status as keyof typeof certificateManagementConfig.statusConfig
    ];
  const statusColor = statusConfig?.color ?? '#888';
  const trustColor = TRUST_LEVEL_COLORS[certificate.trustLevel ?? 'none'] ?? '#9e9e9e';

  const headerChips = (
    <>
      <Chip
        label={typeLabel}
        size="small"
        sx={{ backgroundColor: 'rgba(255,255,255,0.2)', color: '#fff', fontWeight: 600, fontSize: '0.68rem' }}
      />
      <Chip
        label={certificate.status}
        size="small"
        sx={{
          backgroundColor: `${statusColor}33`,
          color: '#fff',
          border: `1px solid ${statusColor}66`,
          fontWeight: 600,
          textTransform: 'capitalize',
          fontSize: '0.68rem',
        }}
      />
    </>
  );

  return (
    <InfoPanel
      open={open}
      onClose={onClose}
      title={certificate.name || '(No name)'}
      headerChips={headerChips}
    >
      <Box sx={{ px: 2.5, pb: 3 }}>
        <SectionLabel>Core Information</SectionLabel>
        <FieldRow label="Issuer" value={certificate.issuer} />
        <FieldRow label="BPN Holder" value={certificate.bpn} mono />
        {certificate.uploaderBpnl && (
          <FieldRow label="Uploader BPN" value={certificate.uploaderBpnl} mono />
        )}

        <SectionLabel>Validity</SectionLabel>
        <FieldRow label="Valid From" value={formatDate(certificate.validFrom)} />
        <FieldRow label="Valid Until" value={formatDate(certificate.validUntil)} />
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.75 }}>
          <Typography
            variant="caption"
            sx={{ color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}
          >
            Trust Level
          </Typography>
          {certificate.trustLevel ? (
            <Chip
              label={certificate.trustLevel}
              size="small"
              sx={{
                backgroundColor: `${trustColor}22`,
                color: trustColor,
                border: `1px solid ${trustColor}55`,
                fontWeight: 600,
                textTransform: 'capitalize',
                fontSize: '0.7rem',
              }}
            />
          ) : (
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.25)', fontStyle: 'italic' }}>—</Typography>
          )}
        </Box>

        <SectionLabel>Scope & Application</SectionLabel>
        <FieldRow label="Reg. Number" value={certificate.certificateIdentifier} mono />
        <FieldRow label="Area of Application" value={certificate.areaOfApplication} />
        <FieldRow label="Validator" value={certificate.validator} />

        {(certificate.enclosedSitesBpn?.length ?? 0) > 0 && (
          <>
            <SectionLabel>Associated Sites</SectionLabel>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
              {certificate.enclosedSitesBpn!.map((bpn) => (
                <Chip
                  key={bpn}
                  label={bpn}
                  size="small"
                  sx={{
                    fontFamily: 'monospace',
                    fontSize: '0.72rem',
                    backgroundColor: 'rgba(255,255,255,0.07)',
                    color: 'rgba(255,255,255,0.7)',
                    border: '1px solid rgba(255,255,255,0.15)',
                  }}
                />
              ))}
            </Box>
          </>
        )}

        {certificate.description && (
          <>
            <SectionLabel>Description</SectionLabel>
            <Typography
              variant="body2"
              sx={{ color: 'rgba(255,255,255,0.7)', lineHeight: 1.6, mt: 0.5, whiteSpace: 'pre-wrap' }}
            >
              {certificate.description}
            </Typography>
          </>
        )}

        <SectionLabel>Metadata</SectionLabel>
        <FieldRow label="Certificate ID" value={certificate.id} mono />
        <FieldRow label="Created" value={formatDateTime(certificate.createdAt)} />
        <FieldRow label="Updated" value={formatDateTime(certificate.updatedAt)} />
      </Box>
    </InfoPanel>
  );
};
