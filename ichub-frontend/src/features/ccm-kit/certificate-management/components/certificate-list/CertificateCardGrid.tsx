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

import {
  Box,
  Typography,
  Chip,
  Button,
  IconButton,
  Tooltip,
  Card,
  CardContent,
  alpha,
} from '@mui/material';
import PublishIcon from '@mui/icons-material/Publish';
import RefreshIcon from '@mui/icons-material/Refresh';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import BusinessIcon from '@mui/icons-material/Business';
import EventIcon from '@mui/icons-material/Event';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CancelIcon from '@mui/icons-material/Cancel';
import GroupIcon from '@mui/icons-material/Group';
import TagIcon from '@mui/icons-material/Tag';
import { Certificate } from '../../types/types';
import { certificateManagementConfig } from '../../config';

interface CertificateCardGridProps {
  certificates: Certificate[];
  onView: (certificate: Certificate) => void;
  onPublish: (certificate: Certificate) => void;
  onUpdate: (certificate: Certificate) => void;
  onDelete: (certificate: Certificate) => void;
  onInfo: (certificate: Certificate) => void;
}

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

const getStatusConfig = (status: string) => {
  const config =
    certificateManagementConfig.statusConfig[
      status as keyof typeof certificateManagementConfig.statusConfig
    ];
  return config ?? { color: '#888', label: status };
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'valid':    return CheckCircleIcon;
    case 'expiring': return WarningAmberIcon;
    case 'expired':  return CancelIcon;
    default:         return CheckCircleIcon;
  }
};

const getCertificateTypeLabel = (type: string) =>
  certificateManagementConfig.certificateTypes.find((t) => t.value === type)?.label ?? type;

// CCM KIT purple theme
const CCM_PRIMARY = '#6B3FA0';
const CCM_SECONDARY = '#9D6FD4';

