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

import { useState } from 'react';
import { 
  Button, 
  ClickAwayListener,
  Grow,
  Paper,
  Popper,
  MenuList,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider
} from '@mui/material';
import {
  ContentCopy as ContentCopyIcon,
  FileDownload as FileDownloadIcon,
  Share as ShareIcon,
  IosShare as IosShareIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  GetApp as ExportIcon,
  Visibility as ViewDetailsIcon,
  MoreVert as MoreVertIcon,
  CloudUpload as RegisterIcon
} from '@mui/icons-material';
import { PRODUCT_OPTIONS } from '@/features/industry-core-kit/catalog-management/types/shared';
import { PartType, StatusVariants } from "@/features/industry-core-kit/catalog-management/types/types";
import { CatalogPartTwinDetailsRead, CatalogPartTwinCreateType } from '@/features/industry-core-kit/catalog-management/types/twin-types';
import { registerCatalogPartTwin } from "@/features/industry-core-kit/catalog-management/api";

interface ShareDropdownProps {
  partData: PartType;
  twinDetails: CatalogPartTwinDetailsRead | null;
  handleShare?: () => void;
  handleEdit?: () => void;
  handleDelete?: () => void;
  handleExport?: () => void;
  handleViewDetails?: () => void;
  onNotification?: (notification: { open: boolean; severity: "success" | "error"; title: string }) => void;
  onRefresh?: () => void;
  disabled?: boolean;
}const ShareDropdown = ({ 
  partData,
  twinDetails,
  handleShare, 
  handleEdit,
  handleDelete,
  handleExport,
  handleViewDetails,
  onNotification,
  onRefresh,
  disabled = false 
}: ShareDropdownProps) => {
  const [open, setOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleToggle = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
    setOpen((prevOpen) => !prevOpen);
  };

  const handleClose = (event: Event | React.SyntheticEvent) => {
    if (anchorEl && anchorEl.contains(event.target as HTMLElement)) {
      return;
    }
    setOpen(false);
  };

  const handleMenuItemClick = (action: () => void) => {
    action();
    setOpen(false);
  };

  // Internal copy handler - copies global asset ID if available, otherwise part ID
  const handleCopy = () => {
    const textToCopy = twinDetails?.globalId || `${partData.manufacturerId}#${partData.manufacturerPartId}`;
    const copyLabel = twinDetails?.globalId ? "Global Asset ID" : "Part ID";
    
    navigator.clipboard.writeText(textToCopy)
      .then(() => {
        
        onNotification?.({
          open: true,
          severity: "success",
          title: `${copyLabel} copied to clipboard`,
        });
      })
      .catch((error) => {
        console.error(`Failed to copy ${copyLabel}:`, error);
        onNotification?.({
          open: true,
          severity: "error",
          title: `Failed to copy ${copyLabel}`,
        });
      });
  };

  // Internal AAS ID copy handler - copies AAS ID if available
  const handleCopyAasId = () => {
    if (!twinDetails?.dtrAasId) {
      onNotification?.({
        open: true,
        severity: "error",
        title: "AAS ID not available",
      });
      return;
    }
    
    navigator.clipboard.writeText(twinDetails.dtrAasId)
      .then(() => {
        
        onNotification?.({
          open: true,
          severity: "success",
          title: "AAS ID copied to clipboard",
        });
      })
      .catch((error) => {
        console.error("Failed to copy AAS ID:", error);
        onNotification?.({
          open: true,
          severity: "error",
          title: "Failed to copy AAS ID",
        });
      });
  };

  // Internal download handler - downloads part data as JSON
  const handleDownload = () => {
    const dataToDownload = {
      manufacturerId: partData.manufacturerId,
      manufacturerPartId: partData.manufacturerPartId,
      name: partData.name,
      category: partData.category,
      description: partData.description,
      materials: partData.materials,
      dimensions: {
        width: partData.width,
        height: partData.height,
        length: partData.length,
        weight: partData.weight
      },
      status: partData.status,
      customerPartIds: partData.customerPartIds,
      // Include twin details if available
      ...(twinDetails && {
        twinDetails: {
          globalId: twinDetails.globalId,
          dtrAasId: twinDetails.dtrAasId,
          createdDate: twinDetails.createdDate,
          modifiedDate: twinDetails.modifiedDate
        }
      })
    };

    const fileName = `${partData.name.toLowerCase().replace(/\s+/g, "-")}-catalog-data.json`;
    const blob = new Blob([JSON.stringify(dataToDownload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Internal register handler - registers part twin
  const handleRegister = async () => {
    try {
      const twinToCreate: CatalogPartTwinCreateType = {
        manufacturerId: partData.manufacturerId,
        manufacturerPartId: partData.manufacturerPartId,
      };
      
      await registerCatalogPartTwin(twinToCreate);
      
      onNotification?.({
        open: true,
        severity: "success",
        title: "Part twin registered successfully!",
      });

      // Refresh the parent component data after successful registration
      setTimeout(() => {
        onRefresh?.();
      }, 1000);
      
    } catch (error) {
      console.error("Error registering part twin:", error);
      onNotification?.({
        open: true,
        severity: "error",
        title: "Failed to register part twin!",
      });
    }
  };

  return (
    <>
      <Button
        size="small"
        variant="outlined"
        onClick={handleToggle}
        disabled={disabled}
        className="actions-button"
        endIcon={<IosShareIcon />}
      >
        SHARE
      </Button>
      <Popper
        open={open}
        anchorEl={anchorEl}
        role={undefined}
        placement="bottom-end"
        transition
        disablePortal
        style={{ zIndex: 1300 }}
      >
        {({ TransitionProps, placement }) => (
          <Grow
            {...TransitionProps}
            style={{
              transformOrigin: placement === 'bottom-start' ? 'left top' : 'right top',
            }}
          >
            <Paper
              elevation={3}
              className="actions-dropdown-menu"
            >
              <ClickAwayListener onClickAway={handleClose}>
                <MenuList autoFocusItem={open} dense>
                  {/* View Details */}
                  {handleViewDetails && (
                    <MenuItem onClick={() => handleMenuItemClick(handleViewDetails)}>
                      <ListItemIcon>
                        <ViewDetailsIcon fontSize="small" />
                      </ListItemIcon>
                      <ListItemText primary={PRODUCT_OPTIONS.VIEW_DETAILS} />
                    </MenuItem>
                  )}

                  {/* Edit */}
                  {handleEdit && (
                    <MenuItem onClick={() => handleMenuItemClick(handleEdit)}>
                      <ListItemIcon>
                        <EditIcon fontSize="small" />
                      </ListItemIcon>
                      <ListItemText primary={PRODUCT_OPTIONS.EDIT} />
                    </MenuItem>
                  )}

                  {/* Register Twin - Show if status is draft (no twin) or pending (always) */}
                  {((partData.status === StatusVariants.draft && !twinDetails) || partData.status === StatusVariants.pending) && (
                    <MenuItem onClick={() => handleMenuItemClick(handleRegister)}>
                      <ListItemIcon>
                        <RegisterIcon fontSize="small" />
                      </ListItemIcon>
                      <ListItemText primary={PRODUCT_OPTIONS.REGISTER} />
                    </MenuItem>
                  )}

                  {(handleViewDetails || handleEdit || ((partData.status === StatusVariants.draft && !twinDetails) || partData.status === StatusVariants.pending)) && <Divider />}

                  {/* Share */}
                  {handleShare && (
                    <MenuItem onClick={() => handleMenuItemClick(handleShare)}>
                      <ListItemIcon>
                        <ShareIcon fontSize="small" />
                      </ListItemIcon>
                      <ListItemText primary={PRODUCT_OPTIONS.SHARE} />
                    </MenuItem>
                  )}

                  {/* Copy */}
                  {twinDetails?.globalId && (
                    <MenuItem onClick={() => handleMenuItemClick(handleCopy)}>
                      <ListItemIcon>
                        <ContentCopyIcon fontSize="small" />
                      </ListItemIcon>
                      <ListItemText primary={PRODUCT_OPTIONS.COPY} />
                    </MenuItem>
                  )}

                  {/* Copy AAS ID */}
                  {twinDetails?.dtrAasId && (
                    <MenuItem onClick={() => handleMenuItemClick(handleCopyAasId)}>
                      <ListItemIcon>
                        <ContentCopyIcon fontSize="small" />
                      </ListItemIcon>
                      <ListItemText primary={PRODUCT_OPTIONS.COPY_AAS_ID} />
                    </MenuItem>
                  )}

                  <Divider />

                  {/* Download */}
                  <MenuItem onClick={() => handleMenuItemClick(handleDownload)}>
                    <ListItemIcon>
                      <FileDownloadIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText primary={PRODUCT_OPTIONS.DOWNLOAD} />
                  </MenuItem>

                  {/* Export */}
                  {handleExport && (
                    <MenuItem onClick={() => handleMenuItemClick(handleExport)}>
                      <ListItemIcon>
                        <ExportIcon fontSize="small" />
                      </ListItemIcon>
                      <ListItemText primary={PRODUCT_OPTIONS.EXPORT} />
                    </MenuItem>
                  )}

                  {/* Delete */}
                  {handleDelete && (
                    <>
                      <Divider />
                      <MenuItem 
                        onClick={() => handleMenuItemClick(handleDelete)}
                        className="danger-item"
                      >
                        <ListItemIcon>
                          <DeleteIcon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText primary={PRODUCT_OPTIONS.DELETE} />
                      </MenuItem>
                    </>
                  )}
                </MenuList>
              </ClickAwayListener>
            </Paper>
          </Grow>
        )}
      </Popper>
    </>
  );
};

export default ShareDropdown;
