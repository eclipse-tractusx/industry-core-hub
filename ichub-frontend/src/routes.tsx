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

import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import MainLayout from "./layouts/MainLayout";
import { CircularProgress, Box } from "@mui/material";

// Lazy load page components for automatic code splitting
const ProductsList = lazy(() => import('./pages/ProductsList'));
const PartnersList = lazy(() => import('./pages/PartnersList'));
const ProductsDetails = lazy(() => import('./pages/ProductsDetails'));
const PartsDiscovery = lazy(() => import("./pages/PartsDiscovery"));
const SerializedParts = lazy(() => import("./pages/SerializedParts"));

// Loading component
const PageLoader = () => (
  <Box 
    display="flex" 
    justifyContent="center" 
    alignItems="center" 
    minHeight="50vh"
  >
    <CircularProgress />
  </Box>
);

export default function AppRoutes() {
  return (
    <BrowserRouter>
     <Routes>
        <Route path="/" element={<MainLayout />} >
          <Route 
            index 
            element={
              <Suspense fallback={<PageLoader />}>
                <ProductsList />
              </Suspense>
            } 
          />
          <Route 
            path="/product/:manufacturerId/:manufacturerPartId" 
            element={
              <Suspense fallback={<PageLoader />}>
                <ProductsDetails />
              </Suspense>
            } 
          />

          <Route 
            path="/catalog" 
            element={
              <Suspense fallback={<PageLoader />}>
                <ProductsList />
              </Suspense>
            } 
          />
          <Route 
            path="/dataspace-discovery" 
            element={
              <Suspense fallback={<PageLoader />}>
                <PartsDiscovery />
              </Suspense>
            } 
          />
          <Route 
            path="/partners" 
            element={
              <Suspense fallback={<PageLoader />}>
                <PartnersList />
              </Suspense>
            } 
          />
          <Route 
            path="/serialized-parts" 
            element={
              <Suspense fallback={<PageLoader />}>
                <SerializedParts />
              </Suspense>
            } 
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );    
}