export const CertificateCardGrid = ({
  certificates,
  onView,
  onPublish,
  onUpdate,
  onDelete,
  onInfo,
}: CertificateCardGridProps) => {

  if (certificates.length === 0) {
    return (
      <Box sx={{ py: 6, textAlign: 'center' }}>
        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.45)' }}>
          No certificates found. Upload a certificate to get started.
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: 2.5,
      }}
    >
      {certificates.map((cert) => {
        const statusConfig = getStatusConfig(cert.status);
        const StatusIcon = getStatusIcon(cert.status);
        const hasPdf = !!(cert.documentBase64 || cert.documentUrl);
        const typeLabel = getCertificateTypeLabel(cert.type);

        return (
          <Card
            key={cert.id}
            onClick={() => onView(cert)}
            sx={{
              backgroundColor: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '12px',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              minHeight: 270,
              transition: 'all 0.2s ease',
              '&:hover': {
                borderColor: alpha(statusConfig.color, 0.35),
                backgroundColor: 'rgba(255,255,255,0.07)',
                transform: 'translateY(-2px)',
                boxShadow: `0 8px 24px ${alpha(statusConfig.color, 0.18)}`,
              },
            }}
          >
            <CardContent
              sx={{ p: 2.5, '&:last-child': { pb: 2.5 }, display: 'flex', flexDirection: 'column', flex: 1 }}
            >
              {/* ── Header Row ── */}
              <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
                {/* Left: icon box + name + type */}
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, flex: 1, minWidth: 0 }}>
                  <Box
                    sx={{
                      p: 1,
                      borderRadius: '8px',
                      background: alpha(statusConfig.color, 0.15),
                      flexShrink: 0,
                    }}
                  >
                    <VerifiedUserIcon sx={{ fontSize: 20, color: statusConfig.color }} />
                  </Box>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography
                      variant="body1"
                      sx={{
                        fontWeight: 600,
                        color: '#fff',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        lineHeight: 1.35,
                        mb: 0.4,
                      }}
                    >
                      {cert.name}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{ color: 'rgba(255,255,255,0.45)', fontFamily: 'monospace', fontSize: '0.72rem' }}
                    >
                      {typeLabel}
                    </Typography>
                  </Box>
                </Box>

                {/* Right: status chip */}
                <Chip
                  icon={<StatusIcon sx={{ fontSize: 13 }} />}
                  label={statusConfig.label}
                  size="small"
                  sx={{
                    ml: 1,
                    flexShrink: 0,
                    backgroundColor: alpha(statusConfig.color, 0.15),
                    color: statusConfig.color,
                    border: `1px solid ${alpha(statusConfig.color, 0.35)}`,
                    fontWeight: 600,
                    fontSize: '0.72rem',
                    textTransform: 'capitalize',
                    '& .MuiChip-icon': { color: statusConfig.color },
                  }}
                />
              </Box>

              {/* ── Info Section ── */}
              <Box
                sx={{
                  p: 1.5,
                  mb: 2,
                  borderRadius: '8px',
                  background: alpha(statusConfig.color, 0.07),
                  border: `1px solid ${alpha(statusConfig.color, 0.18)}`,
                }}
              >
                {/* Issuer */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <BusinessIcon sx={{ fontSize: 15, color: 'rgba(255,255,255,0.45)', flexShrink: 0 }} />
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px', lineHeight: 1 }}>
                      Issued by
                    </Typography>
                    <Typography sx={{ fontSize: '0.78rem', color: '#fff', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {cert.issuer}
                    </Typography>
                  </Box>
                </Box>

                {/* Valid Until */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <EventIcon sx={{ fontSize: 15, color: 'rgba(255,255,255,0.45)', flexShrink: 0 }} />
                  <Box>
                    <Typography sx={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px', lineHeight: 1 }}>
                      Valid until
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        color: cert.status === 'expired'
                          ? '#f44336'
                          : cert.status === 'expiring'
                          ? '#ff9800'
                          : 'rgba(255,255,255,0.85)',
                      }}
                    >
                      {formatDate(cert.validUntil)}
                    </Typography>
                  </Box>
                </Box>
              </Box>

              {/* ── Metadata Row ── */}
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mb: 1 }}>
                {cert.certificateIdentifier && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <TagIcon sx={{ fontSize: 13, color: 'rgba(255,255,255,0.35)' }} />
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace', fontSize: '0.7rem' }}>
                      {cert.certificateIdentifier}
                    </Typography>
                  </Box>
                )}
                {cert.sharedCount > 0 && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <GroupIcon sx={{ fontSize: 13, color: 'rgba(255,255,255,0.35)' }} />
                    <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.72rem' }}>
                      Shared with {cert.sharedCount} partner{cert.sharedCount > 1 ? 's' : ''}
                    </Typography>
                  </Box>
                )}
                {hasPdf && (
                  <Tooltip title="PDF document attached">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <PictureAsPdfIcon sx={{ fontSize: 13, color: 'rgba(255,255,255,0.35)' }} />
                      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.72rem' }}>
                        PDF attached
                      </Typography>
                    </Box>
                  </Tooltip>
                )}
              </Box>

              {/* ── Action Footer ── */}
              <Box
                sx={{
                  display: 'flex',
                  gap: 1,
                  mt: 'auto',
                  pt: 2,
                  borderTop: '1px solid rgba(255,255,255,0.06)',
                  alignItems: 'center',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <Tooltip title="Certificate details">
                  <IconButton
                    size="small"
                    onClick={(e) => { e.stopPropagation(); onInfo(cert); }}
                    sx={{ color: 'rgba(255,255,255,0.35)', '&:hover': { color: '#90caf9', backgroundColor: 'rgba(144,202,249,0.1)' } }}
                  >
                    <InfoOutlinedIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                </Tooltip>
                <Button
                  size="small"
                  variant="contained"
                  startIcon={<PublishIcon sx={{ fontSize: 14 }} />}
                  disabled={cert.status === 'expired'}
                  onClick={(e) => { e.stopPropagation(); onPublish(cert); }}
                  sx={{
                    flex: 1,
                    py: 0.85,
                    borderRadius: '8px',
                    textTransform: 'none',
                    fontWeight: 600,
                    fontSize: '0.78rem',
                    background: `linear-gradient(135deg, ${CCM_PRIMARY} 0%, ${CCM_SECONDARY} 100%)`,
                    '&:hover': { background: `linear-gradient(135deg, ${CCM_SECONDARY} 0%, ${CCM_PRIMARY} 100%)` },
                    '&.Mui-disabled': { background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.3)' },
                  }}
                >
                  Publish
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<RefreshIcon sx={{ fontSize: 14 }} />}
                  onClick={(e) => { e.stopPropagation(); onUpdate(cert); }}
                  sx={{
                    flex: 1,
                    py: 0.85,
                    borderRadius: '8px',
                    textTransform: 'none',
                    fontWeight: 600,
                    fontSize: '0.78rem',
                    borderColor: 'rgba(129,199,132,0.4)',
                    color: '#81c784',
                    '&:hover': { borderColor: '#81c784', backgroundColor: alpha('#81c784', 0.08), color: '#81c784' },
                  }}
                >
                  Update
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<DeleteOutlineIcon sx={{ fontSize: 14 }} />}
                  onClick={(e) => { e.stopPropagation(); onDelete(cert); }}
                  sx={{
                    flex: 1,
                    py: 0.85,
                    borderRadius: '8px',
                    textTransform: 'none',
                    fontWeight: 600,
                    fontSize: '0.78rem',
                    borderColor: 'rgba(239,154,154,0.4)',
                    color: '#ef9a9a',
                    '&:hover': { borderColor: '#ef9a9a', backgroundColor: alpha('#ef9a9a', 0.08), color: '#ef9a9a' },
                  }}
                >
                  Delete
                </Button>
              </Box>
            </CardContent>
          </Card>
        );
      })}
    </Box>
  );
};
