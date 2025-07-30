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
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import { createCatalogPart } from "../../api";
import {
  PartType,
  Unit,
  Measurement,
  Material,
} from "../../../../types/product";
import { mapPartInstanceToApiPartData } from "../../../catalog-management/utils";
import { getParticipantId } from "../../../../services/EnvironmentService";

// Define props for ProductListDialog
interface ProductListDialogProps {
  open: boolean;
  onClose: () => void;
  onSave?: (data: { jsonContent: string }) => void;
  productListJson?: string; // Initial JSON content for editing
}

const initialJsonPlaceholder = JSON.stringify(
  {
    manufacturerId: "<<Your Manufacturer ID>>",
    manufacturerPartId: "<<Your Manufacturer Part ID>>",
    name: "<<Your Part Name>>",
    extraMetadata: {
      "ichub:description": "<<Your Part Description>>",
      "ichub:category": "<<Your Part Category>>",
      "ichub:materials": [
        { name: "Aluminum", share: 80 },
        { name: "Rubber", share: 20 }
      ],
      "ichub:bpns": "BPNS0000000000ZZ",
      "ichub:width": { value: 200, unit: Unit.MM },
      "ichub:height": { value: 100, unit: Unit.MM },
      "ichub:length": { value: 50, unit: Unit.MM },
      "ichub:weight": { value: 5, unit: Unit.KG }
    },
  } as Omit<PartType, "status">, // Use Omit to exclude status from placeholder type
  null,
  2
);

