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

import { Outlet } from "react-router-dom";
import { Grid2 } from '@mui/material';

import Header from '../components/general/Header';
import Sidebar from '../components/general/Sidebar';

function MainLayout() {
  return (
    <Grid2 container className="contentWrapper">
      <Grid2 size={12} className="headerArea">
        <Header/>
      </Grid2>
      <Grid2 size={{xl: 2, lg: 4, md: 5, sm: 12, xs: 12}} className="sidebarArea">
          <Sidebar />
        </Grid2>
        <Grid2 size={{xl: 10, lg: 8, md: 7, sm: 12, xs: 12}} className="contentArea">
          <Outlet />
        </Grid2>
    </Grid2>
  );
};

export default MainLayout;