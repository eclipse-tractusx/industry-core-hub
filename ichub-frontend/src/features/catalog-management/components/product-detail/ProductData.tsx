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
import { PartType } from '../../../../types/product';
import { PieChart } from '@mui/x-charts/PieChart';

interface SharedPartner {
    name: string;
    bpnl: string;
}

interface ProductDataProps {
    part: PartType;
    sharedParts: SharedPartner[];
}

const sharedInformation = {
    created: "Not yet created",
    updated: "Not yet created"
}

const ProductData = ({ part, sharedParts }: ProductDataProps) => {
  return (
    <Grid2 container justifyContent="space-between" className="mb-5" spacing={8} display={"flex"} flexDirection={"row"}>
        <Grid2 size={{lg: 6, md: 12, sm: 12}} display={"flex"} flexDirection={"column"}>
            <Grid2 className="ml-5 mb-5 title-subtitle">
                <Typography variant="h2">{part.name}</Typography>
                <Typography variant="caption1">{part.category}</Typography>
            </Grid2>
            {/*Content on the left side*/}
            <Grid2 className="ml-2 mt-5 product-card-details">
                <Box>
                <Typography variant="label3">Manufacturer</Typography>
                <Typography variant="body1">{part.manufacturerId}</Typography>
                </Box>
                <Box>
                <Typography variant="label3">Manufacturer Part Id</Typography>
                <Typography variant="body1">{part.manufacturerPartId}</Typography>
                </Box>
                <Box>
                    <Typography variant="label3">Country of Origin (BPNS)</Typography>
                    <Typography variant="body1">{part.bpns}</Typography>
                </Box>
                <Box>
                    <Typography variant="label3">Description</Typography>
                    <Typography variant="body3">{part.description ?? "-"}</Typography>
                </Box>
                <Grid2 container>
                    <Grid2 size={{md:6, xs:12}}>
                        <Typography variant="label4">Created</Typography>
                        <Typography variant="body2">{sharedInformation.created}</Typography>
                    </Grid2> 
                    <Grid2 size={{md:6, xs:12}}>
                        <Typography variant="label4">Updated</Typography>
                        <Typography variant="body2">{sharedInformation.updated}</Typography>
                    </Grid2> 
                </Grid2>
            </Grid2>
        </Grid2>

        {/*Content on the right side*/}
        <Grid2 size={{lg: 6, md: 12, sm: 12}}>
            {/* <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                <img src={part.image} alt={part.name} className="product-image" />
                <Typography variant="label4">{part.uuid}</Typography>
            </Box> */}

            {/*Sharing information*/}
            <Box component="ul" sx={{ listStyle: 'none', padding: 0, mt: 2 }} className={"product-card"}>
                <Typography variant="h6" className="mt-4">Shared With:</Typography>
                {(sharedParts ?? []).map(({ name, bpnl }, index) => (
                    <Box key={index} component="li" sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: 'flex-start' }}>
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
            {/*Materials and dimensions*/}
            <Box className="product-card">
                <Typography variant="h6" className="mt-4">More Information:</Typography>
                <Box
                    component="ul"
                    sx={{
                        listStyle: 'none',
                        padding: 0,
                        mt: 2,
                        display: 'flex',
                        flexDirection: 'row',
                        alignItems: 'flex-start',
                        gap: 8,
                    }}
                >
                    {/*chart of materials*/}
                    <Box sx={{ width: '50%'}}>
                        <Typography variant="label3">Materials:</Typography>
                        {(part.materials && part.materials.length>0) ? (
                            <PieChart
                                series={[
                                    {
                                        data: part.materials.map((material) => ({
                                            value: material.share,
                                            label: material.name,
                                        })),
                                        highlightScope: { fade: 'global', highlight: 'item' },
                                    },
                                ]}
                                width={200}
                                height={200}
                            />
                        ) : (
                            <Box
                                component="ul"
                                sx={{
                                    listStyle: 'none',
                                    padding: 0,
                                    mt: 2,
                                    display: 'flex',
                                    alignItems: 'center',
                                }}
                            >
                                <Typography variant="body2">
                                    No materials data to show
                                </Typography>
                            </Box>
                        )}
                    </Box>
                    {/*physical properties*/}
                    <Box sx={{ width: '50%'}}>
                        <Box>
                            <Typography variant="label3">Width:</Typography>
                            <Typography variant="body1">{part.width?.value} {part.width?.unit}</Typography>
                        </Box>
                        <Box>
                            <Typography variant="label3">Height:</Typography>
                            <Typography variant="body1">{part.height?.value} {part.height?.unit}</Typography>
                        </Box>
                        <Box>
                            <Typography variant="label3">Length:</Typography>
                            <Typography variant="body1">{part.length?.value} {part.length?.unit}</Typography>
                        </Box>
                        <Box>
                            <Typography variant="label3">Weight:</Typography>
                            <Typography variant="body1">{part.weight?.value} {part.weight?.unit}</Typography>
                        </Box>
                    </Box>

                </Box>
            </Box>

        </Grid2>
    </Grid2>
  )
}

export default ProductData