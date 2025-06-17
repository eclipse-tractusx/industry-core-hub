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
import { Typography } from '@catena-x/portal-shared-components';
import { PartType } from '../../../../types/product';
import { PieChart } from '@mui/x-charts/PieChart';
import WifiTetheringErrorIcon from '@mui/icons-material/WifiTetheringError';
import { SharedPartner } from '../../../../types/sharedPartners';
import SharedTable from './SharedTable';

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
    <Grid2 container size={12} justifyContent="space-between" className="mb-5" columnSpacing={8}>
        <Grid2 size={12}>
            <Grid2 className="ml-5 title-subtitle">
                <Typography variant="h2">{part.name}</Typography>
                <Typography variant="caption1">{part.category}</Typography>
            </Grid2>
        </Grid2>
        
        <Grid2 size={{lg: 5, md: 12, sm: 12}} display={"flex"} flexDirection={"column"}>
            {/*Content on the left side*/}
            <Grid2 className="product-card-details mb-5">
                <Box>
                    <Typography variant="label3">Manufacturer</Typography>
                    <Typography variant="body1">{part.manufacturerId}</Typography>
                </Box>
                <Box>
                    <Typography variant="label3">Manufacturer Part Id</Typography>
                    <Typography variant="body1">{part.manufacturerPartId}</Typography>
                </Box>
                <Box>
                    <Typography variant="label3">Site of Origin (BPNS)</Typography>
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
        <Grid2 size={{lg: 7, md: 12, sm: 12}}>
            {/* <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                <img src={part.image} alt={part.name} className="product-image" />
                <Typography variant="label4">{part.uuid}</Typography>
            </Box> */}

            {/*Sharing information*/}
            <Box className="product-card mb-5">
                <Typography variant="h6" className="mt-4">Shared With:</Typography>
                {
                    sharedParts.length > 0 ? (
                        <SharedTable sharedParts={sharedParts} />
                    ) : (
                        <Grid2 justifyContent={"left"} display={"flex"} alignContent={"center"}>
                            <WifiTetheringErrorIcon className="mr-2"/>
                            <span className="">No sharing insights are currently available. Share this part with a partner to view the information here.</span>
                        </Grid2>
                    )
                }
            </Box>
            {/*Materials and dimensions*/}
            <Box className="product-card mb-5">
                <Typography variant="h6" className="mt-4">More Information:</Typography>
                <Box component="ul"
                    sx={{
                        listStyle: 'none',
                        padding: 0,
                        mt: 2,
                        display: 'flex',
                        flexDirection: { xs: 'column', md: 'row' },
                        alignItems: 'flex-start',
                        gap: { xs: 0, md: 8 },
                    }}
                >
                    {/*chart of materials*/}
                    <Grid2 size={{ md: 8, xs: 12 }}>
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
                    </Grid2>
                    {/*physical properties*/}
                    <Grid2 container size={{ md: 4, xs: 12 }} sx={{ marginY: 'auto' }}>
                        <Grid2 size={6} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
                            <Typography variant="label3">Width:</Typography>
                            <Typography variant="body1">{part.width?.value} {part.width?.unit}</Typography>
                        </Grid2>
                        <Grid2 size={6} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
                            <Typography variant="label3">Height:</Typography>
                            <Typography variant="body1">{part.height?.value} {part.height?.unit}</Typography>
                        </Grid2>
                        <Grid2 size={6} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
                            <Typography variant="label3">Length:</Typography>
                            <Typography variant="body1">{part.length?.value} {part.length?.unit}</Typography>
                        </Grid2>
                        <Grid2 size={6} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
                            <Typography variant="label3">Weight:</Typography>
                            <Typography variant="body1">{part.weight?.value} {part.weight?.unit}</Typography>
                        </Grid2>
                    </Grid2>

                </Box>
            </Box>

        </Grid2>
    </Grid2>
  )
}

export default ProductData