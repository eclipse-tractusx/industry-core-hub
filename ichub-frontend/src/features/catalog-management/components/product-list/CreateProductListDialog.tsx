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

/** Created using an LLM (Github Copilot) review by a human committer */

import { useState, useEffect, useRef } from "react";
import {
  Box,
  TextField,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Grid2,
  MenuItem,
  Button,
  IconButton,
  Chip,
  Paper,
  Slider,
  Collapse,
  CircularProgress,
  InputAdornment,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import CategoryIcon from "@mui/icons-material/Category";
import DescriptionIcon from "@mui/icons-material/Description";
import BusinessIcon from "@mui/icons-material/Business";
import StraightenIcon from "@mui/icons-material/Straighten";
import ScaleIcon from "@mui/icons-material/Scale";
import PaletteIcon from "@mui/icons-material/Palette";
import TuneIcon from "@mui/icons-material/Tune";
import PercentIcon from "@mui/icons-material/Percent";
import BarChartIcon from "@mui/icons-material/BarChart";
import PinDrop from "@mui/icons-material/PinDrop";
import TagIcon from "@mui/icons-material/Tag";
import DriveFileRenameOutlineIcon from "@mui/icons-material/DriveFileRenameOutline";
import AspectRatioIcon from "@mui/icons-material/AspectRatio";
import HeightIcon from "@mui/icons-material/Height";
import LinearScaleIcon from "@mui/icons-material/LinearScale";
import { PieChart } from "@mui/x-charts/PieChart";
import { createCatalogPart } from "../../api";
import {
  PartType,
  WeightUnit,
  LengthUnit,
} from "../../types/types";
import { mapPartInstanceToApiPartData } from "../../utils/utils";
import { getParticipantId } from "../../../../services/EnvironmentService";

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
    extraMetadata: {
      "ichub:description": "<<Your Part Description>>",
      "ichub:category": "<<Your Part Category>>",
      "ichub:materials": [
        { name: "Aluminum", share: 80 },
        { name: "Rubber", share: 20 }
      ],
      "ichub:bpns": "BPNS0000000000ZZ",
      "ichub:width": { value: 200, unit: LengthUnit.MM },
      "ichub:height": { value: 100, unit: LengthUnit.MM },
      "ichub:length": { value: 50, unit: LengthUnit.MM },
      "ichub:weight": { value: 5, unit: WeightUnit.KG }
    },
  });

  const [successMessage, setSuccessMessage] = useState("");
  const [apiErrorMessage, setApiErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [expandedMaterial, setExpandedMaterial] = useState<number | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (open) {
      setFormData({
        manufacturerId: manufacturerId,
        manufacturerPartId: "",
        name: "",
        extraMetadata: {
          "ichub:description": "",
          "ichub:category": "",
          "ichub:materials": [],
          "ichub:bpns": "",
          "ichub:width": { value: 0, unit: LengthUnit.MM },
          "ichub:height": { value: 0, unit: LengthUnit.MM },
          "ichub:length": { value: 0, unit: LengthUnit.MM },
          "ichub:weight": { value: 0, unit: WeightUnit.KG }
        },
      });
      // Clear all messages when dialog opens
      setSuccessMessage("");
      setApiErrorMessage("");
      setIsLoading(false);
      setExpandedMaterial(null);
    }
  }, [open, manufacturerId]);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleExtraMetadataChange = (field: string, value: string) => {
    const extraMetadata = [...formData.extraMetadata];
    extraMetadata[field] = value

    setFormData((prev) => ({ ...prev, extraMetadata: extraMetadata }));
  };

  const handleMeasurementChange = (field: "ichub:width" | "ichub:height" | "ichub:length" | "ichub:weight", key: "value" | "unit", value: string | number) => {
    const extraMetadata = [...formData.extraMetadata];
    extraMetadata[field] = key === "value" ? (value === "" || value === null || value === undefined ? 0 : Number(value)) : value 
    
    setFormData((prev) => ({
      ...prev, extraMetadata: extraMetadata}));
  };
  
  const handleMaterialChange = (index: number, key: "name" | "share", value: string | number) => {
    const extraMetadata = [...formData.extraMetadata]
    const newMaterials = extraMetadata?.["icuhub:materials"]?.materials;
    
    if (key === "share") {
      // Allow empty string temporarily, convert to 0 for calculations
      if (value === "" || value === null || value === undefined) {
        newMaterials[index] = { ...newMaterials[index], share: 0 };
      } else {
        const shareValue = Math.max(0, Number(value));
        newMaterials[index] = { ...newMaterials[index], share: shareValue };
      }
    } else {
      newMaterials[index] = { ...newMaterials[index], name: value as string };
    }

    extraMetadata["ichub:materials"] = newMaterials
    
    setFormData((prev) => ({ ...prev, extraMetadata: extraMetadata }));
  };

  const addMaterial = () => {
    // Simply add a new material with 0 share - let users set their desired values
    setFormData((prev) => ({ 
      ...prev, 
      materials: [...prev.materials, { name: "", share: 0 }] 
    }));
  };

  const normalizeMaterialShares = () => {
    const namedMaterials = getNamedMaterials();
    if (namedMaterials.length === 0) return;
    
    const currentTotal = getTotalShare();
    if (currentTotal === 0) {
      // If all shares are 0, distribute evenly
      const equalShare = Math.round((100 / namedMaterials.length) * 100) / 100;
      const remainder = 100 - (equalShare * namedMaterials.length);
      
      const newMaterials = formData.materials.map((material, index) => {
        if (material.name.trim()) {
          const isFirst = index === formData.materials.findIndex(m => m.name.trim());
          return { ...material, share: isFirst ? equalShare + remainder : equalShare };
        }
        return material;
      });
      
      setFormData((prev) => ({ ...prev, materials: newMaterials }));
    } else {
      // Proportionally scale existing shares to total 100%
      const scaleFactor = 100 / currentTotal;
      const newMaterials = formData.materials.map((material) => {
        if (material.name.trim()) {
          return { ...material, share: Math.round(material.share * scaleFactor * 100) / 100 };
        }
        return material;
      });
      
      setFormData((prev) => ({ ...prev, materials: newMaterials }));
    }
  };

  const removeMaterial = (index: number) => {
    const newMaterials = formData.materials.filter((_, i) => i !== index);
    setFormData((prev) => ({ ...prev, materials: newMaterials }));
  };

  const getNamedMaterials = () => formData.materials.filter((m) => m.name && m.name.trim());
  const getTotalShare = () => {
    const named = getNamedMaterials();
    return named.reduce((sum, mat) => sum + mat.share, 0);
  };

  const handleSave = async () => {
    const namedMaterials = getNamedMaterials();
    const totalShare = getTotalShare();
    // Enforce 100% only if materials were provided
    if (namedMaterials.length > 0 && Math.abs(totalShare - 100) > 0.01) {
      // Clear success message and show error
      setSuccessMessage("");
      setApiErrorMessage(`Material shares must total exactly 100% (currently ${totalShare.toFixed(1)}%). Please adjust the percentages before creating.`);
      return;
    }

    const payload = {
      ...formData,
      manufacturerId: getParticipantId(),
      materials: namedMaterials,
    };

    setIsLoading(true);
    try {
      await createCatalogPart(mapPartInstanceToApiPartData(payload as PartType));
      // Clear any existing error message first
      setApiErrorMessage("");
      setSuccessMessage("Catalog part created successfully.");
      setTimeout(() => {
        setSuccessMessage("");
        onSave?.({ part: payload as PartType });
        onClose();
        setIsLoading(false);
      }, 3000);
    } catch (error: unknown) {
      setIsLoading(false);
      console.error("Error creating catalog part:", error);
      let errorMessage = "Failed to create catalog part.";
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'object' && error !== null && 'response' in error) {
        const axiosError = error as { response?: { data?: unknown } };
        if (axiosError.response?.data) {
          errorMessage = JSON.stringify(axiosError.response.data);
        }
      }
      setApiErrorMessage(errorMessage);
      // Ensure the error is visible by scrolling to the top of the dialog content
      setTimeout(() => {
        contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      }, 0);
    }
  };

  return (
    <Dialog 
      open={open} 
      maxWidth={false}
      fullWidth
      PaperProps={{
        sx: {
          backgroundColor: 'background.paper',
          width: '95vw',
          height: '95vh',
          maxWidth: '95vw',
          maxHeight: '95vh',
          '& .MuiDialogContent-root': {
            backgroundColor: 'background.paper',
          }
        }
      }}
    >
      <DialogTitle 
        sx={{ 
          m: 0, 
          p: 3,
          backgroundColor: 'primary.main',
          color: 'primary.contrastText',
          fontSize: '1.25rem',
          fontWeight: 600
        }}
      >
        Create New Catalog Part
      </DialogTitle>
      
      <DialogContent ref={contentRef} sx={{ 
        p: 3, 
        backgroundColor: 'background.paper',
        overflow: 'auto',
        '& .MuiTextField-root': {
          backgroundColor: 'background.default',
          '& .MuiOutlinedInput-root': {
            backgroundColor: 'background.default',
            '& fieldset': {
              borderColor: 'divider',
            },
            '&:hover fieldset': {
              borderColor: 'primary.main',
            },
            '&.Mui-focused fieldset': {
              borderColor: 'primary.main',
            }
          },
          '& .MuiInputLabel-root': {
            backgroundColor: 'background.default',
            padding: '0 8px',
            '&.Mui-focused': {
              color: 'primary.main',
            },
            '&.MuiInputLabel-shrink': {
              backgroundColor: 'background.default',
              padding: '0 8px',
              transform: 'translate(14px, -9px) scale(0.75)',
            }
          }
        }
      }}>
        {/* Top-of-dialog alerts - Only show one at a time */}
        {apiErrorMessage && !successMessage && (
          <Alert 
            severity="error" 
            variant="filled" 
            onClose={() => setApiErrorMessage("")}
            sx={{ mb: 2, mt: 2, position: 'sticky', top: 0, zIndex: 99999 }}
          >
            {apiErrorMessage}
          </Alert>
        )}
        {successMessage && (
          <Alert 
            severity="success" 
            variant="filled" 
            onClose={() => setSuccessMessage("")}
            sx={{ mb: 2, mt: 2, position: 'sticky', top: 0, zIndex: 99999 }}
          >
            {successMessage}
          </Alert>
        )}

        <Grid2 container spacing={4}>
          {/* Manufacturer Info as Chips */}
          <Grid2 size={12}>
            <Box sx={{ 
              display: 'flex', 
              flexWrap: 'wrap', 
              gap: 1.5,
              mt: 2
            }}>
              <Chip
                icon={<BusinessIcon sx={{color: "black!important"}}/>}
                label={`Your Manufacturer ID: ${manufacturerId}`}
                variant="filled"
                color="secondary"
                size="medium"
                sx={{
                  backgroundColor: 'secondary.main',
                  color: 'secondary.contrastText',
                  maxWidth: '100%',
                  '& .MuiChip-label': {
                    fontSize: '0.875rem',
                    px: 1,
                    fontWeight: 500,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    maxWidth: '300px'
                  }
                }}
              />
            </Box>
          </Grid2>

          {/* Basic Information */}
          <Grid2 size={12}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <DescriptionIcon color="primary" />
              <Typography variant="h6" sx={{ 
                color: 'text.primary',
                fontSize: '1.1rem',
                fontWeight: 500
              }}>
                Basic Information
              </Typography>
            </Box>
          </Grid2>

          <Grid2 size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Manufacturer Part ID"
              value={formData.manufacturerPartId}
              onChange={(e) => handleChange("manufacturerPartId", e.target.value)}
              fullWidth
              required
              variant="outlined"
              size="medium"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <TagIcon color="action" />
                  </InputAdornment>
                ),
              }}
            />
          </Grid2>
          
          <Grid2 size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Part Name"
              value={formData.name}
              onChange={(e) => handleChange("name", e.target.value)}
              fullWidth
              required
              variant="outlined"
              size="medium"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <DriveFileRenameOutlineIcon color="action" />
                  </InputAdornment>
                ),
              }}
            />
          </Grid2>

          <Grid2 size={12}>
            <TextField
              label="Description"
              value={formData.extraMetadata?.["ichub:description"]}
              onChange={(e) => handleExtraMetadataChange("ichub:description", e.target.value)}
              fullWidth
              multiline
              rows={3}
              variant="outlined"
              size="medium"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start" sx={{ alignSelf: 'flex-start', mt: 2 }}>
                    <DescriptionIcon color="action" />
                  </InputAdornment>
                ),
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  '& textarea': {
                    padding: '16px 14px',
                    lineHeight: 1.5,
                  }
                }
              }}
            />
          </Grid2>

          <Grid2 size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Category"
              value={formData.extraMetadata?.["ichub:category"]}
              onChange={(e) => handleExtraMetadataChange("ichub:category", e.target.value)}
              fullWidth
              variant="outlined"
              size="medium"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <CategoryIcon color="action" />
                  </InputAdornment>
                ),
              }}
            />
          </Grid2>

          <Grid2 size={{ xs: 12, sm: 6 }}>
            <TextField
              label="BPNS"
              value={formData.extraMetadata?.["ichub:bpns"]}
              onChange={(e) => handleExtraMetadataChange("ichub:bpns", e.target.value)}
              fullWidth
              variant="outlined"
              size="medium"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PinDrop color="action" />
                  </InputAdornment>
                ),
              }}
            />
          </Grid2>

          {/* Measurements Section - Now Before Materials */}
          <Grid2 size={12}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 3, mb: 2 }}>
              <StraightenIcon color="primary" />
              <Typography variant="h6" sx={{ 
                color: 'text.primary',
                fontSize: '1.1rem',
                fontWeight: 500
              }}>
                Measurements
              </Typography>
            </Box>
          </Grid2>

          <Grid2 size={{ xs: 6, sm: 3 }}>
            <TextField
              label="Width"
              type="number"
              value={formData.extraMetadata?.["ichub:width"]?.value === 0 ? "" : formData.extraMetadata?.["ichub:width"]?.value || ""}
              onChange={(e) => handleMeasurementChange("ichub:width", "value", e.target.value)}
              fullWidth
              variant="outlined"
              size="medium"
              inputProps={{ min: 0, step: 0.01 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <AspectRatioIcon color="action" />
                  </InputAdornment>
                ),
              }}
            />
          </Grid2>
          <Grid2 size={{ xs: 6, sm: 3 }}>
            <TextField
              select
              label="Width Unit"
              value={formData.extraMetadata?.["ichub:width"]?.unit || LengthUnit.MM}
              onChange={(e) => handleMeasurementChange("ichub:width", "unit", e.target.value)}
              fullWidth
              variant="outlined"
              size="medium"
            >
              {lengthUnits.map((unit) => (
                <MenuItem key={unit} value={unit}>
                  {unit}
                </MenuItem>
              ))}
            </TextField>
          </Grid2>

          <Grid2 size={{ xs: 6, sm: 3 }}>
            <TextField
              label="Height"
              type="number"
              value={formData.extraMetadata?.["ichub:height"]?.value === 0 ? "" : formData.extraMetadata?.["ichub:height"]?.value || ""}
              onChange={(e) => handleMeasurementChange("ichub:height", "value", e.target.value)}
              fullWidth
              variant="outlined"
              size="medium"
              inputProps={{ min: 0, step: 0.01 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <HeightIcon color="action" />
                  </InputAdornment>
                ),
              }}
            />
          </Grid2>
          <Grid2 size={{ xs: 6, sm: 3 }}>
            <TextField
              select
              label="Height Unit"
              value={formData.extraMetadata?.["ichub:height"]?.unit || LengthUnit.MM}
              onChange={(e) => handleMeasurementChange("ichub:height", "unit", e.target.value)}
              fullWidth
              variant="outlined"
              size="medium"
            >
              {lengthUnits.map((unit) => (
                <MenuItem key={unit} value={unit}>
                  {unit}
                </MenuItem>
              ))}
            </TextField>
          </Grid2>

          <Grid2 size={{ xs: 6, sm: 3 }}>
            <TextField
              label="Length"
              type="number"
              value={formData.extraMetadata?.["ichub:length"]?.value === 0 ? "" : formData.extraMetadata?.["ichub:length"]?.value || ""}
              onChange={(e) => handleMeasurementChange("ichub:length", "value", e.target.value)}
              fullWidth
              variant="outlined"
              size="medium"
              inputProps={{ min: 0, step: 0.01 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LinearScaleIcon color="action" />
                  </InputAdornment>
                ),
              }}
            />
          </Grid2>
          <Grid2 size={{ xs: 6, sm: 3 }}>
            <TextField
              select
              label="Length Unit"
              value={formData.extraMetadata?.["ichub:length"]?.unit || LengthUnit.MM}
              onChange={(e) => handleMeasurementChange("ichub:length", "unit", e.target.value)}
              fullWidth
              variant="outlined"
              size="medium"
            >
              {lengthUnits.map((unit) => (
                <MenuItem key={unit} value={unit}>
                  {unit}
                </MenuItem>
              ))}
            </TextField>
          </Grid2>

          <Grid2 size={{ xs: 6, sm: 3 }}>
            <TextField
              label="Weight"
              type="number"
              value={formData.extraMetadata?.["ichub:weight"]?.value === 0 ? "" : formData.extraMetadata?.["ichub:weight"]?.value || ""}
              onChange={(e) => handleMeasurementChange("ichub:weight", "value", e.target.value)}
              fullWidth
              variant="outlined"
              size="medium"
              inputProps={{ min: 0, step: 0.01 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <ScaleIcon color="action" />
                  </InputAdornment>
                ),
              }}
            />
          </Grid2>
          <Grid2 size={{ xs: 6, sm: 3 }}>
            <TextField
              select
              label="Weight Unit"
              value={formData.extraMetadata?.["ichub:weight"]?.unit || WeightUnit.KG}
              onChange={(e) => handleMeasurementChange("ichub:weight", "unit", e.target.value)}
              fullWidth
              variant="outlined"
              size="medium"
            >
              {weightUnits.map((unit) => (
                <MenuItem key={unit} value={unit}>
                  {unit}
                </MenuItem>
              ))}
            </TextField>
          </Grid2>

          {/* Materials Section */}
          <Grid2 size={12}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 4, mb: 2 }}>
              <PaletteIcon color="primary" />
              <Typography variant="h6" sx={{ 
                color: 'text.primary',
                fontSize: '1.1rem',
                fontWeight: 500
              }}>
                Materials
              </Typography>
            </Box>
          </Grid2>

          {/* Materials Form and Pie Chart Side by Side */}
          <Grid2 size={{ xs: 12, md: 8 }}>
            {formData.extraMetadata?.["ichub:materials"]?.map((material, index) => (
              <Box key={index} sx={{ mb: 3, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                <Grid2 container spacing={2} alignItems="center">
                  <Grid2 size={{ xs: 12, sm: 5 }}>
                    <TextField
                      label="Material Name"
                      value={material.name}
                      onChange={(e) => handleMaterialChange(index, "name", e.target.value)}
                      fullWidth
                      required
                      variant="outlined"
                      size="medium"
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <PaletteIcon color="action" />
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid2>
                  
                  {/* Slider next to material name */}
                  <Grid2 size={{ xs: 8, sm: 5 }}>
                    <Box sx={{ px: 1 }}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Share: {material.share.toFixed(1)}%
                      </Typography>
                      <Slider
                        value={material.share}
                        onChange={(_, newValue) => handleMaterialChange(index, "share", newValue as number)}
                        min={0}
                        max={100}
                        step={0.1}
                        valueLabelDisplay="auto"
                        valueLabelFormat={(value) => `${value.toFixed(1)}%`}
                        size="small"
                        sx={{
                          '& .MuiSlider-thumb': {
                            width: 16,
                            height: 16,
                          },
                          '& .MuiSlider-track': {
                            height: 4,
                          },
                          '& .MuiSlider-rail': {
                            height: 4,
                            opacity: 0.3,
                          },
                        }}
                      />
                    </Box>
                  </Grid2>

                  {/* Action buttons */}
                  <Grid2 size={{ xs: 4, sm: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <IconButton
                        onClick={() => setExpandedMaterial(expandedMaterial === index ? null : index)}
                        size="small"
                        color="primary"
                        sx={{ 
                          padding: '4px',
                        }}
                      >
                        {expandedMaterial === index ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                      </IconButton>
                      <IconButton
                        onClick={() => removeMaterial(index)}
                        color="error"
                        size="small"
                        sx={{ padding: '4px' }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </Grid2>
                  
                  {/* Collapsible exact input */}
                  <Grid2 size={12}>
                    <Collapse in={expandedMaterial === index}>
                      <Box sx={{ mt: 1, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                        <TextField
                          label="Exact Share (%)"
                          type="number"
                          value={material.share === 0 ? "" : material.share}
                          onChange={(e) => handleMaterialChange(index, "share", e.target.value)}
                          size="small"
                          variant="outlined"
                          inputProps={{ min: 0, max: 100, step: 0.01 }}
                          sx={{ width: '200px' }}
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <PercentIcon color="action" />
                              </InputAdornment>
                            ),
                          }}
                        />
                        <Typography variant="caption" color="text.secondary" sx={{ ml: 2 }}>
                          Enter precise percentage value
                        </Typography>
                      </Box>
                    </Collapse>
                  </Grid2>
                </Grid2>
              </Box>
            ))}
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 2, flexWrap: 'wrap' }}>
              <Button
                onClick={addMaterial}
                startIcon={<AddIcon />}
                variant="outlined"
                size="small"
              >
                Add Material
              </Button>
              
              {getNamedMaterials().length > 1 && Math.abs(getTotalShare() - 100) > 0.01 && (
                <Button
                  onClick={normalizeMaterialShares}
                  startIcon={<TuneIcon />}
                  variant="outlined"
                  size="small"
                  color="warning"
                  sx={{ fontSize: '0.75rem' }}
                >
                  Auto-adjust to 100%
                </Button>
              )}
              
              <Chip
                label={`Total: ${getTotalShare().toFixed(1)}%`}
                color={getNamedMaterials().length === 0 ? "default" : (Math.abs(getTotalShare() - 100) < 0.01 ? "success" : "warning")}
                variant="filled"
                size="small"
              />
            </Box>
            
            {getNamedMaterials().length > 0 && (
              <Typography 
                variant="caption" 
                color={Math.abs(getTotalShare() - 100) < 0.01 ? "success.main" : "warning.main"}
                sx={{ mt: 1, display: 'block', fontStyle: 'italic' }}
              >
                {Math.abs(getTotalShare() - 100) < 0.01 
                  ? "✓ Perfect! Material shares add up to 100%" 
                  : `Set your desired percentages freely. Total must equal 100% to create the part (currently ${getTotalShare().toFixed(1)}%)`
                }
              </Typography>
            )}
          </Grid2>

          {/* Pie Chart */}
          <Grid2 size={{ xs: 12, md: 4 }}>
            <Paper sx={{ 
              p: 2, 
              backgroundColor: 'background.default',
              borderRadius: 2,
              height: 'fit-content',
              minHeight: '300px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <BarChartIcon color="primary" />
                <Typography variant="h6" sx={{ 
                  color: 'text.primary',
                  fontSize: '1rem',
                  fontWeight: 500
                }}>
                  Material Distribution
                </Typography>
              </Box>
              {formData.materials.some(m => m.name.trim() && m.share > 0) ? (
                <PieChart
                  series={[
                    {
                      data: formData.materials
                        .filter(material => material.name.trim() && material.share > 0)
                        .map((material, index) => ({
                          id: index,
                          value: material.share,
                          label: material.name.trim() || `Material ${index + 1}`,
                        })),
                    },
                  ]}
                  width={280}
                  height={250}
                />
              ) : (
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  height: 250,
                  color: 'text.secondary',
                  textAlign: 'center'
                }}>
                  <Typography variant="body2">
                    Add materials with names and shares to see the distribution chart
                  </Typography>
                </Box>
              )}
            </Paper>
          </Grid2>
        </Grid2>

      </DialogContent>
      
      <DialogActions sx={{ 
        p: 3, 
        backgroundColor: 'background.paper',
        borderTop: '1px solid',
        borderColor: 'divider',
        gap: 2,
        justifyContent: 'flex-end'
      }}>
        <Button 
          onClick={onClose}
          variant="outlined"
          color="primary"
          size="large"
          sx={{
            minWidth: '100px',
            textTransform: 'none',
            fontWeight: 500
          }}
        >
          Cancel
        </Button>
        <Button 
          onClick={handleSave}
          variant="contained"
          color="primary"
          size="large"
          disabled={isLoading || (getNamedMaterials().length > 0 && Math.abs(getTotalShare() - 100) > 0.01)}
          startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : undefined}
          sx={{
            minWidth: '100px',
            textTransform: 'none',
            fontWeight: 500,
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}
        >
          {isLoading ? 'Creating...' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CreateProductListDialog;
