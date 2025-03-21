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

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import carPartsData from "../tests/payloads/sample-data.json";
import { ProductCard } from "../components/general/ProductCard";
import { PartInstance } from "../types/product";
import { Grid2 } from "@mui/material";
import { StatusVariants } from "../components/general/CardChip";

const ProductsList = () => {
  const [carParts, setCarParts] = useState<PartInstance[]>([]);

  const navigate = useNavigate();

  useEffect(() => {
    const mappedCarParts = carPartsData.map((part) => ({
      ...part,
      status: part.status as StatusVariants,
    }));
    setCarParts(mappedCarParts);
  }, []);

  const handleButtonClick = (itemId: string) => {
    navigate(`/product/${itemId}`); // Navigate to the details page
  };

  const handleShare = (itemId: string) => {
    console.log('Sharing item with id:', itemId);
    // Share logic
  };

  const handleMore = (itemId: string) => {
    console.log('More options for item with id:', itemId);
    // More options logic
  };

  return (
    <Grid2 className="product-catalog" container spacing={1} direction="row">
      <Grid2 className="title flex flex-content-center">
        <span className="text">
          Catalog Parts
        </span>
      </Grid2>
      <Grid2 className="flex flex-content-center">
        <ProductCard
          onClick={(itemId: any) => handleButtonClick(itemId)}
          onShare={handleShare}
          onMore={handleMore}
          items={carParts.map((part) => ({
            uuid: part.uuid,
            name: part.name,
            class: part.class,
            status: part.status as StatusVariants,
          }))}
        />
      </Grid2>
    </Grid2>
  );
};

export default ProductsList;
