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

import IosShare from "@mui/icons-material/IosShare";
import MoreVert from "@mui/icons-material/MoreVert";
import Launch from "@mui/icons-material/Launch";
import { Box, Typography, IconButton, Button } from "@mui/material";
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import { CardChip } from "./CardChip";
import { StatusVariants } from "../../../../types/statusVariants";
import { ErrorNotFound } from "../../../../components/general/ErrorNotFound";

export interface AppContent {
  id?: string;
  manufacturerId: string;
  manufacturerPartId: string;
  name?: string;
  category?: string;
  status?: StatusVariants;
}

export interface CardDecisionProps {
  items: AppContent[];
  onShare: (e1: string, e2: string) => void;
  onMore: (e1: string, e2: string) => void;
  onClick: (e: string) => void;
}

export enum ButtonEvents {
  SHARE,
  MORE,
}

export const ProductCard = ({
  items,
  onShare,
  onMore,
  onClick,
}: CardDecisionProps) => {

  const handleDecision = (
    e: React.SyntheticEvent,
    manufacturerId: string,
    manufacturerPartId: string,
    type: ButtonEvents
  ) => {
    e.stopPropagation();
    return type == ButtonEvents.SHARE 
      ? onShare(manufacturerId, manufacturerPartId) 
      : onMore(manufacturerId, manufacturerPartId);
  };

  return (
    <Box className="custom-cards-list">
      {items.length === 0 && (
        <ErrorNotFound icon={ReportProblemIcon} message="No catalog parts available, please check your ichub-backend connection/configuration"/>
      )}
      {items.map((item) => {
        const name = item.name ?? "";
        const productId = item.manufacturerId + "/" + item.manufacturerPartId;
        return (
          <Box key={productId} className="custom-card-box">
            <Box
              className="custom-card"
              sx={{
                height: "220px"
              }}
              onClick={() => {
                onClick(productId);
              }}
            >
              <Box className="custom-card-header">
                <CardChip status={item.status} statusText={item.status} />

                <Box className="custom-card-header-buttons">                  
                  {item.status !== StatusVariants.draft && (
                    /* If the item is not in draft, sharing is enabled */
                    <IconButton
                      onClick={(e) => {
                        handleDecision(e, item.manufacturerId, item.manufacturerPartId, ButtonEvents.SHARE);
                      }}
                    >
                      <IosShare sx={{ color: "white"}} />
                    </IconButton>
                  )}
                  <IconButton
                    onClick={(e) => {
                      handleDecision(e, item.manufacturerId, item.manufacturerPartId, ButtonEvents.MORE);
                    }}
                  >
                    <MoreVert sx={{ color: "rgba(255, 255, 255, 0.68)" }} />
                  </IconButton>
                </Box>
              </Box>
              <Box className="custom-card-content">
                <Typography variant="h5">
                  {name}
                </Typography>
                <br></br>
                <Typography variant="label2">
                  {item.category}
                </Typography>
              </Box>
              <Box className="custom-card-button-box">
                <Button variant="contained" size="small" endIcon={<Launch />}>
                  View
                </Button>
              </Box>
            </Box>
          </Box>
        );
      })}
    </Box>
  );
};
