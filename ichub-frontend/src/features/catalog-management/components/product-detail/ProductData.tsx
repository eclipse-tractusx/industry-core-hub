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
import { PartInstance } from '../../../../types/product';

interface SharedPartner {
    name: string;
    bpnl: string;
}

interface ProductDataProps {
    part: PartInstance;
    sharedParts: SharedPartner[];
}

const ProductData = ({ part, sharedParts }: ProductDataProps) => {
  return (
    <Grid2 container justifyContent="space-between" className="mb-5" spacing={8}>
        <Grid2 size={{lg: 6, md: 12, sm: 12}}>
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
        <Grid2 size={{lg: 6, md: 12, sm: 12}}>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                <img src={part.image} alt={part.name} className="product-image" />
                <Typography variant="label4">{part.uuid}</Typography>
            </Box>
            <Typography variant="h6" className="mt-4">Shared With:</Typography>

            <Box component="ul" sx={{ listStyle: 'none', padding: 0, mt: 2 }}>
                {(sharedParts ?? []).map(({ name, bpnl }, index) => (
                    <Box key={index} component="li" sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: 'flex-start', mb: 1.5 }}>
                        <Icon fontSize="16" iconName="Polyline" className="my-auto mr-1" />
                        <Box sx={{ display: 'flex', flexWrap: 'wrap' }}>
                        <Typography variant="label2" sx={{ mr: '5px', fontWeight: 'bold' }}> {name} -</Typography>
                        <Typography variant="body2">{bpnl}</Typography>
                        </Box>
                    </Box>
                ))}
                <Box component="li" sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
                <Icon fontSize="16" iconName="Launch" className="my-auto mr-1" />
                    <a href="">512 more</a>
                </Box>
            </Box>
        </Grid2>
    </Grid2>
  )
}

export default ProductData