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

import { DropdownMenu, Button, Icon } from '@catena-x/portal-shared-components';
import { PRODUCT_OPTIONS } from "../../types/shared";
import Grid2 from '@mui/material/Grid2';

interface ShareDropdownProps {
    handleCopy: () => void;
    handleDownload: () => void;
    handleShare: () => void;
  }

const ShareDropdown = ({ handleCopy, handleDownload, handleShare }: ShareDropdownProps) => {
  return (
    <DropdownMenu
        buttonSx={{
        'padding': '10px 10px',
        'border': '1px solid #b4b4b4!important',
        'font-size': '14px',
        }}
        buttonText="Share"
    >
        <Grid2 container direction="column">
        <Button className="dropdown-button share-dropdown-btn" color="secondary" size="small" onClick={handleCopy} startIcon={<Icon fontSize="16" iconName="ContentCopy" />}>
            <span>{PRODUCT_OPTIONS.COPY}</span>
        </Button>
        <Button className="dropdown-button share-dropdown-btn" color="secondary" size="small" onClick={handleDownload} startIcon={<Icon fontSize="16" iconName="FileDownload" />}>
            <span>{PRODUCT_OPTIONS.DOWNLOAD}</span>
        </Button>
        <Button className="dropdown-button share-dropdown-btn" color="secondary" size="small" onClick={handleShare} startIcon={<Icon fontSize="16" iconName="IosShare" />}>
            <span>{PRODUCT_OPTIONS.SHARE}</span>
        </Button>
        </Grid2>
    </DropdownMenu>
  );
};

export default ShareDropdown;
