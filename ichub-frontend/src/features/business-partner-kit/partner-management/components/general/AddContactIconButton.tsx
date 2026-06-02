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

import React, { useState } from 'react';
import { Tooltip, IconButton } from '@mui/material';
import { PersonAdd } from '@mui/icons-material';
import CreatePartnerDialog from './CreatePartnerDialog';

interface AddContactIconButtonProps {
  /** The BPNL to pre-fill in the create contact dialog */
  bpnl: string;
  /** Called after the contact is successfully created */
  onContactAdded?: () => void;
  /** Override the tooltip text (defaults to "Add to contacts") */
  tooltipTitle?: string;
  /** Icon size (defaults to "small") */
  size?: 'small' | 'medium';
}

/**
 * Reusable icon button that opens CreatePartnerDialog pre-filled with a given BPNL.
 * Always operates in CREATE mode — never passes partnerData to the dialog.
 * Can be placed anywhere a BPN is displayed and a contact is not yet registered.
 */
const AddContactIconButton: React.FC<AddContactIconButtonProps> = ({
  bpnl,
  onContactAdded,
  tooltipTitle = 'Add to contacts',
  size = 'small'
}) => {
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    setDialogOpen(true);
  };

  const handleSave = () => {
    setDialogOpen(false);
    onContactAdded?.();
  };

  return (
    <>
      <Tooltip title={tooltipTitle} arrow>
        <IconButton
          size={size}
          onClick={handleClick}
          sx={{
            padding: '2px',
            color: '#ffb74d',
            '&:hover': {
              color: '#ffa726',
              backgroundColor: 'rgba(255, 167, 38, 0.15)'
            }
          }}
        >
          <PersonAdd sx={{ fontSize: size === 'small' ? '0.95rem' : '1.2rem' }} />
        </IconButton>
      </Tooltip>

      <CreatePartnerDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSave={handleSave}
        initialBpnl={bpnl}
      />
    </>
  );
};

export default AddContactIconButton;
