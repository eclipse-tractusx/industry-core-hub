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

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { fetchPartners } from '@/features/business-partner-kit/partner-management/api';
import type { PartnerInstance } from '@/features/business-partner-kit/partner-management/types/types';

interface PartnerContextType {
  /** All known partners (BPNL → name). */
  partners: PartnerInstance[];
  /** Returns the contact name for a BPNL, or the BPNL itself if unknown. */
  getContactName: (bpnl: string) => string;
  /** Whether the BPNL is a registered contact. */
  isKnownContact: (bpnl: string) => boolean;
  /** Re-fetch the partner list from the backend. */
  refreshPartners: () => Promise<void>;
}

const PartnerContext = createContext<PartnerContextType | undefined>(undefined);

/**
 * Lightweight, app-wide partner (Contact List) provider.
 * Exposes contact-name lookup so any feature can resolve BPNLs to names and
 * register new contacts. Kept separate from NotificationContext to avoid
 * coupling unrelated features.
 */
export const PartnerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [partners, setPartners] = useState<PartnerInstance[]>([]);

  const refreshPartners = useCallback(async () => {
    try {
      const data = await fetchPartners();
      setPartners(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch partners:', error);
    }
  }, []);

  useEffect(() => {
    void refreshPartners();
  }, [refreshPartners]);

  const getContactName = useCallback(
    (bpnl: string): string => partners.find((p) => p.bpnl === bpnl)?.name || bpnl,
    [partners],
  );

  const isKnownContact = useCallback(
    (bpnl: string): boolean => partners.some((p) => p.bpnl === bpnl),
    [partners],
  );

  return (
    <PartnerContext.Provider value={{ partners, getContactName, isKnownContact, refreshPartners }}>
      {children}
    </PartnerContext.Provider>
  );
};

export const usePartners = (): PartnerContextType => {
  const context = useContext(PartnerContext);
  if (!context) {
    throw new Error('usePartners must be used within a PartnerProvider');
  }
  return context;
};
