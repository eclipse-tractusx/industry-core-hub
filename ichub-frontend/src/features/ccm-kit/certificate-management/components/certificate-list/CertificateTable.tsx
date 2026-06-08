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

import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Table,
  TableBody,
  TableContainer,
  TableHead,
  Box,
  Typography,
  Tooltip,
  IconButton,
  Button,
  Chip,
} from '@mui/material';
import PublishIcon from '@mui/icons-material/Publish';
import RefreshIcon from '@mui/icons-material/Refresh';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import {
  CcmTablePaper,
  CcmHeaderRow,
  CcmHeaderCell,
  CcmBodyRow,
  CcmBodyCell,
  CcmTablePagination,
} from '@/features/ccm-kit/shared-components';
import { Certificate } from '../../types/types';
import { certificateManagementConfig } from '../../config';

interface CertificateTableProps {
  certificates: Certificate[];
  /** IDs of certificates already published as EDC assets. */
  publishedIds?: Set<string>;
  onView: (certificate: Certificate) => void;
  onPublish: (certificate: Certificate) => void;
  onUpdate: (certificate: Certificate) => void;
  onDelete: (certificate: Certificate) => void;
  onInfo: (certificate: Certificate) => void;
  onRefresh?: () => void;
}

export const CertificateTable = ({
  certificates,
  publishedIds,
  onView,
  onPublish,
  onUpdate,
  onDelete,
  onInfo,
}: CertificateTableProps) => {
  const { t } = useTranslation('certificateManagement');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const visibleRows = useMemo(
    () => certificates.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [certificates, page, rowsPerPage]
  );

  const getCertificateTypeLabel = (type: string) => {
    return certificateManagementConfig.certificateTypes.find(t => t.value === type)?.label || type;
  };

  /** Abbreviated type label for the Chip (e.g. "ISO 9001" → "9001") */
  const getCertificateTypeShort = (type: string) => {
    const map: Record<string, string> = {
      ISO9001: '9001',
      ISO14001: '14001',
      ISO45001: '45001',
      IATF16949: 'IATF',
      ISO27001: '27001',
      OTHER: 'Other',
    };
    return map[type] ?? type;
  };

  const formatDate = (dateString?: string | null): string => {
    if (!dateString) return '—';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '—';
    const now = new Date();
    const isToday =
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate();
    if (isToday) {
      return t('certTable.dateToday', { time: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) });
    }
    return d.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const getStatusColor = (status: string) => {
    const config = certificateManagementConfig.statusConfig[status as keyof typeof certificateManagementConfig.statusConfig];
    return config?.color || '#888';
  };

  if (certificates.length === 0) {
    return (
      <Box sx={{ py: 6, textAlign: 'center' }}>
        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.45)' }}>
          {t('certTable.empty')}
        </Typography>
      </Box>
    );
  }

  return (
    <CcmTablePaper sx={{ flex: 1, minHeight: 0 }}>
      <TableContainer sx={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
        <Table>
          <TableHead>
            <CcmHeaderRow>
              <CcmHeaderCell sx={{ width: 56, p: 0 }} />
              {([
                t('certTable.columns.certificate'),
                t('certTable.columns.type'),
                t('certTable.columns.issuer'),
                t('certTable.columns.validUntil'),
                t('certTable.columns.status'),
              ]).map((label) => (
                <CcmHeaderCell key={label}>{label}</CcmHeaderCell>
              ))}
              <CcmHeaderCell align="center" sx={{ width: 220 }}>{t('certTable.columns.actions')}</CcmHeaderCell>
            </CcmHeaderRow>
          </TableHead>
          <TableBody>
            {visibleRows.map((certificate) => {
              const statusColor = getStatusColor(certificate.status);
              return (
                <CcmBodyRow key={certificate.id} onClick={() => onView(certificate)}>
                  {/* Info button */}
                  <CcmBodyCell sx={{ width: 56, pl: 2, pr: 0.5 }} onClick={(e) => e.stopPropagation()}>
                    <Tooltip title={t('certTable.tooltips.certDetails')}>
                      <IconButton
                        size="small"
                        onClick={(e) => { e.stopPropagation(); onInfo(certificate); }}
                        sx={{ color: 'rgba(255,255,255,0.35)', '&:hover': { color: '#90caf9', backgroundColor: 'rgba(144,202,249,0.1)' } }}
                      >
                        <InfoOutlinedIcon sx={{ fontSize: 18 }} />
                      </IconButton>
                    </Tooltip>
                  </CcmBodyCell>

                  {/* Name + cert ID */}
                  <CcmBodyCell>
                    <Tooltip title={certificate.bpn} placement="top">
                      <Typography variant="body2" sx={{ fontWeight: 500, color: 'rgba(255,255,255,0.87)' }}>
                        {certificate.name}
                      </Typography>
                    </Tooltip>
                    {certificate.certificateIdentifier && (
                      <Typography variant="caption" sx={{ fontFamily: 'monospace', display: 'block', color: 'rgba(255,255,255,0.4)' }}>
                        {certificate.certificateIdentifier}
                      </Typography>
                    )}
                  </CcmBodyCell>

                  {/* Type chip */}
                  <CcmBodyCell>
                    <Tooltip title={getCertificateTypeLabel(certificate.type)}>
                      <Chip
                        label={getCertificateTypeShort(certificate.type)}
                        size="small"
                        sx={{
                          fontFamily: 'monospace',
                          fontWeight: 600,
                          fontSize: '0.7rem',
                          color: 'rgba(255,255,255,0.7)',
                          borderColor: 'rgba(255,255,255,0.18)',
                          backgroundColor: 'rgba(255,255,255,0.07)',
                          border: '1px solid rgba(255,255,255,0.18)',
                        }}
                      />
                    </Tooltip>
                  </CcmBodyCell>

                  {/* Issuer */}
                  <CcmBodyCell>
                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)' }}>{certificate.issuer}</Typography>
                  </CcmBodyCell>

                  {/* Valid Until — colored when near expiry, dash when empty */}
                  <CcmBodyCell>
                    <Typography
                      variant="body2"
                      sx={{
                        color: !certificate.validUntil
                          ? 'rgba(255,255,255,0.3)'
                          : certificate.status === 'expired'
                          ? '#f44336'
                          : certificate.status === 'expiring'
                          ? '#ed8936'
                          : 'rgba(255,255,255,0.87)',
                        fontWeight: certificate.status !== 'valid' ? 500 : undefined,
                      }}
                    >
                      {formatDate(certificate.validUntil)}
                    </Typography>
                  </CcmBodyCell>

                  {/* Status chip */}
                  <CcmBodyCell>
                    <Chip
                      label={certificate.status}
                      size="small"
                      sx={{
                        backgroundColor: `${statusColor}22`,
                        color: statusColor,
                        fontWeight: 600,
                        textTransform: 'capitalize',
                        border: `1px solid ${statusColor}44`,
                      }}
                    />
                  </CcmBodyCell>

                  {/* Action buttons */}
                  <CcmBodyCell align="center" onClick={(e) => e.stopPropagation()}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.75 }}>
                      <Tooltip
                        title={
                          certificate.status === 'expired'
                            ? t('certTable.tooltips.cannotPublishExpired')
                            : publishedIds?.has(certificate.id)
                              ? t('certTable.tooltips.alreadyPublished')
                              : ''
                        }
                        placement="top"
                      >
                        <span>
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<PublishIcon sx={{ fontSize: 13 }} />}
                            disabled={certificate.status === 'expired' || (publishedIds?.has(certificate.id) ?? false)}
                            onClick={(e) => { e.stopPropagation(); onPublish(certificate); }}
                            sx={{ textTransform: 'none', fontSize: '0.7rem', py: '2px', px: '8px', minWidth: 0, borderColor: 'rgba(100,181,246,0.4)', color: '#64b5f6', '&:hover': { borderColor: '#64b5f6', backgroundColor: 'rgba(100,181,246,0.1)', color: '#64b5f6' }, '&.Mui-disabled': { borderColor: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.3)' } }}
                          >
                            {t('certTable.buttons.publish')}
                          </Button>
                        </span>
                      </Tooltip>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<RefreshIcon sx={{ fontSize: 13 }} />}
                        onClick={(e) => { e.stopPropagation(); onUpdate(certificate); }}
                        sx={{ textTransform: 'none', fontSize: '0.7rem', py: '2px', px: '8px', minWidth: 0, borderColor: 'rgba(129,199,132,0.4)', color: '#81c784', '&:hover': { borderColor: '#81c784', backgroundColor: 'rgba(129,199,132,0.1)', color: '#81c784' } }}
                      >
                        {t('certTable.buttons.update')}
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<DeleteOutlineIcon sx={{ fontSize: 13 }} />}
                        onClick={(e) => { e.stopPropagation(); onDelete(certificate); }}
                        sx={{ textTransform: 'none', fontSize: '0.7rem', py: '2px', px: '8px', minWidth: 0, borderColor: 'rgba(239,154,154,0.4)', color: '#ef9a9a', '&:hover': { borderColor: '#ef9a9a', backgroundColor: 'rgba(239,154,154,0.1)', color: '#ef9a9a' } }}
                      >
                        {t('certTable.buttons.delete')}
                      </Button>
                    </Box>
                  </CcmBodyCell>
                </CcmBodyRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
      <CcmTablePagination
        rowsPerPageOptions={[5, 10, 25]}
        component="div"
        count={certificates.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />
    </CcmTablePaper>
  );
};
