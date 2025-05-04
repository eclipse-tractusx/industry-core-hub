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
import React from 'react';
import { Drawer, List, Divider, IconButton, ListItem, ListItemIcon, ListItemText } from '@mui/material';
import { ChevronLeft as ChevronLeftIcon, Inbox as InboxIcon, Mail as MailIcon } from '@mui/icons-material';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const drawerWidth = 220;

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  return (
    <Drawer
      sx={{
        width: drawerWidth,
        height: '100%',
        flexShrink: 0,
        '& .MuiDrawer-paper': { width: drawerWidth, background:'#334655' },
      }}
      variant="persistent"
      anchor="left"
      open={isOpen}
    >
      <div style={{ display: 'flex', alignItems: 'center', padding: '0 8px', justifyContent: 'flex-end' }}>
        <IconButton onClick={onClose}>
          <ChevronLeftIcon />
        </IconButton>
      </div>
      <Divider />
      <List>
        {['SubMenu 1', 'SubMenu 2', 'SubMenu 3', 'SubMenu 4'].map((text, index) => (
          <ListItem button key={text} className='list-item'>
            <ListItemIcon>
              {index % 2 === 0 ? <InboxIcon /> : <MailIcon />}
            </ListItemIcon>
            <ListItemText primary={text} />
          </ListItem>
        ))}
      </List>
    </Drawer>
  );
}

export default Sidebar;
