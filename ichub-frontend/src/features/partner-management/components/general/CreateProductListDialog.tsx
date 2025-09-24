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
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND,
 * either express or implied. See the
 * License for the specific language govern in permissions and limitations
 * under the License.
 *
 * SPDX-License-Identifier: Apache-2.0
 ********************************************************************************/

import { useState, useEffect } from "react";
import { Button } from "@catena-x/portal-shared-components";
import {
  Box,
  TextField,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Typography,
  Grid2,
  MenuItem,
  Tooltip,
  InputAdornment,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import { createCatalogPart } from "../../api";
import {
  PartType,
  WeightUnit,
  LengthUnit,
} from "../../../../types/product";
import { mapPartInstanceToApiPartData } from "../../../catalog-management/utils";
import { getParticipantId } from "../../../../services/EnvironmentService";
import { Business, Category, ConfirmationNumber, Description, DriveFileRenameOutline, Fingerprint, Percent, Scale, Science, Straighten } from "@mui/icons-material";

// Define props for ProductListDialog
interface ProductListDialogProps {
  open: boolean;
  onClose: () => void;
  onSave?: (data: { part: PartType }) => void;
}

const CreateProductListDialog = ({ open, onClose, onSave }: ProductListDialogProps) => {
  const manufacturerId = getParticipantId();
  const lengthUnits = Object.values(LengthUnit);
  const weightUnits = Object.values(WeightUnit);

  const [formData, setFormData] = useState<Omit<PartType, "status">>({
    manufacturerId: manufacturerId,
    manufacturerPartId: "",
    name: "",
    description: "",
    category: "",
    materials: [{ name: "", share: 0 }],
    bpns: "",
    width: { value: 0, unit: LengthUnit.MM },
    height: { value: 0, unit: LengthUnit.MM },
    length: { value: 0, unit: LengthUnit.MM },
    weight: { value: 0, unit: WeightUnit.KG },
  });

  const [successMessage, setSuccessMessage] = useState("");
  const [apiErrorMessage, setApiErrorMessage] = useState("");

  useEffect(() => {
    if (open) {
      setFormData({
        manufacturerId: manufacturerId,
        manufacturerPartId: "",
        name: "",
        description: "",
        category: "",
        materials: [{ name: "", share: 0 }],
        bpns: "",
        width: { value: 0, unit: LengthUnit.MM },
        height: { value: 0, unit: LengthUnit.MM },
        length: { value: 0, unit: LengthUnit.MM },
        weight: { value: 0, unit: WeightUnit.KG },
      });
      setSuccessMessage("");
      setApiErrorMessage("");
    }
  }, [open]);

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleMeasurementChange = (field: "width" | "height" | "length" | "weight", key: "value" | "unit", value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: { ...prev[field], [key]: value },
    }));
  };
  
  const handleMaterialChange = (index: number, key: "name" | "share", value: any) => {
    const newMaterials = [...formData.materials];
    newMaterials[index] = { ...newMaterials[index], [key]: value };
    setFormData((prev) => ({ ...prev, materials: newMaterials }));
  };

  const addMaterial = () => {
    setFormData((prev) => ({ ...prev, materials: [...prev.materials, { name: "", share: 0 }] }));
  };

  const handleSave = async () => {
    const payload = {
      ...formData,
      manufacturerId: getParticipantId(),
    };

    try {
      await createCatalogPart(mapPartInstanceToApiPartData(payload as PartType));
      setSuccessMessage("Catalog part created successfully.");
      setTimeout(() => {
        setSuccessMessage("");
        onSave?.({ part: payload as PartType });
        onClose();
      }, 3000);
    } catch (error: any) {
      console.error("Error creating catalog part:", error);
      let errorMessage = error.message || "Failed to create catalog part.";
      if (error.response?.data) {
        errorMessage = JSON.stringify(error.response.data);
      }
      setApiErrorMessage(errorMessage);
    }
  };

  return (
    <Dialog open={open} maxWidth="lg" fullWidth className="custom-dialog">
      <DialogTitle sx={{ m: 0, p: 2 }}>Create New Catalog Part</DialogTitle>
      <IconButton
        aria-label="close"
        onClick={onClose}
        sx={(theme) => ({
          position: "absolute",
          right: 8,
          top: 8,
          color: theme.palette.grey[500],
        })}
      >
        <CloseIcon />
      </IconButton>
      <DialogContent dividers>
        <Typography variant="body2" mt={1} mb={3} sx={{color: "white", borderBottom: "1px solid rgba(255, 255, 255, 0.5)"}}>Main Product Information</Typography>
        <Grid2 container spacing={2} mt={1}>
          <Grid2 size={{md: 4, sm: 6, xs: 12}}>
            <TextField
              label="Manufacturer ID"
              variant="outlined"
              size="small"
              value={getParticipantId()}
              disabled
              fullWidth
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <Business />
                    </InputAdornment>
                  ),
                },
              }}
            />
          </Grid2>
          <Grid2 size={{md: 4, sm: 6, xs: 12}}>
            <TextField
              label="Manufacturer Part ID"
              variant="outlined"
              size="small"
              value={formData.manufacturerPartId}
              onChange={(e) => handleChange("manufacturerPartId", e.target.value)}
              fullWidth
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <ConfirmationNumber />
                    </InputAdornment>
                  ),
                },
              }}
            />
          </Grid2>
          <Grid2 size={{md: 4, sm: 6, xs: 12}}>
            <TextField
              label="Name"
              variant="outlined"
              size="small"
              value={formData.name}
              onChange={(e) => handleChange("name", e.target.value)}
              fullWidth
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <DriveFileRenameOutline />
                    </InputAdornment>
                  ),
                },
              }}
            />
          </Grid2>
          <Grid2 size={{md: 4, sm: 6, xs: 12}}>
            <TextField
              label="Description"
              variant="outlined"
              size="small"
              value={formData.description}
              onChange={(e) => handleChange("description", e.target.value)}
              fullWidth
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <Description />
                    </InputAdornment>
                  ),
                },
              }}
            />
          </Grid2>
          <Grid2 size={{md: 4, sm: 6, xs: 12}}>
            <TextField
              label="Category"
              variant="outlined"
              size="small"
              value={formData.category}
              onChange={(e) => handleChange("category", e.target.value)}
              fullWidth
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <Category />
                    </InputAdornment>
                  ),
                },
              }}
            />
          </Grid2>
          <Grid2 size={{md: 4, sm: 6, xs: 12}}>
            <TextField
              label="BPNS"
              variant="outlined"
              size="small"
              value={formData.bpns}
              onChange={(e) => handleChange("bpns", e.target.value)}
              fullWidth
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <Fingerprint />
                    </InputAdornment>
                  ),
                },
              }}
            />
          </Grid2>
        </Grid2>

        <Typography variant="body2" mt={3} mb={3} sx={{color: "white", borderBottom: "1px solid rgba(255, 255, 255, 0.5)"}}>Additional Product Information</Typography>
        {formData.materials.map((mat, index) => (
          <Grid2 container spacing={2} key={index} alignItems="center" mt={1} px={{md: 6, sm: 0}}>
            <Grid2 size={{ xs: 7 }}>
              <TextField
                label="Material Name"
                variant="outlined"
                size="small"
                fullWidth
                value={mat.name}
                onChange={(e) => handleMaterialChange(index, "name", e.target.value)}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <Science />
                      </InputAdornment>
                    ),
                  },
                }}
              />
            </Grid2>
            <Grid2 size={{ xs: 4 }}>
              <TextField
                label="Share (%)"
                type="number"
                variant="outlined"
                size="small"
                fullWidth
                value={mat.share}
                onChange={(e) => handleMaterialChange(index, "share", Number(e.target.value))}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <Percent />
                      </InputAdornment>
                    ),
                  },
                }}
              />
            </Grid2>
            <Grid2 size={{ xs: 1 }} display="flex" justifyContent="center">
              {index === formData.materials.length - 1 && (
                <Tooltip title="Add material">
                  <IconButton onClick={addMaterial} className="add-material-button">
                    <AddIcon />
                  </IconButton>
                </Tooltip>
              )}
            </Grid2>
          </Grid2>
        ))}

        <Box mt={5}></Box>
        
        <Grid2 container spacing={2} mt={1} px={{md: 6, sm: 0}}>
          {(["width", "height", "length", "weight"] as const).map((field) => {
            const isWeight = field === "weight";
            const units = isWeight ? weightUnits : lengthUnits;
            const icon = isWeight ? <Scale /> : <Straighten />;

            return [
              <Grid2 size={{ md: 4, sm: 8 }} key={`${field}-value`}>
                <TextField
                  label={`${field.charAt(0).toUpperCase() + field.slice(1)} value`}
                  type="number"
                  variant="outlined"
                  size="small"
                  fullWidth
                  value={formData[field]?.value ?? ""}
                  onChange={(e) =>
                    handleMeasurementChange(field, "value", Number(e.target.value))
                  }
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          {icon}
                        </InputAdornment>
                      ),
                    },
                  }}
                />
              </Grid2>,
              <Grid2 size={{ md: 2, sm: 4 }} key={`${field}-unit`}>
                <TextField
                  label={`${field.charAt(0).toUpperCase() + field.slice(1)} unit`}
                  select
                  variant="outlined"
                  size="small"
                  fullWidth
                  value={formData[field]?.unit ?? ""}
                  onChange={(e) =>
                    handleMeasurementChange(field, "unit", e.target.value)
                  }
                >
                  {units.map((u) => (
                    <MenuItem key={u} value={u}>{u}</MenuItem>
                  ))}
                </TextField>
              </Grid2>,
            ];
          })}
        </Grid2>

        {apiErrorMessage && (
          <Box sx={{ mt: 2 }}>
            <Alert severity="error">{apiErrorMessage}</Alert>
          </Box>
        )}
        {successMessage && (
          <Box sx={{ mt: 2 }}>
            <Alert severity="success">{successMessage}</Alert>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button
          className="close-button"
          variant="outlined"
          size="small"
          onClick={onClose}
          startIcon={<CloseIcon />}
        >
          CLOSE
        </Button>
        <Button
          className="action-button"
          variant="contained"
          size="small"
          onClick={handleSave}
          startIcon={<AddIcon />}
        >
          CREATE
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CreateProductListDialog;
