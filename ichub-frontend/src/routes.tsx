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


import { BrowserRouter, Routes, Route } from "react-router-dom";
import MainLayout from "./layouts/MainLayout";
import ProductsList from './pages/ProductsList';
import PartnersList from './pages/PartnersList';
import ProductsDetails from './pages/ProductsDetails';
import PartsDiscovery from "./pages/PartsDiscovery";

export default function AppRoutes() {
  return (
    <BrowserRouter>
     <Routes>
        <Route path="/" element={<MainLayout />} >
          <Route index element={<ProductsList />} />
          <Route path="/product/:manufacturerId/:manufacturerPartId" element={<ProductsDetails />} />

          {/* Here we must change the elements as we go along as we develop */}
          <Route path="/catalog" element={<ProductsList />} />
          <Route path="/categories" element={<PartsDiscovery />} />
          <Route path="/shared" element={<PartnersList />} />
          <Route path="/status" element={<ProductsList />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );    
}
