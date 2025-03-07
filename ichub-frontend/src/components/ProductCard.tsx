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
import { Box, Typography, IconButton, useTheme, Button } from "@mui/material";
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
  const theme = useTheme();

  const handleDecision = (
    e: React.SyntheticEvent,
    id: string,
    type: ButtonEvents
  ) => {
    e.stopPropagation();
    return type == ButtonEvents.SHARE ? onShare(id) : onMore(id);
  };

  return (
    <Box
      className="product-cards"
      sx={{
        display: "flex",
        msFlexWrap: "wrap",
        flexWrap: "wrap",
        justifyContent: "center",
      }}
    >
      {items.map((item) => {
        const id = item.uuid ?? "";
        const name = item.name ?? "";
        return (
          <Box
            key={id}
            sx={{
              paddingRight: "10px",
              paddingLeft: "10px",
              width: "280px",
              minWidth: "280px",
              marginBottom: "20px",
              borderRadius: "5px",
              color: "white",
            }}
          >
            <Box
              className="product-card"
              sx={{
                borderRadius: "8px",
                display: "flex",
                flexDirection: "column",
                width: "auto",
                height: "220px",
                justifyContent: "space-between",
                color: "white",
                cursor: "pointer",
                ":hover": {
                  boxShadow: theme.shadows["20"],
                },
              }}
              onClick={() => {
                onClick(id);
              }}
            >
              <Box
                sx={{
                  marginBottom: "10px",
                  width: "100%",
                  display: "flex",
                  padding: "10px 10px",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <CardChip status={item.status} statusText={item.status} />

                <Box
                  sx={{
                    display: "flex",
                    justifySelf: "right",
                  }}
                >
                  
                  {item.status !== StatusVariants.draft && (
                    /* If the item is not in draft, sharing is enabled */
                    <IconButton
                      sx={{
                        padding: "0",
                        margin: "0 10px",
                        borderRadius: "8px",
                        ":hover": {
                          opacity: "0.5",
                          backgroundColor: "transparent",
                        },
                      }}
                      onClick={(e) => {
                        handleDecision(e, id, ButtonEvents.SHARE);
                      }}
                    >
                      <IosShare sx={{ color: "white", fontSize: "20px" }} />
                    </IconButton>
                  )}
                  <IconButton
                    sx={{
                      border: "0",
                      borderRadius: "8px",
                      padding: "0",
                      ":hover": {
                        opacity: "0.5",
                        backgroundColor: "transparent",
                      },
                    }}
                    onClick={(e) => {
                      handleDecision(e, id, ButtonEvents.MORE);
                    }}
                  >
                    <MoreVert
                      sx={{
                        color: "rgba(255, 255, 255, 0.68)",
                        fontSize: "20px",
                        ":hover": { color: " #0156ff" },
                      }}
                    />
                  </IconButton>
                </Box>
              </Box>
              <Box
                sx={{
                  padding: "10px 25px",
                }}
              >
                <Typography
                  variant="h5"
                  sx={{
                    "-webkit-line-clamp": "2",
                    display: "-webkit-box",
                    "-webkit-box-orient": "vertical",
                    overflow: "hidden",
                    fontWeight: "bold",
                    fontSize: "18px",
                    color: "white",
                  }}
                >
                  {name}
                </Typography>
                <br></br>
                <Typography
                  variant="label2"
                  sx={{
                    color: "white",
                    height: "48px",
                  }}
                >
                  {item.class}
                </Typography>
              </Box>
              <Box sx={{ width: "100%" }}>
                <Button
                  variant="contained"
                  size="small"
                  sx={{
                    borderRadius: "8px",
                    borderTopLeftRadius: "0",
                    borderTopRightRadius: "0",
                    background: "rgba(36, 36, 46, 0.56)",
                    width: "100%",
                    ":hover": {
                      background: "linear-gradient(180deg, rgba(1,32,96,0.8323704481792717) 0%, rgba(5,107,153,0.5690651260504201) 100%)"
                    }
                  }}
                  endIcon={<Launch sx={{ color: "white" }} />}
                >
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
