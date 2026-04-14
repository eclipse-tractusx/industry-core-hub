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

import React, { useState } from "react";
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, TablePagination} from "@mui/material";
import { useTranslation } from 'react-i18next';

import { SharedPartner } from '@/features/industry-core-kit/catalog-management/types/types';

interface SharedTableProps {
  sharedParts: SharedPartner[];
}

const SharedTable = ({ sharedParts }: SharedTableProps) => {
  const { t } = useTranslation('catalogManagement');
  const { t: tCommon } = useTranslation('common');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  return (
    <Paper className="shared-table">
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>{t('productDetail.sharedTable.columns.partnerName')}</TableCell>
              <TableCell>{t('productDetail.sharedTable.columns.bpnl')}</TableCell>
              <TableCell>{t('common:fields.customerPartId')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sharedParts
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((row) => (
                <TableRow key={row.name}>
                  <TableCell>{row.name}</TableCell>
                  <TableCell>{row.bpnl}</TableCell>
                  <TableCell>{row.customerPartId}</TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination className="table-pagination"
        component="div"
        count={sharedParts.length}
        page={page}
        onPageChange={handleChangePage}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        rowsPerPageOptions={[5, 10, 25]}
        labelRowsPerPage={tCommon('pagination.rowsPerPage')}
      />
    </Paper>
  );
};

export default SharedTable;
