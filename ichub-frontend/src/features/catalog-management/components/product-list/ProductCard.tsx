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
import CloudQueueIcon from '@mui/icons-material/CloudQueue';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { Box, Typography, IconButton, Button, Tooltip } from "@mui/material";
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import { CardChip } from "./CardChip";
import { StatusVariants } from "../../../../types/statusVariants";
import { ErrorNotFound } from "../../../../components/general/ErrorNotFound";
import LoadingSpinner from "../../../../components/general/LoadingSpinner";

export interface AppContent {
  id?: string;
  manufacturerId: string;
  manufacturerPartId: string;
  name?: string;
  category?: string;
  status?: StatusVariants;
}

export interface CardDecisionProps {
  onClick: (productId: string) => void;
  onShare: (manufacturerId: string, manufacturerPartId: string) => void;
  onMore: (manufacturerId: string, manufacturerPartId: string) => void;
  onRegisterClick: (manufacturerId: string, manufacturerPartId: string) => void;
  items: AppContent[];
  isLoading: boolean;
}enum ButtonEvents {
  SHARE,
  MORE,
  REGISTER, 
}

export const ProductCard = ({
  items,
  onShare,
  onMore,
  onClick,
  onRegisterClick, 
  isLoading,
}: CardDecisionProps) => {

  const handleDecision = (
    e: React.SyntheticEvent,
    manufacturerId: string,
    manufacturerPartId: string,
    type: ButtonEvents
  ) => {
    e.stopPropagation();
    if (type === ButtonEvents.SHARE) {
      return onShare(manufacturerId, manufacturerPartId);
    } else if (type === ButtonEvents.MORE) {
      return onMore(manufacturerId, manufacturerPartId);
    } else if (type === ButtonEvents.REGISTER) {
      if (onRegisterClick) {
        onRegisterClick(manufacturerId, manufacturerPartId);
      }
    }
  };

  return (
    <Box className="custom-cards-list">
      {isLoading && (
        <LoadingSpinner />
      )}
      {!isLoading && items.length === 0 && (
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
                  {(item.status === StatusVariants.draft || item.status === StatusVariants.pending) && (
                    <Tooltip title="Register part" arrow>
                      <span> 
                        <IconButton
                          onClick={(e) => {
                            handleDecision(e, item.manufacturerId, item.manufacturerPartId, ButtonEvents.REGISTER);
                          }}
                        >
                          {item.status === StatusVariants.draft ? (
                            <CloudUploadIcon className="register-btn"/>
                          ) : (
                            <CloudQueueIcon sx={{ color: "rgba(255, 255, 255, 0.5)" }} />
                          )}
                        </IconButton>
                      </span>
                    </Tooltip>
                  )}
                  {item.status !== StatusVariants.draft && item.status !== StatusVariants.pending && (
                    <Tooltip title="Share part" arrow>
                      <IconButton
                        onClick={(e) => {
                          handleDecision(e, item.manufacturerId, item.manufacturerPartId, ButtonEvents.SHARE);
                        }}
                      >
                        <IosShare sx={{ color: "white"}} />
                      </IconButton>
                    </Tooltip>
                  )}
                  <Tooltip title="More options" arrow>
                    <IconButton
                      onClick={(e) => {
                        handleDecision(e, item.manufacturerId, item.manufacturerPartId, ButtonEvents.MORE);
                      }}
                    >
                      <MoreVert sx={{ color: "rgba(255, 255, 255, 0.68)" }} />
                    </IconButton>
                  </Tooltip>
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
