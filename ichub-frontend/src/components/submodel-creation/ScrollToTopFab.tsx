/********************************************************************************
 * Eclipse Tractus-X - Industry Core Hub Frontend
 *
 * Copyright (c) 2025 LKS Next
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

import React from 'react';
import { scrollToElement } from '../../utils/fieldNavigation';
import { Fab, Zoom } from '@mui/material';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';

interface ScrollToTopFabProps {
  containerRef: React.RefObject<HTMLDivElement>;
}

const ScrollToTopFab: React.FC<ScrollToTopFabProps> = ({ containerRef }) => {
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const handleScroll = () => {
      setVisible(container.scrollTop > 200);
    };
    container.addEventListener('scroll', handleScroll);
    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [containerRef]);

  const handleClick = () => {
    const container = containerRef.current;
    if (container) {
      scrollToElement({ container, focus: false, highlightClass: '', durationMs: 0, block: 'start' });
    }
  };

  // The parent container must have position: relative for absolute to work
  return (
    <Zoom in={visible}>
      <Fab
        size="medium"
        onClick={handleClick}
        sx={{
          position: 'fixed',
          right: 32,
          bottom: 32,
          zIndex: 2000,
          backgroundColor: '#111',
          color: '#fff',
          boxShadow: '0 2px 12px 2px rgba(255,255,255,0.18)',
          '&:hover': {
            backgroundColor: '#222',
            boxShadow: '0 4px 16px 4px rgba(255,255,255,0.22)'
          }
        }}
        aria-label="Scroll to top"
      >
        <KeyboardArrowUpIcon />
      </Fab>
    </Zoom>
  );
};

export default ScrollToTopFab;
