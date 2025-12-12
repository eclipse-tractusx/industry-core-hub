/********************************************************************************
 * Eclipse Tractus-X - Industry Core Hub Frontend
 *
 * Copyright (c) 2025 LKS Next
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

import React, { useRef, useImperativeHandle, forwardRef, useState, useMemo, useEffect } from 'react';
import {
    Box,
    Typography,
    TextField,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    FormHelperText,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Chip,
    Switch,
    FormControlLabel,
    Button,
    IconButton,
    Card,
    CardContent,
    Collapse
} from '@mui/material';
import CustomTooltip from './CustomTooltip';
import {
    ExpandMore as ExpandMoreIcon,
    Info as InfoIcon,
    CalendarToday as CalendarTodayIcon,
    Add as AddIcon,
    Delete as DeleteIcon,
    DragIndicator as DragIndicatorIcon,
    Fingerprint as FingerprintIcon
} from '@mui/icons-material';
import { SchemaDefinition } from '../../schemas';
import { FormField as BaseFormField } from '../../schemas/json-schema-interpreter';

// Extend FormField to allow urn property for UI logic
type FormField = BaseFormField & { urn?: string };
import { getValueByPath, setValueByPath } from './objectPathUtils';
import { scrollToElement } from '../../utils/fieldNavigation';
import '../../styles/fieldNavigation.css';

// For backwards compatibility, use FormField as DPPFormField
type DPPFormField = FormField;

export interface DynamicFormProps {
    onlyRequired?: boolean;
    schema: SchemaDefinition;
    data: any;
    onChange: (data: any, changedFieldKey?: string) => void;
    errors: string[];
    fieldErrors?: Set<string>; // Fields that have validation errors
    focusedField?: string | null; // Currently focused field
    onFieldFocus?: (fieldKey: string) => void; // Callback when field is focused
    onFieldBlur?: () => void; // Callback when field loses focus
    onInfoIconClick?: (fieldKey: string) => void; // Callback when info icon is clicked
}

interface DynamicFormRef {
    scrollToField: (fieldKey: string) => void;
}

const DynamicForm = forwardRef<DynamicFormRef, DynamicFormProps>(({
    schema,
    data,
    onChange,
    errors,
    fieldErrors = new Set(),
    focusedField = null,
    onFieldFocus,
    onFieldBlur,
    onInfoIconClick,
    onlyRequired
}, ref) => {
    // Recursively filter required fields if onlyRequired is true
    function filterRequiredFields(fields: FormField[]): FormField[] {
        return fields
            .filter(field => field.required)
            .map(field => {
                // For objects with nested fields
                if (field.type === 'object' && Array.isArray(field.objectFields)) {
                    return {
                        ...field,
                        objectFields: filterRequiredFields(field.objectFields)
                    };
                }
                // For arrays with item fields
                if (field.type === 'array' && Array.isArray(field.itemFields)) {
                    return {
                        ...field,
                        itemFields: filterRequiredFields(field.itemFields)
                    };
                }
                return field;
            })
            .filter(field => {
                // Remove empty objects/arrays
                if (field.type === 'object' && Array.isArray(field.objectFields) && field.objectFields.length === 0) return false;
                if (field.type === 'array' && Array.isArray(field.itemFields) && field.itemFields.length === 0) return false;
                return true;
            });
    }

    let formFields = schema.formFields as FormField[];
    if (typeof onlyRequired === 'boolean' && onlyRequired) {
        formFields = filterRequiredFields(formFields);
    }
    const fieldRefs = useRef<Record<string, any>>({});
    const accordionRefs = useRef<Record<string, any>>({});
    const containerRef = useRef<HTMLDivElement>(null);
    
    // State to control which main section is expanded (only one at a time, all collapsed by default)
    const [expandedPanel, setExpandedPanel] = useState<string | null>(null);

    // Group fields by section using comprehensive interpreter data
    const groupedFields = formFields.reduce((acc, field) => {
        if (!acc[field.section]) {
            acc[field.section] = [];
        }
        acc[field.section].push(field);
        return acc;
    }, {} as Record<string, FormField[]>);

    // Create hierarchical structure for nested fields
    interface FieldNode {
        field?: FormField;
        children: Record<string, FieldNode>;
        path: string;
        isLeaf: boolean;
    }

    const createFieldHierarchy = (fields: FormField[]): Record<string, FieldNode> => {
        const root: Record<string, FieldNode> = {};

        fields.forEach(field => {
            const pathParts = field.key.split('.');
            let current = root;
            let currentPath = '';

            pathParts.forEach((part, index) => {
                currentPath = currentPath ? `${currentPath}.${part}` : part;
                
                if (!current[part]) {
                    current[part] = {
                        children: {},
                        path: currentPath,
                        isLeaf: index === pathParts.length - 1
                    };
                }

                if (index === pathParts.length - 1) {
                    // This is the leaf node, attach the field
                    current[part].field = field;
                    current[part].isLeaf = true;
                } else {
                    // This is an intermediate node
                    current[part].isLeaf = false;
                }

                current = current[part].children;
            });
        });

        return root;
    };

    // Get user-friendly section name
    const getSectionDisplayName = (sectionName: string): string => {
        const sectionNames: Record<string, string> = {
            'Product Identifier': 'Product Identifier',
            'Product Description': 'Product Description',
            'Manufacturing Information': 'Manufacturing Information',
            'Sustainability': 'Sustainability',
            'Compliance': 'Compliance',
            'Additional Information': 'Additional Information'
        };
        return sectionNames[sectionName] || sectionName.replace(/([A-Z])/g, ' $1').trim();
    };

    // Find which section contains a field
    const findFieldSection = (fieldKey: string): string | null => {
        for (const [sectionName, sectionFields] of Object.entries(groupedFields)) {
            if (sectionFields.some(field => field.key === fieldKey)) {
                return sectionName;
            }
        }
        return null;
    };

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
        scrollToField: (fieldKey: string) => {
            // First, find and expand the section containing this field
            const sectionName = findFieldSection(fieldKey);
            const performScroll = () => {
                const element = fieldRefs.current[fieldKey] as HTMLElement | null;
                if (!element) return;
                // Use centralized helper: scroll, focus (if input), and highlight (3s)
                scrollToElement({ element, container: containerRef.current, focus: true, highlightClass: 'field-nav-highlight', durationMs: 3000, block: 'center' });
            };

            if (sectionName && expandedPanel !== sectionName) {
                setExpandedPanel(sectionName);
                // Wait for expansion animation to complete before scrolling. Use a short delay to allow render.
                setTimeout(() => performScroll(), 320);
            } else {
                performScroll();
            }
        }
    }));

    const handleFieldChange = (field: FormField, value: any) => {
        const newData = setValueByPath(data, field.key, value);
        onChange(newData, field.key); // Pass the field key that changed
    };

    // Precompute error states for all fields
    type ErrorState = { hasError: boolean; errorMessages: string[] };
    const errorStateMap: Record<string, ErrorState> = {};
    for (const sectionFields of Object.values(groupedFields)) {
        for (const field of sectionFields) {
            const hasPersistedError = fieldErrors.has(field.key);
            if (!hasPersistedError || errors.length === 0) {
                errorStateMap[field.key] = { hasError: false, errorMessages: [] };
                continue;
            }
            const fieldKey = field.key;
            const fieldLabel = field.label;
            const keyParts = fieldKey.split('.')
            const lastKeyPart = keyParts[keyParts.length - 1];
            // Collect all errors for this field
            const matchedErrors = errors.filter(error => {
                const errorLower = error.toLowerCase();
                const fieldKeyLower = fieldKey.toLowerCase();
                if (error.includes(`'${fieldKey}'`) || error.includes(`"${fieldKey}"`)) return true;
                if (errorLower.includes(fieldKeyLower)) {
                    const regex = new RegExp(`\\b${fieldKeyLower.replace(/\\./g, '\\.')}\\b`);
                    if (regex.test(errorLower)) return true;
                }
                if (error.includes(`'${fieldLabel}'`) || error.includes(`"${fieldLabel}"`)) return true;
                if (keyParts.length > 1 && errorLower.includes(lastKeyPart.toLowerCase())) {
                    const hasContextMatch = keyParts.slice(0, -1).some(part => errorLower.includes(part.toLowerCase()));
                    if (hasContextMatch) return true;
                }
                return false;
            });
            // Format all error messages for display
            const formattedMessages = matchedErrors.map(msg => {
                let formatted = msg
                    .replace(new RegExp(`'${fieldKey}'`, 'gi'), '')
                    .replace(new RegExp(`"${fieldKey}"`, 'gi'), '')
                    .replace(new RegExp(`'${fieldLabel}'`, 'gi'), '')
                    .replace(new RegExp(`"${fieldLabel}"`, 'gi'), '')
                    .replace(/\s{2,}/g, ' ')
                    .trim();
                if (formatted && formatted.length > 0) {
                    formatted = formatted.charAt(0).toUpperCase() + formatted.slice(1);
                }
                return formatted;
            });
            errorStateMap[field.key] = {
                hasError: formattedMessages.length > 0,
                errorMessages: formattedMessages
            };
        }
    }

    // Common description tooltip with info icon click
    // Show info icon with combined tooltip (description + URN if present)
    const getDescriptionTooltip = (description?: string, fieldKey?: string, urn?: string): React.ReactElement | null => {
        if (!description && !urn) return null;
        return (
            <CustomTooltip title="Description" description={description} urn={urn}>
                <InfoIcon
                    sx={{
                        fontSize: 16,
                        color: 'text.secondary',
                        cursor: 'pointer',
                        opacity: 1
                    }}
                    onClick={fieldKey && onInfoIconClick ? (e) => { e.stopPropagation(); onInfoIconClick(fieldKey); } : undefined}
                />
            </CustomTooltip>
        );
    };

    // Icon container: right outside the field, show icons only if present
    // Only show info icon with combined tooltip (description + URN)
    const getIconContainer = (description?: string, fieldKey?: string, urn?: string) => {
        if (!description && !urn) return null;
        const tooltip = getDescriptionTooltip(description, fieldKey, urn);
        if (!tooltip) return null;
        return (
            <Box sx={{
                display: 'flex',
                alignItems: 'center',
                ml: 1.5,
                gap: 0.5
            }}>
                {tooltip && tooltip}
            </Box>
        );
    };

    const renderField = (field: FormField) => {
        const currentValue = getValueByPath(data, field.key) || '';
        const hasPersistedError = fieldErrors.has(field.key);
        const isFieldFocused = focusedField === field.key;
        const { hasError, errorMessages } = errorStateMap[field.key] || { hasError: false, errorMessages: [] };

        // Check if field is required and empty for additional visual feedback
        const isRequiredAndEmpty = field.required && 
            (!currentValue || currentValue === '' || 
             (Array.isArray(currentValue) && currentValue.length === 0));

        // Nueva función: Maneja etiquetas con asteriscos para campos requeridos
        const getFieldLabel = (label: string, isRequired: boolean = false) => {
            // Limpiar asteriscos existentes primero
            const cleanLabel = label.replace(/(\s*\*\s*)+$/, '').trim();
            // Agregar asterisco solo si es requerido
            return isRequired ? `${cleanLabel} *` : cleanLabel;
        };

        // Función actualizada: Separar styling de errores reales vs campos requeridos
        const getFieldStyles = (required: boolean, isEmpty: boolean = false, hasError: boolean = false) => ({
            '& .MuiOutlinedInput-root, & .MuiInputBase-root, & .MuiSelect-root': {
                backgroundColor: 'rgba(19, 19, 19, 0.02)',
                // Hover should affect the visible outline for both OutlinedInput and Selects
                '&:hover fieldset, &:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(96, 165, 250, 0.5)',
                },
                '&.Mui-focused fieldset, &.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: hasError ? 'error.main' : 'primary.main',
                },
                // Borde rojo solo para errores reales, no solo por ser requerido
                ...(hasError && {
                    '& fieldset, & .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'error.main',
                        borderWidth: '2px',
                    }
                })
            },
            '& .MuiInputLabel-root': {
                color: hasError ? 'error.main' : 'text.secondary',
                '&.Mui-focused': {
                    color: hasError ? 'error.main' : 'primary.main',
                }
            }
        });

        // Función para FormControl labels
        const getFormControlLabelStyles = (isRequired: boolean, hasError: boolean = false) => ({
            color: hasError ? 'error.main' : 'text.secondary',
            '&.Mui-focused': {
                color: hasError ? 'error.main' : 'primary.main',
            }
        });

        switch (field.type) {
            case 'text':
                return (
                    <Box key={field.key} sx={{ display: 'flex', alignItems: 'center' }}>
                        <TextField
                            fullWidth={false}
                            label={getFieldLabel(field.label, field.required)}
                            value={currentValue}
                            onChange={(e) => handleFieldChange(field, e.target.value)}
                            onFocus={() => onFieldFocus?.(field.key)}
                            onBlur={() => onFieldBlur?.()}
                            placeholder={field.placeholder}
                            error={hasError}
                            helperText={hasError && isFieldFocused && errorMessages.length > 0 ? (
                                <span>{errorMessages.map((msg, i) => <div key={i}>{msg}</div>)}</span>
                            ) : undefined}
                            variant="outlined"
                            size="small"
                            sx={{ ...getFieldStyles(field.required, isRequiredAndEmpty, hasError), flex: 1, minWidth: 0, maxWidth: 'calc(100% - 32px)' }}
                        />
                        {getIconContainer(field.description, field.key, field.urn)}
                    </Box>
                );

            case 'textarea':
                return (
                    <Box key={field.key} sx={{ display: 'flex', alignItems: 'center' }}>
                        <TextField
                            fullWidth={false}
                            multiline
                            maxRows={4}
                            label={getFieldLabel(field.label, field.required)}
                            value={currentValue}
                            onChange={(e) => handleFieldChange(field, e.target.value)}
                            onFocus={() => onFieldFocus?.(field.key)}
                            onBlur={() => onFieldBlur?.()}
                            placeholder={field.placeholder}
                            error={hasError}
                            helperText={hasError && isFieldFocused && errorMessages.length > 0 ? (
                                <span>{errorMessages.map((msg, i) => <div key={i}>{msg}</div>)}</span>
                            ) : undefined}
                            variant="outlined"
                            size="small"
                            sx={{ ...getFieldStyles(field.required, isRequiredAndEmpty, hasError), flex: 1, minWidth: 0, maxWidth: 'calc(100% - 32px)' }}
                        />
                        {getIconContainer(field.description, field.key, field.urn)}
                    </Box>
                );

            case 'number':
                return (
                    <Box key={field.key} sx={{ display: 'flex', alignItems: 'center' }}>
                        <TextField
                            fullWidth={false}
                            type="number"
                            label={getFieldLabel(field.label, field.required)}
                            value={currentValue}
                            onChange={(e) => handleFieldChange(field, e.target.value)}
                            onFocus={() => onFieldFocus?.(field.key)}
                            onBlur={() => onFieldBlur?.()}
                            placeholder={field.placeholder}
                            error={hasError}
                            helperText={hasError && isFieldFocused && errorMessages.length > 0 ? (
                                <span>{errorMessages.map((msg, i) => <div key={i}>{msg}</div>)}</span>
                            ) : undefined}
                            variant="outlined"
                            size="small"
                            sx={{ ...getFieldStyles(field.required, isRequiredAndEmpty, hasError), flex: 1, minWidth: 0, maxWidth: 'calc(100% - 32px)' }}
                        />
                        {getIconContainer(field.description, field.key, field.urn)}
                    </Box>
                );

            case 'date':
                return (
                    <Box key={field.key} sx={{ display: 'flex', alignItems: 'center' }}>
                        <TextField
                            fullWidth={false}
                            type="date"
                            label={getFieldLabel(field.label, field.required)}
                            value={currentValue}
                            onChange={(e) => handleFieldChange(field, e.target.value)}
                            onFocus={() => onFieldFocus?.(field.key)}
                            onBlur={() => onFieldBlur?.()}
                            error={hasError}
                            helperText={hasError && isFieldFocused && errorMessages.length > 0 ? (
                                <span>{errorMessages.map((msg, i) => <div key={i}>{msg}</div>)}</span>
                            ) : undefined}
                            variant="outlined"
                            size="small"
                            InputLabelProps={{
                                shrink: true,
                            }}
                            InputProps={{
                                startAdornment: (
                                    <CalendarTodayIcon 
                                        sx={{ 
                                            fontSize: 20, 
                                            color: '#ffffff',
                                            mr: 1 
                                        }} 
                                    />
                                ),
                            }}
                            sx={{
                                ...getFieldStyles(field.required, isRequiredAndEmpty, hasError),
                                flex: 1,
                                minWidth: 0,
                                maxWidth: 'calc(100% - 32px)',
                                '& input[type="date"]::-webkit-calendar-picker-indicator': {
                                    filter: 'invert(1)',
                                    cursor: 'pointer'
                                }
                            }}
                        />
                        {getIconContainer(field.description, field.key, field.urn)}
                    </Box>
                );

            case 'select':
                return (
                    <Box key={field.key} sx={{ display: 'flex', alignItems: 'center' }}>
                        <FormControl size="small" error={hasError} sx={{ flex: 1, minWidth: 0, maxWidth: 'calc(100% - 32px)' }}>
                            <InputLabel sx={getFormControlLabelStyles(field.required, hasError)}>
                                {getFieldLabel(field.label, field.required)}
                            </InputLabel>
                            <Select
                                value={currentValue || ''}
                                label={getFieldLabel(field.label, field.required)}
                                onChange={(e) => handleFieldChange(field, e.target.value)}
                                onFocus={() => onFieldFocus?.(field.key)}
                                onBlur={() => onFieldBlur?.()}
                                sx={getFieldStyles(field.required, isRequiredAndEmpty, hasError)}
                            >
                                {!field.required && (
                                    <MenuItem value="">
                                        <em>Select {getFieldLabel(field.label, false)}</em>
                                    </MenuItem>
                                )}
                                {field.options?.map((option: { value: string; label: string }) => (
                                    <MenuItem key={option.value} value={option.value}>
                                        {option.label}
                                    </MenuItem>
                                ))}
                            </Select>
                            {hasError && isFieldFocused && errorMessages.length > 0 && (
                                <FormHelperText>
                                    {errorMessages.map((msg, i) => <div key={i}>{msg}</div>)}
                                </FormHelperText>
                            )}
                        </FormControl>
                        {getIconContainer(field.description, field.key, field.urn)}
                    </Box>
                );

            case 'checkbox':
                return (
                    <Box key={field.key} data-boolean={field.key} sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box 
                                onClick={() => handleFieldChange(field, !currentValue)}
                                onFocus={() => onFieldFocus?.(field.key)}
                                onBlur={() => onFieldBlur?.()}
                                tabIndex={0}
                                sx={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'space-between',
                                    width: '100%',
                                    py: 1,
                                    px: 2,
                                    backgroundColor: 'rgba(255, 255, 255, 0.02)',
                                    border: `1px solid ${hasError ? 'rgba(211, 47, 47, 0.5)' : 'rgba(255, 255, 255, 0.12)'}`,
                                    borderRadius: 1,
                                    minHeight: '40px',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease-in-out',
                                    '&:hover': {
                                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                        borderColor: 'rgba(96, 165, 250, 0.5)',
                                    }
                                }}
                            >
                                <Typography variant="body2" sx={{ 
                                    color: hasError ? 'error.main' : 'text.primary' 
                                }}>
                                    {getFieldLabel(field.label, field.required)}
                                </Typography>
                                <Switch
                                    checked={!!currentValue}
                                    onChange={(e) => {
                                        e.stopPropagation(); // Prevent double triggering
                                        handleFieldChange(field, e.target.checked);
                                    }}
                                    sx={{
                                        '& .MuiSwitch-switchBase.Mui-checked': {
                                            color: 'primary.main',
                                        },
                                        '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                                            backgroundColor: 'primary.main',
                                        },
                                    }}
                                />
                            </Box>
                            {getIconContainer(field.description, field.key, field.urn)}
                        </Box>
                        {hasError && isFieldFocused && errorMessages.length > 0 && (
                            <Typography variant="caption" sx={{ 
                                color: 'error.main',
                                ml: 1.75,
                                fontSize: '0.75rem'
                            }}>
                                {errorMessages.map((msg, i) => <div key={i}>{msg}</div>)}
                            </Typography>
                        )}
                    </Box>
                );

            case 'integer':
                return (
                    <Box key={field.key} sx={{ position: 'relative' }}>
                        <TextField
                            fullWidth
                            type="number"
                            label={getFieldLabel(field.label, field.required)}
                            value={currentValue}
                            onChange={(e) => handleFieldChange(field, parseInt(e.target.value) || 0)}
                            onFocus={() => onFieldFocus?.(field.key)}
                            onBlur={() => onFieldBlur?.()}
                            placeholder={field.placeholder}
                            error={hasError}
                            helperText={hasError && isFieldFocused && errorMessages.length > 0 ? (
                                <span>{errorMessages.map((msg, i) => <div key={i}>{msg}</div>)}</span>
                            ) : undefined}
                            variant="outlined"
                            size="small"
                            inputProps={{
                                min: field.validation?.min || 0,
                                max: field.validation?.max,
                                step: 1
                            }}
                            sx={getFieldStyles(field.required, isRequiredAndEmpty, hasError)}
                        />
                        {getIconContainer(field.description, field.key, field.urn)}
                    </Box>
                );

            case 'email':
                return (
                    <Box key={field.key} sx={{ position: 'relative' }}>
                        <TextField
                            fullWidth
                            type="email"
                            label={getFieldLabel(field.label, field.required)}
                            value={currentValue}
                            onChange={(e) => handleFieldChange(field, e.target.value)}
                            onFocus={() => onFieldFocus?.(field.key)}
                            onBlur={() => onFieldBlur?.()}
                            placeholder={field.placeholder || 'Enter email address'}
                            error={hasError}
                            helperText={hasError && isFieldFocused && errorMessages.length > 0 ? (
                                <span>{errorMessages.map((msg, i) => <div key={i}>{msg}</div>)}</span>
                            ) : undefined}
                            variant="outlined"
                            size="small"
                            sx={getFieldStyles(field.required, isRequiredAndEmpty, hasError)}
                        />
                        {getIconContainer(field.description, field.key, field.urn)}
                    </Box>
                );
            case 'url':
                return (
                    <Box key={field.key} sx={{ position: 'relative' }}>
                        <TextField
                            fullWidth
                            type="url"
                            label={getFieldLabel(field.label, field.required)}
                            value={currentValue}
                            onFocus={() => onFieldFocus?.(field.key)}
                            onBlur={() => onFieldBlur?.()}
                            onChange={(e) => handleFieldChange(field, e.target.value)}
                            placeholder={field.placeholder || 'https://example.com'}
                            error={hasError}
                            helperText={hasError && isFieldFocused && errorMessages.length > 0 ? (
                                <span>{errorMessages.map((msg, i) => <div key={i}>{msg}</div>)}</span>
                            ) : undefined}
                            variant="outlined"
                            size="small"
                            sx={getFieldStyles(field.required, isRequiredAndEmpty, hasError)}
                        />
                        {getIconContainer(field.description, field.key, field.urn)}
                    </Box>
                );
            case 'datetime':
                return (
                    <Box key={field.key} sx={{ position: 'relative' }}>
                        <TextField
                            fullWidth
                            type="datetime-local"
                            label={getFieldLabel(field.label, field.required)}
                            value={currentValue}
                            onChange={(e) => handleFieldChange(field, e.target.value)}
                            onFocus={() => onFieldFocus?.(field.key)}
                            onBlur={() => onFieldBlur?.()}
                            error={hasError}
                            helperText={hasError && isFieldFocused && errorMessages.length > 0 ? (
                                <span>{errorMessages.map((msg, i) => <div key={i}>{msg}</div>)}</span>
                            ) : undefined}
                            variant="outlined"
                            size="small"
                            InputLabelProps={{
                                shrink: true,
                            }}
                            sx={getFieldStyles(field.required, isRequiredAndEmpty, hasError)}
                        />
                        {getIconContainer(field.description, field.key, field.urn)}
                    </Box>
                );

            case 'time':
                return (
                    <Box key={field.key} sx={{ position: 'relative' }}>
                        <TextField
                            fullWidth
                            type="time"
                            label={getFieldLabel(field.label, field.required)}
                            value={currentValue}
                            onChange={(e) => handleFieldChange(field, e.target.value)}
                            error={hasError}
                            variant="outlined"
                            size="small"
                            InputLabelProps={{
                                shrink: true,
                            }}
                            sx={getFieldStyles(field.required, isRequiredAndEmpty, hasError)}
                        />
                        {getIconContainer(field.description, undefined, field.urn)}
                    </Box>
                );

            case 'radio':
                // Convert radio options to dropdown for better UX
                return (
                    <Box key={field.key} sx={{ position: 'relative' }}>
                        <FormControl fullWidth size="small" error={hasError}>
                            <InputLabel sx={getFormControlLabelStyles(field.required, hasError)}>
                                {getFieldLabel(field.label, field.required)}
                            </InputLabel>
                            <Select
                                value={currentValue || ''}
                                label={getFieldLabel(field.label, field.required)}
                                onChange={(e) => handleFieldChange(field, e.target.value)}
                                sx={getFieldStyles(field.required, isRequiredAndEmpty, hasError)}
                            >
                                {!field.required && (
                                    <MenuItem value="">
                                        <em>Select {getFieldLabel(field.label, false)}</em>
                                    </MenuItem>
                                )}
                                {field.options?.map((option) => (
                                    <MenuItem key={option.value} value={option.value}>
                                        {option.label}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        {getIconContainer(field.description, field.key, field.urn)}
                    </Box>
                );

            case 'array':
                const arrayValue = getValueByPath(data, field.key) || [];
                const ensureArray = Array.isArray(arrayValue) ? arrayValue : [];
                
                const addArrayItem = () => {
                    const newItem = field.itemType === 'object' ? {} : '';
                    const newArray = [...ensureArray, newItem];
                    handleFieldChange(field, newArray);
                };
                
                const removeArrayItem = (index: number) => {
                    const newArray = ensureArray.filter((_, i) => i !== index);
                    handleFieldChange(field, newArray);
                };
                
                const updateArrayItem = (index: number, value: any) => {
                    const newArray = [...ensureArray];
                    newArray[index] = value;
                    handleFieldChange(field, newArray);
                };

                return (
                    <Box sx={{ width: '100%' }}>
                        {/* Array Header */}
                        <Box sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'space-between',
                            mb: 2,
                            pb: 1,
                            borderBottom: '1px solid rgba(255, 255, 255, 0.12)'
                        }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="subtitle2" sx={{ 
                                    color: hasError ? 'error.main' : 'text.primary',
                                    fontWeight: 600
                                }}>
                                    {getFieldLabel(field.label, field.required)}
                                </Typography>
                                {getIconContainer(field.description, field.key, field.urn)}
                            </Box>
                            <Button
                                size="small"
                                startIcon={<AddIcon />}
                                onClick={addArrayItem}
                                sx={{
                                    textTransform: 'none',
                                    fontSize: '0.8rem',
                                    color: 'primary.main',
                                    border: '1px solid rgba(96, 165, 250, 0.3)',
                                    '&:hover': {
                                        backgroundColor: 'rgba(96, 165, 250, 0.1)',
                                        borderColor: 'primary.main'
                                    }
                                }}
                            >
                                Add Item
                            </Button>
                        </Box>

                        {/* Array Items */}
                        {ensureArray.length === 0 ? (
                            <Box sx={{
                                p: 3,
                                textAlign: 'center',
                                backgroundColor: 'rgba(255, 255, 255, 0.02)',
                                borderRadius: 2,
                                border: '1px dashed rgba(255, 255, 255, 0.2)'
                            }}>
                                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                    No items added yet. Click "Add Item" to get started.
                                </Typography>
                            </Box>
                        ) : (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                {ensureArray.map((item, index) => (
                                    <Card key={index} data-array-item sx={{
                                        backgroundColor: 'rgba(255, 255, 255, 0.03)',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                        borderRadius: 2
                                    }}>
                                        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                                            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                                                {/* Drag handle */}
                                                <DragIndicatorIcon sx={{ 
                                                    color: 'text.secondary', 
                                                    fontSize: 20,
                                                    mt: 1,
                                                    cursor: 'grab'
                                                }} />
                                                
                                                {/* Item content */}
                                                <Box sx={{ flex: 1 }}>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                                        <Typography variant="caption" sx={{ 
                                                            color: 'text.secondary',
                                                            fontWeight: 600,
                                                            textTransform: 'uppercase',
                                                            letterSpacing: 1
                                                        }}>
                                                            Item {index + 1}
                                                        </Typography>
                                                    </Box>
                                                    
                                                    {field.itemType === 'object' && field.itemFields ? (
                                                        // Render object fields
                                                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                                            {field.itemFields.map((subField: any) => {
                                                                // Usar solo la última parte de la key para el objeto del array
                                                                const simpleKey = subField.key.includes('.') ? subField.key.split('.').pop() : subField.key;
                                                                const subFieldValue = item[simpleKey] || '';
                                                                return (
                                                                    <Box key={subField.key} sx={{ display: 'flex', alignItems: 'center' }}>
                                                                        <TextField
                                                                            fullWidth
                                                                            size="small"
                                                                            label={getFieldLabel(subField.label, subField.required)}
                                                                            value={subFieldValue}
                                                                            onChange={(e) => {
                                                                                const newItem = { ...item, [simpleKey]: e.target.value };
                                                                                updateArrayItem(index, newItem);
                                                                            }}
                                                                            placeholder={subField.placeholder}
                                                                            type={subField.type === 'number' ? 'number' : 'text'}
                                                                            multiline={subField.type === 'textarea'}
                                                                            maxRows={subField.type === 'textarea' ? 3 : 1}
                                                                            sx={{
                                                                                '& .MuiOutlinedInput-root': {
                                                                                    backgroundColor: 'rgba(255, 255, 255, 0.02)',
                                                                                    '&:hover fieldset': {
                                                                                        borderColor: 'rgba(96, 165, 250, 0.5)',
                                                                                    },
                                                                                    '&.Mui-focused fieldset': {
                                                                                        borderColor: 'primary.main',
                                                                                    },
                                                                                }
                                                                            }}
                                                                        />
                                                                        {getIconContainer(subField.description, subField.key, subField.urn)}
                                                                    </Box>
                                                                );
                                                            })}
                                                        </Box>
                                                    ) : (
                                                        // Render simple field
                                                        <TextField
                                                            fullWidth
                                                            size="small"
                                                            value={item}
                                                            onChange={(e) => updateArrayItem(index, e.target.value)}
                                                            placeholder={`${field.label} item`}
                                                            sx={{
                                                                '& .MuiOutlinedInput-root': {
                                                                    backgroundColor: 'rgba(255, 255, 255, 0.02)',
                                                                    '&:hover fieldset': {
                                                                        borderColor: 'rgba(96, 165, 250, 0.5)',
                                                                    },
                                                                    '&.Mui-focused fieldset': {
                                                                        borderColor: 'primary.main',
                                                                    },
                                                                }
                                                            }}
                                                        />
                                                    )}
                                                </Box>
                                                
                                                {/* Delete button */}
                                                <IconButton
                                                    size="small"
                                                    onClick={() => removeArrayItem(index)}
                                                    sx={{
                                                        color: 'error.main',
                                                        '&:hover': {
                                                            backgroundColor: 'rgba(244, 67, 54, 0.1)'
                                                        }
                                                    }}
                                                >
                                                    <DeleteIcon sx={{ fontSize: 18 }} />
                                                </IconButton>
                                            </Box>
                                        </CardContent>
                                    </Card>
                                ))}
                            </Box>
                        )}

                        {/* Array summary */}
                        <Box sx={{ 
                            mt: 2, 
                            p: 1, 
                            backgroundColor: 'rgba(255, 255, 255, 0.02)',
                            borderRadius: 1,
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                {ensureArray.length} item{ensureArray.length !== 1 ? 's' : ''}
                            </Typography>
                            {field.validation?.minItems && ensureArray.length < field.validation.minItems && (
                                <Typography variant="caption" sx={{ color: 'error.main' }}>
                                    Minimum {field.validation.minItems} items required
                                </Typography>
                            )}
                        </Box>
                    </Box>
                );

            default:
                return null;
        }
    };

    // State for nested group expansion
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

    // Render hierarchical field structure with proper visual nesting
    const renderFieldHierarchy = (nodes: Record<string, FieldNode>, depth = 0): React.ReactElement[] => {
        return Object.entries(nodes)
            .map(([key, node]) => {
                if (node.isLeaf && node.field) {
                    // Render the actual field
                    return (
                        <Box 
                            key={node.field.key}
                            sx={{ 
                                mb: 2
                            }}
                            ref={(el) => {
                                if (el) fieldRefs.current[node.field!.key] = el;
                            }}
                        >
                            {renderField(node.field)}
                        </Box>
                    );
                } else {
                    // Render a nested group
                    const hasChildFields = Object.values(node.children).some(child => 
                        child.isLeaf || Object.keys(child.children).length > 0
                    );

                    if (!hasChildFields) return null;

                    // Create a friendly label for the group
                    const groupLabel = key.charAt(0).toUpperCase() + key.slice(1)
                        .replace(/([A-Z])/g, ' $1')
                        .replace(/^s/, '');

                    const groupId = `${node.path}-${depth}`;
                    const isGroupExpanded = expandedGroups[groupId] ?? true; // Default expanded

                    // Add data-object attribute for parent object containers (not for root)
                    const groupBoxProps: any = {
                        key: node.path,
                        sx: { mb: 2 }
                    };
                    if (depth > 0) {
                        groupBoxProps['data-object'] = node.path;
                    }

                    return (
                        <Box {...groupBoxProps}>
                            {/* Parent Group Container */}
                            <Box
                                sx={{
                                    border: '1px solid rgba(255, 255, 255, 0.12)',
                                    borderRadius: 2,
                                    backgroundColor: 'rgba(255, 255, 255, 0.02)',
                                    overflow: 'hidden',
                                    transition: 'all 0.2s ease',
                                    // Only apply hover effects to nested groups (depth > 0)
                                    ...(depth > 0 && {
                                        '&:hover': {
                                            borderColor: 'rgba(96, 165, 250, 0.3)',
                                            backgroundColor: 'rgba(255, 255, 255, 0.03)'
                                        }
                                    })
                                }}
                            >
                                {/* Group Header - always visible for nested groups */}
                                {depth > 0 && (
                                    <Box
                                        onClick={() => setExpandedGroups(prev => ({ 
                                            ...prev, 
                                            [groupId]: !isGroupExpanded 
                                        }))}
                                        sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 1,
                                            cursor: 'pointer',
                                            py: 1.5,
                                            px: 2,
                                            backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                            borderBottom: isGroupExpanded ? '1px solid rgba(255, 255, 255, 0.08)' : 'none',
                                            transition: 'all 0.2s ease',
                                            '&:hover': {
                                                backgroundColor: 'rgba(96, 165, 250, 0.1)'
                                            }
                                        }}
                                    >
                                        <ExpandMoreIcon 
                                            sx={{ 
                                                fontSize: 18,
                                                color: 'primary.main',
                                                transform: isGroupExpanded ? 'rotate(0deg)' : 'rotate(-90deg)',
                                                transition: 'transform 0.2s ease'
                                            }} 
                                        />
                                        <Typography 
                                            variant="subtitle2" 
                                            sx={{ 
                                                fontWeight: 600,
                                                color: 'text.primary',
                                                fontSize: '0.875rem'
                                            }}
                                        >
                                            {groupLabel}
                                        </Typography>
                                        {/* Info icon for object group if metadata present (now to the right of the label) */}
                                        {(() => {
                                            const metaField = node.field;
                                            if (metaField && (metaField.description || metaField.urn)) {
                                                return getIconContainer(metaField.description, metaField.key, metaField.urn);
                                            }
                                            return null;
                                        })()}
                                        <Chip 
                                            label={Object.keys(node.children).length} 
                                            size="small" 
                                            sx={{ 
                                                ml: 'auto',
                                                height: 20,
                                                fontSize: '0.75rem',
                                                backgroundColor: 'rgba(96, 165, 250, 0.2)',
                                                color: 'primary.main'
                                            }} 
                                        />
                                    </Box>
                                )}
                                
                                {/* Group Content - nested fields appear INSIDE this container */}
                                <Collapse in={isGroupExpanded} timeout={200}>
                                    <Box 
                                        sx={{ 
                                            p: 2,
                                            pt: depth === 0 ? 2 : 1.5, // Less padding at top if there's a header
                                            backgroundColor: depth > 0 ? 'rgba(0, 0, 0, 0.02)' : 'transparent',
                                            // Create visual depth with subtle background changes
                                            ...(depth > 1 && {
                                                backgroundColor: 'rgba(0, 0, 0, 0.05)',
                                                borderLeft: '3px solid rgba(96, 165, 250, 0.2)'
                                            })
                                        }}
                                    >
                                        {renderFieldHierarchy(node.children, depth + 1)}
                                    </Box>
                                </Collapse>
                            </Box>
                        </Box>
                    );
                }
            })
            .filter(Boolean) as React.ReactElement[];
    };

    return (
        <Box 
            ref={containerRef}
            sx={{
                // Custom scrollbar styling
                '& ::-webkit-scrollbar': {
                    width: '8px',
                },
                '& ::-webkit-scrollbar-track': {
                    background: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '4px',
                },
                '& ::-webkit-scrollbar-thumb': {
                    background: 'rgba(96, 165, 250, 0.6)',
                    borderRadius: '4px',
                    '&:hover': {
                        background: 'rgba(96, 165, 250, 0.8)',
                    }
                },
                '& ::-webkit-scrollbar-thumb:active': {
                    background: 'rgba(96, 165, 250, 1)',
                }
            }}
        >
            {Object.entries(groupedFields).map(([sectionName, sectionFields]: [string, DPPFormField[]]) => {
                const requiredFieldsCount = sectionFields.filter((f: DPPFormField) => f.required).length;
                const displayName = getSectionDisplayName(sectionName);
                
                return (
                    <Accordion
                        key={sectionName}
                        expanded={expandedPanel === sectionName}
                        onChange={(event, isExpanded) => {
                            setExpandedPanel(isExpanded ? sectionName : null);
                            if (isExpanded) {
                                const el = accordionRefs.current[sectionName] as HTMLElement | null;
                                const container = containerRef.current;
                                // Use centralized helper to scroll the container to the expanded section.
                                // Small delay gives the accordion time to animate/measure.
                                setTimeout(() => {
                                    if (el) {
                                        scrollToElement({ element: el, container, focus: false, highlightClass: '', durationMs: 0, block: 'start' });
                                    }
                                }, 120);
                            }
                        }}
                        ref={(el) => {
                            if (el) accordionRefs.current[sectionName] = el;
                        }}
                        // Make the accordion discoverable by the field navigation helper
                        data-section={sectionName}
                        sx={{
                            mb: 2,
                            backgroundColor: 'rgba(255, 255, 255, 0.02)',
                            border: '1px solid rgba(255, 255, 255, 0.12)',
                            '&:before': {
                                display: 'none',
                            },
                            '& .MuiAccordionSummary-root': {
                                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
                            }
                        }}
                    >
                        <AccordionSummary 
                            expandIcon={<ExpandMoreIcon sx={{ color: 'text.secondary' }} />}
                        >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
                                {/* Info/fingerprint icons only if present for section (only own URN/description) */}
                                {(() => {
                                    // Priorizar el pseudo-campo de sección (key === sectionName y type === 'object')
                                    let infoField = sectionFields.find(f => f.key === sectionName && f.type === 'object');
                                    // Si no existe, usar el primer campo con descripción o URN
                                    if (!infoField) infoField = sectionFields.find(f => f.description || f.urn);
                                    if (!infoField) return null;
                                    return getIconContainer(infoField.description, undefined, infoField.urn);
                                })()}
                                <Typography variant="h6" sx={{ 
                                    fontWeight: 600,
                                    color: 'text.primary'
                                }}>
                                    {displayName}
                                </Typography>
                                <Chip
                                    label={`${sectionFields.length} field${sectionFields.length !== 1 ? 's' : ''}`}
                                    size="small"
                                    sx={{
                                        fontSize: '0.7rem',
                                        height: 20,
                                        backgroundColor: 'rgba(96, 165, 250, 0.2)',
                                        color: 'primary.main'
                                    }}
                                />
                                {requiredFieldsCount > 0 && (
                                    <Chip
                                        label={`${requiredFieldsCount} required`}
                                        size="small"
                                        sx={{
                                            fontSize: '0.7rem',
                                            height: 20,
                                            backgroundColor: 'rgba(239, 68, 68, 0.2)',
                                            color: 'error.main'
                                        }}
                                    />
                                )}
                            </Box>
                        </AccordionSummary>
                        <AccordionDetails sx={{ p: 3 }}>
                            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                                {renderFieldHierarchy(createFieldHierarchy(sectionFields))}
                            </Box>
                        </AccordionDetails>
                    </Accordion>
                );
            })}
        </Box>
    );
});

DynamicForm.displayName = 'DynamicForm';

export default DynamicForm;
export type { DynamicFormRef };