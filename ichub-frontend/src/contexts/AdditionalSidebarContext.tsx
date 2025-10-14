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

import React, { createContext, useState, ReactNode, useCallback } from 'react';

export interface AdditionalSidebarContextType {
  isVisible: boolean;
  content: ReactNode;
  showSidebar: (content: ReactNode) => void;
  hideSidebar: () => void;
  toggleSidebar: () => void;
}

export const AdditionalSidebarContext = createContext<AdditionalSidebarContextType | undefined>(undefined);

interface AdditionalSidebarProviderProps {
  children: ReactNode;
}

export const AdditionalSidebarProvider: React.FC<AdditionalSidebarProviderProps> = ({ children }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [content, setContent] = useState<ReactNode>(null);

  const showSidebar = useCallback((newContent: ReactNode) => {
    setContent(newContent);
    setIsVisible(true);
  }, []);

  const hideSidebar = useCallback(() => {
    setIsVisible(false);
    setContent(null);
  }, []);

  const toggleSidebar = useCallback(() => {
    setIsVisible(!isVisible);
  }, [isVisible]);

  return (
    <AdditionalSidebarContext.Provider
      value={{
        isVisible,
        content,
        showSidebar,
        hideSidebar,
        toggleSidebar,
      }}
    >
      {children}
    </AdditionalSidebarContext.Provider>
  );
};
