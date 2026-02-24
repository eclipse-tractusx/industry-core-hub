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
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Button,
  Box,
  Typography
} from '@mui/material';
import { Certificate } from '../../types/types';
import { certificateManagementConfig } from '../../config';

interface CertificateTableProps {
  certificates: Certificate[];
  onView: (certificate: Certificate) => void;
  onShare: (certificate: Certificate) => void;
  onDelete: (certificate: Certificate) => void;
}

export const CertificateTable = ({
  certificates,
  onView,
  onShare,
  onDelete
}: CertificateTableProps) => {
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

  const getStatusClass = (status: string) => {
    return `certificate-table__status certificate-table__status--${status}`;
  };

  const getCertificateTypeLabel = (type: string) => {
    const typeConfig = certificateManagementConfig.certificateTypes.find(t => t.value === type);
    return typeConfig?.label || type;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (certificates.length === 0) {
    return (
      <Box className="certificate-table__empty">
        <Typography>
          No certificates found. Upload a certificate to get started.
        </Typography>
      </Box>
    );
  }

  return (
    <TableContainer className="certificate-table">
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Certificate Name</TableCell>
            <TableCell>Type</TableCell>
            <TableCell>BPN</TableCell>
            <TableCell>Issuer</TableCell>
            <TableCell>Valid Until</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Shared</TableCell>
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {visibleRows.map((certificate) => (
            <TableRow key={certificate.id}>
              <TableCell>{certificate.name}</TableCell>
              <TableCell>{getCertificateTypeLabel(certificate.type)}</TableCell>
              <TableCell>{certificate.bpn}</TableCell>
              <TableCell>{certificate.issuer}</TableCell>
              <TableCell>{formatDate(certificate.validUntil)}</TableCell>
              <TableCell>
                <span className={getStatusClass(certificate.status)}>
                  {certificate.status}
                </span>
              </TableCell>
              <TableCell>
                <span className="certificate-table__shared-count">
                  {certificate.sharedCount}
                </span>
              </TableCell>
              <TableCell>
                <Box className="certificate-table__actions">
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => onView(certificate)}
                  >
                    View
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => onShare(certificate)}
                    disabled={certificate.status === 'expired'}
                  >
                    Share
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    color="error"
                    onClick={() => onDelete(certificate)}
                  >
                    Delete
                  </Button>
                </Box>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <TablePagination
        className="certificate-table__pagination"
        rowsPerPageOptions={[5, 10, 25]}
        component="div"
        count={certificates.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />
    </TableContainer>
  );
};
