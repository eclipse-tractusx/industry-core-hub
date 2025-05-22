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

import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import { Box, Typography, IconButton } from "@mui/material";

export interface AppContent {
  bpnl?: string;
  name?: string;
}

export interface CardDecisionProps {
  items: AppContent[];
  onClick: (e: string) => void;
  onDelete?: (e: string) => void;
  onEdit?: (e: string) => void;
}

export const PartnerCard = ({ items, onClick, onDelete, onEdit }: CardDecisionProps) => {

  return (
    <Box className="custom-cards-list">
      {items.map((item) => {
        const bpnl = item.bpnl ?? "";
        const name = item.name ?? "";
        return (
          <Box key={bpnl} className="custom-card-box">
            <Box
              className="custom-card"
              sx={{
                height: "130px",
              }}
              onClick={() => {
                onClick(bpnl);
              }}
            >
              <Box className="custom-card-header">
                <Box></Box>
                <Box className="custom-card-header-buttons">
                  <IconButton sx={{ cursor: "default", pointerEvents: "none", opacity: 0.4 }}
                    onClick={() => {
                      onEdit?.(bpnl);
                    }}
                  >
                    <EditIcon sx={{ color: "white" }} />
                  </IconButton>
                  
                  <IconButton sx={{ cursor: "default", pointerEvents: "none", opacity: 0.4 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete?.(bpnl);
                    }}
                  >
                    <DeleteIcon sx={{ color: "rgba(255, 255, 255, 0.68)" }} />
                  </IconButton>
                </Box>
              </Box>
              <Box className="custom-card-content">
                <Typography variant="h5">
                  {name}
                </Typography>
                <br></br>
                <Typography variant="label2">
                  {item.bpnl}
                </Typography>
              </Box>
            </Box>
          </Box>
        );
      })}
    </Box>
  );
};
