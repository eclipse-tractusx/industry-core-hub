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

import { Box, Grid2 } from '@mui/material'
import { Icon, Typography } from '@catena-x/portal-shared-components';
import { PartInstance } from '../../../../types/product.ts';

interface ProductDataProps {
    part: PartInstance;
  }
  
const ProductData = ({ part }: ProductDataProps) => {
  return (
    <Grid2 container justifyContent="space-between" className="mb-5">
        <Grid2 size={{lg: 4, md: 12}}>
            <Grid2 className="title-subtitle">
                <Typography variant="h2">{part.name}</Typography>
                <Typography variant="caption1">{part.class}</Typography>
            </Grid2>

            <Grid2 className="ml-3 mb-2 product-card">
                <Box>
                <Typography variant="label3">Manufacturer</Typography>
                <Typography variant="body1">{part.manufacturer}</Typography>
                </Box>
                <Box>
                <Typography variant="label3">Manufacturer Part Id</Typography>
                <Typography variant="body1">{part.manufacturerPartId}</Typography>
                </Box>
                <Box>
                <Typography variant="label4">Description</Typography>
                <Typography variant="body2">{part.description}</Typography>
                </Box>
                <Grid2 container>
                <Grid2 size={{md:6, xs:12}}>
                    <Typography variant="label4">Created</Typography>
                    <Typography variant="body2">{part.created}</Typography>
                </Grid2>
                <Grid2 size={{md:6, xs:12}}>
                    <Typography variant="label4">Updated</Typography>
                    <Typography variant="body2">{part.created}</Typography>
                </Grid2>
                </Grid2>
            </Grid2>
        </Grid2>
        <Grid2 size={{lg: 4, md: 12}} alignContent="right" alignItems="right">
            <img src={part.image} alt={part.name} className="product-image img-fluid my-auto" />
            <Box>
                <Typography variant="label4">{part.uuid}</Typography>
            </Box>
            <h2 className="mt-4">Shared With:</h2>
            <ul className="mt-3">
                <li className="flex">
                    <Icon fontSize="16" iconName="Polyline" className="my-auto mr-1" />
                    <Typography variant="label2" style={{ marginRight: "5px" }}>Volkswagen AG -</Typography>
                    <Typography variant="body2">BPNL42621500AS61</Typography>
                </li>
                <li className="flex">
                    <Icon fontSize="16" iconName="Polyline" className="my-auto mr-1" />
                    <Typography variant="label2" style={{ marginRight: "5px" }}>BMW Racing Gmbh -</Typography>
                    <Typography variant="body2">BPNL3A4T8A5621S3</Typography>
                </li>
                <li className="flex">
                    <Icon fontSize="16" iconName="Polyline" className="my-auto mr-1" />
                    <Typography variant="label2" style={{ marginRight: "5px" }}>John the Recycler KG - </Typography>
                    <Typography variant="body2">BPNL5ASD5428800A</Typography>
                </li>
                <li className="flex">
                    <Icon fontSize="16" iconName="Launch" className="my-auto mr-1" />
                    <a href="">512 more</a>
                </li>
            </ul>
        </Grid2>
    </Grid2>
  )
}

export default ProductData