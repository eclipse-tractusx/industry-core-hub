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

import { useState } from 'react';
import { Menu, MenuItem, Button } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import IosShareIcon from '@mui/icons-material/IosShare';
import { PRODUCT_OPTIONS } from "../../types/shared";

interface ShareDropdownProps {
    handleCopy: () => void;
    handleDownload: () => void;
    handleShare: () => void;
  }

const ShareDropdown = ({ handleCopy, handleDownload, handleShare }: ShareDropdownProps) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  return (
    <>
      <Button
        onClick={handleClick}
        sx={{
          'padding': '10px 10px',
          'border': '1px solid #b4b4b4!important',
          'font-size': '14px',
        }}
      >
        Share
      </Button>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
      >
        <MenuItem onClick={() => { handleCopy(); handleClose(); }}>
          <Button className="dropdown-button share-dropdown-btn" color="secondary" size="small" startIcon={<ContentCopyIcon />}>
            <span>{PRODUCT_OPTIONS.COPY}</span>
          </Button>
        </MenuItem>
        <MenuItem onClick={() => { handleDownload(); handleClose(); }}>
          <Button className="dropdown-button share-dropdown-btn" color="secondary" size="small" startIcon={<FileDownloadIcon />}>
            <span>{PRODUCT_OPTIONS.DOWNLOAD}</span>
          </Button>
        </MenuItem>
        <MenuItem onClick={() => { handleShare(); handleClose(); }}>
          <Button className="dropdown-button share-dropdown-btn" color="secondary" size="small" startIcon={<IosShareIcon />}>
            <span>{PRODUCT_OPTIONS.SHARE}</span>
          </Button>
        </MenuItem>
      </Menu>
    </>
  );
};

export default ShareDropdown;
