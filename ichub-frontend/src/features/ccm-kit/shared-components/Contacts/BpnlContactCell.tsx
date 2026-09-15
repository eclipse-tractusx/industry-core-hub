/********************************************************************************
 * Eclipse Tractus-X - Industry Core Hub Frontend
 *
 * Copyright (c) 2026 LKS Next
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

import { Box, Tooltip, Typography } from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import { usePartners } from '@/contexts/PartnerContext';
import AddContactIconButton from '@/features/business-partner-kit/partner-management/components/general/AddContactIconButton';

interface BpnlContactCellProps {
  bpnl: string;
  /**
   * - 'name': show the contact name when known (Consumer / Provider columns),
   *   otherwise the BPNL plus an "add to contacts" action.
   * - 'bpn': always show the BPNL (Certified BPN columns); when known, append a
   *   contact icon that reveals the participant on hover, otherwise an
   *   "add to contacts" action.
   */
  mode: 'name' | 'bpn';
}

const monoSx = {
  fontFamily: 'monospace',
  color: 'rgba(255,255,255,0.7)',
} as const;

/** Small participant card shown inside the contact-icon tooltip. */
const ParticipantCard = ({ name, bpnl }: { name: string; bpnl: string }) => (
  <Box sx={{ py: 0.5, px: 0.25 }}>
    <Typography sx={{ fontSize: '0.8rem', fontWeight: 600, color: '#fff' }}>{name}</Typography>
    <Typography sx={{ fontSize: '0.7rem', fontFamily: 'monospace', color: 'rgba(255,255,255,0.7)' }}>
      {bpnl}
    </Typography>
  </Box>
);

/**
 * Renders a BPNL with the Contact List (partner) logic applied, reused across
 * the CCM tables. Resolves the BPNL to a registered contact name and offers an
 * "add to contacts" shortcut when unknown.
 */
const BpnlContactCell = ({ bpnl, mode }: BpnlContactCellProps) => {
  const { getContactName, isKnownContact, refreshPartners } = usePartners();

  if (!bpnl) {
    return (
      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
        —
      </Typography>
    );
  }

  const known = isKnownContact(bpnl);
  const name = getContactName(bpnl);

  if (mode === 'name') {
    if (known) {
      return (
        <Tooltip title={bpnl} arrow placement="top">
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.87)', cursor: 'default' }}>
            {name}
          </Typography>
        </Tooltip>
      );
    }
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <Typography variant="caption" sx={monoSx}>
          {bpnl}
        </Typography>
        <AddContactIconButton bpnl={bpnl} onContactAdded={refreshPartners} />
      </Box>
    );
  }

  // mode === 'bpn' — always show the BPNL.
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
      <Typography variant="caption" sx={monoSx}>
        {bpnl}
      </Typography>
      {known ? (
        <Tooltip title={<ParticipantCard name={name} bpnl={bpnl} />} arrow placement="top">
          <PersonIcon
            onClick={(e) => e.stopPropagation()}
            sx={{ fontSize: '0.95rem', color: '#81c784', cursor: 'default' }}
          />
        </Tooltip>
      ) : (
        <AddContactIconButton bpnl={bpnl} onContactAdded={refreshPartners} />
      )}
    </Box>
  );
};

export default BpnlContactCell;