const CreateProductListDialog = ({
  open,
  onClose,
  onSave,
  productListJson,
}: ProductListDialogProps) => {
  const [jsonContent, setJsonContent] = useState("");
  const [isEmptyError, setIsEmptyError] = useState(false);
  const [jsonValidationError, setJsonValidationError] = useState<string | null>(
    null
  );
  const [successMessage, setSuccessMessage] = useState("");
  const [apiErrorMessage, setApiErrorMessage] = useState(""); // Kept for potential future API errors

  useEffect(() => {
    if (open) {
      setJsonContent(productListJson || initialJsonPlaceholder);
      setIsEmptyError(false);
      setJsonValidationError(null);
      setSuccessMessage("");
      setApiErrorMessage("");
    }
  }, [productListJson, open]);

  const isValidJson = (str: string): string | null => {
    try {
      JSON.parse(str);
    } catch (e) {
      if (e instanceof Error) {
        return e.message;
      }
      return "Invalid JSON format.";
    }
    return null;
  };

  const validatePartInstanceStructure = (obj: unknown): string => {
    if (typeof obj !== "object" || obj === null) {
      return "Data must be an object.";
    }
    const data = obj as Partial<Omit<PartType, "status">>; // Validate against structure without status

    const errors: string[] = [];

    if (typeof data.manufacturerPartId !== "string" || !data.manufacturerPartId) {
      errors.push("manufacturerPartId (non-empty string) is required.");
    } else if (/\s/.test(data.manufacturerPartId)) {
      errors.push("manufacturerPartId must not contain spaces.");
    }
    if (typeof data.name !== "string" || !data.name)
      errors.push("name (non-empty string) is required.");

    const extraMetadata = data.extraMetadata || {};

    if (
      extraMetadata["ichub:description"] !== undefined &&
      extraMetadata["ichub:description"] !== null &&
      typeof extraMetadata["ichub:description"] !== "string"
    )
      errors.push("description must be a string if provided.");

    if (
      extraMetadata["ichub:category"] !== undefined &&
      extraMetadata["ichub:category"] !== null &&
      typeof extraMetadata["ichub:category"] !== "string"
    )
      errors.push("category must be a string if provided.");

    if (
      extraMetadata["ichub:bpns"] !== undefined &&
      extraMetadata["ichub:bpns"] !== null &&
      typeof extraMetadata["ichub:bpns"] !== "string"
    )
      errors.push("bpns must be a string if provided.");

    if (!Array.isArray(data.extraMetadata?.["ichub:materials"])) {
      errors.push("materials (array) is required.");
    } else {
      data.extraMetadata["ichub:materials"].forEach((mat, index) => {
        if (typeof mat !== "object" || mat === null) {
          errors.push(`materials[${index}] must be an object.`);
        } else {
          const material = mat as Material;
          if (typeof material.name !== "string" || !material.name)
            errors.push(
              `materials[${index}].name (non-empty string) is required.`
            );
          if (
            typeof material.share !== "number" ||
            material.share < 0 ||
            material.share > 100
          )
            errors.push(
              `materials[${index}].share (number between 0-100) is required.`
            );
        }
      });
    }

    const checkMeasurement = (
      m: Measurement | undefined | null,
      fieldName: string
    ) => {
      if (m === undefined || m === null) return; // Optional field
      if (typeof m !== "object") {
        errors.push(`${fieldName} must be an object if provided.`);
        return;
      }
      if (typeof m.value !== "number")
        errors.push(`${fieldName}.value (number) is required.`);
      if (m.unit === undefined || !Object.values(Unit).includes(m.unit as Unit))
        errors.push(
          `${fieldName}.unit must be a valid Unit (${Object.values(Unit).join(
            ", "
          )}).`
        );
    };

    checkMeasurement(data.extraMetadata?.['ichub:width'], "width");
    checkMeasurement(data.extraMetadata?.['ichub:height'], "height");
    checkMeasurement(data.extraMetadata?.['ichub:length'], "length");
    checkMeasurement(data.extraMetadata?.['ichub:weight'], "weight");

    // Check for unexpected properties (optional, for stricter validation)
    // TODO: needs adjustment when backend API is cleaned up from deprecated fields
    const allowedKeys: Set<keyof Omit<PartType, "status">> = new Set([
      // Exclude status
      "manufacturerPartId",
      "name",
      "extraMetadata",
    ]);
    for (const key in data) {
      if (!allowedKeys.has(key as keyof Omit<PartType, "status">)) {
        errors.push(`Unexpected property: ${key}.`);
      }
    }

    return errors.join(" ");
  };

  const handleSave = async () => {
    if (!jsonContent.trim()) {
      setIsEmptyError(true);
      setJsonValidationError(null);
      setApiErrorMessage("");
      return;
    }
    setIsEmptyError(false);

    const currentJsonError = isValidJson(jsonContent);
    if (currentJsonError) {
      setJsonValidationError(currentJsonError);
      setApiErrorMessage("");
      return;
    }
    setJsonValidationError(null);
    setApiErrorMessage("");

    let parsedPayload;
    try {
      parsedPayload = JSON.parse(jsonContent.trim());
    } catch (e) {
      setJsonValidationError(
        "Invalid JSON structure: Could not parse. " +
          (e instanceof Error ? e.message : String(e))
      );
      return;
    }

    // Validate structure against PartInstance model
    const structureValidationError =
      validatePartInstanceStructure(parsedPayload);
    if (structureValidationError) {
      setJsonValidationError(
        `Data validation failed: ${structureValidationError}`
      );
      return;
    }

    parsedPayload["manufacturerId"] = getParticipantId()

    // API call for creating catalog part
    try {
      // POST to /part-management/catalog-part
      await createCatalogPart(
        mapPartInstanceToApiPartData(parsedPayload as PartType)
      );
      setSuccessMessage(`Catalog part created successfully.`);
      setTimeout(() => {
        setSuccessMessage("");
        onSave?.({ jsonContent: jsonContent.trim() });
        onClose();
      }, 3000);
    } catch (axiosError) {
      console.error(`Error creating catalog part:`, axiosError);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let errorMessage = (axiosError as any).message || `Failed to create catalog part.`;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const errorResponse = (axiosError as any).response;

      if (errorResponse) {
        if (
          errorResponse.status === 422 &&
          errorResponse.data &&
          errorResponse.data.detail &&
          Array.isArray(errorResponse.data.detail) &&
          errorResponse.data.detail.length > 0
        ) {
          errorMessage =
            errorResponse.data.detail[0].msg ||
            JSON.stringify(errorResponse.data.detail[0]) ||
            "Validation failed.";
        } else if (errorResponse.data && errorResponse.data.message) {
          errorMessage = errorResponse.data.message;
        } else if (errorResponse.data) {
          errorMessage = JSON.stringify(errorResponse.data);
        }
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
        <Typography variant="body2" gutterBottom sx={{color: "white"}}>
          Use the placeholder below to define the new catalog part. Please
          ensure the JSON is valid.
        </Typography>
         <TextField
            label="manufacturerId"
            variant="outlined"
            size="small"
            fullWidth
            sx={{ marginBottom: '16px' }}
            value={getParticipantId()}
            disabled={true}
          />
        <Box sx={{ mt: 2, width: "100%" }}>
          <TextField
            label="Catalog Part JSON"
            variant="outlined"
            size="small"
            multiline
            rows={20}
            error={isEmptyError || !!jsonValidationError}
            helperText={
              (isEmptyError && "JSON content cannot be empty.") ||
              (jsonValidationError && `Invalid JSON: ${jsonValidationError}`) ||
              ""
            }
            fullWidth
            sx={{
              marginBottom: "16px",
              fontFamily: "monospace",
              fontSize: "0.875rem",
              ".MuiInputBase-input": {
                fontFamily: "monospace",
              },
            }}
            value={jsonContent}
            onChange={(e) => {
              setJsonContent(e.target.value);
              if (isEmptyError) setIsEmptyError(false);
              if (jsonValidationError) setJsonValidationError(null);
            }}
          />
        </Box>
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
