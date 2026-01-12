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
import { scrollToElement } from '@/utils/fieldNavigation';
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
  Autocomplete,
  Tooltip,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import CloseIcon from "@mui/icons-material/Close";
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
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import AspectRatioIcon from "@mui/icons-material/AspectRatio";
import HeightIcon from "@mui/icons-material/Height";
import LinearScaleIcon from "@mui/icons-material/LinearScale";
import { PieChart } from "@mui/x-charts/PieChart";
import { createCatalogPart } from "@/features/industry-core-kit/catalog-management/api";
import {
  PartType,
  WeightUnit,
  LengthUnit,
} from "@/features/industry-core-kit/catalog-management/types/types";
import { mapPartInstanceToApiPartData } from "../../utils/utils";
import { getParticipantId } from '@/services/EnvironmentService';
import { useEscapeDialog } from '@/hooks/useEscapeKey';

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

  const categoryOptions = [
    'Mechanical Component',
    'Electronic Sensor',
    'Body Part'
  ];

  const fieldDescriptions = {
    basicInformation: "Essential identifying information for the catalog part including ID, name, description, category, and manufacturing location.",
    manufacturerPartId: "Unique identifier assigned by the manufacturer to this specific part. This ID should be unique within your organization.",
    name: "Commercial or technical name of the part. This will be displayed as the main identifier in catalogs and listings.",
    description: "Detailed description of the part including its purpose, functionality, and key characteristics. This helps users understand what the part is for.",
    category: "Classification category that groups similar parts together. Select from common categories or create your own custom category.",
    bpns: "Business Partner Number Site - identifies the specific manufacturing location or site where this part is produced.",
    dimensions: "Physical measurements of the part including width, height, length, and weight. These help with compatibility and logistics planning.",
    materials: "Material composition of the part with percentage breakdown. This information is crucial for recycling, compatibility, and regulatory compliance.",
    materialDistribution: "Visual representation of material composition showing the percentage distribution of different materials used in this part.",
    materialName: "Name of the specific material used in this part (e.g., Steel, Aluminum, Plastic, etc.)",
    materialShare: "Percentage or proportion of this material in the overall composition of the part. All material shares should add up to 100%."
  };

  const FieldLabelWithTooltip = ({ label, tooltip }: { label: string; tooltip: string }) => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: '600', color: 'text.primary' }}>
        {label}
      </Typography>
      <Tooltip 
        title={tooltip} 
        arrow 
        placement="top-start"
        sx={{ cursor: 'help' }}
      >
        <InfoOutlinedIcon 
          sx={{ 
            fontSize: '16px', 
            color: 'text.secondary',
            '&:hover': { color: 'primary.main' }
          }} 
        />
      </Tooltip>
    </Box>
  );

  const [formData, setFormData] = useState<Omit<PartType, "status">>({
    manufacturerId: manufacturerId,
    manufacturerPartId: "",
    name: "",
    description: "",
    category: "",
    materials: [],
    bpns: "",
    width: { value: 0, unit: LengthUnit.MM },
    height: { value: 0, unit: LengthUnit.MM },
    length: { value: 0, unit: LengthUnit.MM },
    weight: { value: 0, unit: WeightUnit.KG },
  });

  const [successMessage, setSuccessMessage] = useState("");
  const [apiErrorMessage, setApiErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [expandedMaterial, setExpandedMaterial] = useState<number | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);

  useEscapeDialog(onClose, open);

  useEffect(() => {
    if (open) {
      setFormData({
        manufacturerId: manufacturerId,
        manufacturerPartId: "",
        name: "",
        description: "",
        category: "",
        materials: [],
        bpns: "",
        width: { value: 0, unit: LengthUnit.MM },
        height: { value: 0, unit: LengthUnit.MM },
        length: { value: 0, unit: LengthUnit.MM },
        weight: { value: 0, unit: WeightUnit.KG },
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

  const handleMeasurementChange = (field: "width" | "height" | "length" | "weight", key: "value" | "unit", value: string | number) => {
    setFormData((prev) => ({
      ...prev,
      [field]: { 
        ...prev[field], 
        [key]: key === "value" ? (value === "" || value === null || value === undefined ? 0 : Number(value)) : value 
      },
    }));
  };
  
  const handleMaterialChange = (index: number, key: "name" | "share", value: string | number) => {
    const newMaterials = [...formData.materials];
    
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
    
    setFormData((prev) => ({ ...prev, materials: newMaterials }));
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
        if (contentRef.current) {
          scrollToElement({ container: contentRef.current, focus: false, highlightClass: '', durationMs: 0, block: 'start' });
        }
      }, 0);
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
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
          fontWeight: 600,
          position: 'relative'
        }}
      >
        Create New Catalog Part
      </DialogTitle>
      <IconButton
        aria-label="close"
        onClick={onClose}
        sx={(theme) => ({
          position: 'absolute',
          right: 21,
          top: 21,
          color: theme.palette.primary.contrastText,
          zIndex: 1,
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
          }
        })}
      >
        <CloseIcon />
      </IconButton>
      
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
              <Tooltip title={fieldDescriptions.basicInformation} placement="top">
                <InfoOutlinedIcon fontSize="small" sx={{ color: 'text.secondary', cursor: 'help' }} />
              </Tooltip>
            </Box>
          </Grid2>

          <Grid2 size={{ xs: 12, sm: 6 }}>
            <FieldLabelWithTooltip 
              label="Manufacturer Part ID *" 
              tooltip={fieldDescriptions.manufacturerPartId} 
            />
            <TextField
              value={formData.manufacturerPartId}
              onChange={(e) => handleChange("manufacturerPartId", e.target.value)}
              fullWidth
              required
              variant="outlined"
              size="medium"
              placeholder="Enter unique part identifier"
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
            <FieldLabelWithTooltip 
              label="Part Name *" 
              tooltip={fieldDescriptions.name} 
            />
            <TextField
              value={formData.name}
              onChange={(e) => handleChange("name", e.target.value)}
              fullWidth
              required
              variant="outlined"
              size="medium"
              placeholder="Enter part name"
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
            <FieldLabelWithTooltip 
              label="Description" 
              tooltip={fieldDescriptions.description} 
            />
            <TextField
              value={formData.description}
              onChange={(e) => handleChange("description", e.target.value)}
              fullWidth
              multiline
              rows={3}
              variant="outlined"
              size="medium"
              placeholder="Describe the part's purpose, functionality, and key characteristics"
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
            <FieldLabelWithTooltip 
              label="Category" 
              tooltip={fieldDescriptions.category} 
            />
            <Autocomplete
              options={categoryOptions}
              value={formData.category}
              onChange={(_, newValue) => handleChange("category", newValue || "")}
              freeSolo
              fullWidth
              renderInput={(params) => (
                <TextField
                  {...params}
                  variant="outlined"
                  size="medium"
                  placeholder="Select or enter a category"
                  InputProps={{
                    ...params.InputProps,
                    startAdornment: (
                      <>
                        <InputAdornment position="start">
                          <CategoryIcon color="action" />
                        </InputAdornment>
                        {params.InputProps.startAdornment}
                      </>
                    ),
                  }}
                />
              )}
              sx={{
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
                }
              }}
            />
          </Grid2>

          <Grid2 size={{ xs: 12, sm: 6 }}>
            <FieldLabelWithTooltip 
              label="BPNS" 
              tooltip={fieldDescriptions.bpns} 
            />
            <TextField
              value={formData.bpns}
              onChange={(e) => handleChange("bpns", e.target.value)}
              fullWidth
              variant="outlined"
              size="medium"
              placeholder="Business Partner Number Site"
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
              <Tooltip 
                title={fieldDescriptions.dimensions} 
                arrow 
                placement="top-start"
                sx={{ cursor: 'help' }}
              >
                <InfoOutlinedIcon 
                  sx={{ 
                    fontSize: '18px', 
                    color: 'text.secondary',
                    '&:hover': { color: 'primary.main' }
                  }} 
                />
              </Tooltip>
            </Box>
          </Grid2>

          <Grid2 size={{ xs: 6, sm: 3 }}>
            <TextField
              label="Width"
              type="number"
              value={formData.width?.value === 0 ? "" : formData.width?.value || ""}
              onChange={(e) => handleMeasurementChange("width", "value", e.target.value)}
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
              value={formData.width?.unit || LengthUnit.MM}
              onChange={(e) => handleMeasurementChange("width", "unit", e.target.value)}
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
              value={formData.height?.value === 0 ? "" : formData.height?.value || ""}
              onChange={(e) => handleMeasurementChange("height", "value", e.target.value)}
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
              value={formData.height?.unit || LengthUnit.MM}
              onChange={(e) => handleMeasurementChange("height", "unit", e.target.value)}
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
              value={formData.length?.value === 0 ? "" : formData.length?.value || ""}
              onChange={(e) => handleMeasurementChange("length", "value", e.target.value)}
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
              value={formData.length?.unit || LengthUnit.MM}
              onChange={(e) => handleMeasurementChange("length", "unit", e.target.value)}
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
              value={formData.weight?.value === 0 ? "" : formData.weight?.value || ""}
              onChange={(e) => handleMeasurementChange("weight", "value", e.target.value)}
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
              value={formData.weight?.unit || WeightUnit.KG}
              onChange={(e) => handleMeasurementChange("weight", "unit", e.target.value)}
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
              <Tooltip title={fieldDescriptions.materials} placement="top">
                <InfoOutlinedIcon fontSize="small" sx={{ color: 'text.secondary', cursor: 'help' }} />
              </Tooltip>
            </Box>
          </Grid2>

          {/* Materials Form and Pie Chart Side by Side */}
          <Grid2 size={{ xs: 12, md: 8 }}>
            {formData.materials.map((material, index) => (
              <Box key={index} sx={{ mb: 3, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                <Grid2 container spacing={2} alignItems="center">
                  <Grid2 size={{ xs: 12, sm: 5 }}>
                    <TextField
                      label={<FieldLabelWithTooltip label="Material Name" tooltip={fieldDescriptions.materialName} />}
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
                          label={<FieldLabelWithTooltip label="Exact Share (%)" tooltip={fieldDescriptions.materialShare} />}
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
                <Tooltip title={fieldDescriptions.materialDistribution} placement="top">
                  <InfoOutlinedIcon fontSize="small" sx={{ color: 'text.secondary', cursor: 'help' }} />
                </Tooltip>
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