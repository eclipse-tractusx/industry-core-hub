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
import { CardChip, StatusVariants } from "./CardChip";

export interface AppContent {
  uuid?: string;
  name?: string;
  class?: string;
  status?: StatusVariants;
}

export interface CardDecisionProps {
  items: AppContent[];
  onShare: (e: string) => void;
  onMore: (e: string) => void;
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
    id: string,
    type: ButtonEvents
  ) => {
    e.stopPropagation();
    return type == ButtonEvents.SHARE ? onShare(id) : onMore(id);
  };

  return (
    <Box className="custom-cards-list">
      {items.map((item) => {
        const id = item.uuid ?? "";
        const name = item.name ?? "";
        return (
          <Box key={id} className="custom-card-box">
            <Box
              className="custom-card"
              sx={{
                height: "220px"
              }}
              onClick={() => {
                onClick(id);
              }}
            >
              <Box className="custom-card-header">
                <CardChip status={item.status} statusText={item.status} />

                <Box className="custom-card-header-buttons">                  
                  {item.status !== StatusVariants.draft && (
                    /* If the item is not in draft, sharing is enabled */
                    <IconButton
                      onClick={(e) => {
                        handleDecision(e, id, ButtonEvents.SHARE);
                      }}
                    >
                      <IosShare sx={{ color: "white"}} />
                    </IconButton>
                  )}
                  <IconButton
                    onClick={(e) => {
                      handleDecision(e, id, ButtonEvents.MORE);
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
                  {item.class}
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
