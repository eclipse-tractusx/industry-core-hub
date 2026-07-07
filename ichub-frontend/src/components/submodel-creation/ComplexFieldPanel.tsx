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

import React, { useState } from 'react';
import {
    Box,
    Typography,
    Button,
    IconButton,
    Card,
    CardContent,
    TextField,
    Chip,
    Collapse,
    Tooltip
} from '@mui/material';
import {
    Add as AddIcon,
    Delete as DeleteIcon,
    DragIndicator as DragIndicatorIcon,
    ExpandMore as ExpandMoreIcon,
    Info as InfoIcon
} from '@mui/icons-material';
import { FormField } from '../../schemas/json-schema-interpreter';
import CustomTooltip from './CustomTooltip';
import { createInitialArrayItem } from '../../utils/schemaUtils';

interface ComplexFieldPanelProps {
    field: FormField;
    value: any;
    onChange: (value: any) => void;
    depth: number;
    errors: string[];
    fieldErrors?: Set<string>;
    directFieldErrors?: Set<string>; // Only direct errors (not parents) for marking containers in red
    errorStateMap?: Record<string, { hasError: boolean; errorMessages: string[] }>;
    onFieldFocus?: (key: string) => void;
    onFieldBlur?: () => void;
    onInfoIconClick?: (key: string) => void;
    parentPath?: string; // Parent path for nested fields in arrays (e.g., 'materialList[0]')
    // Callback for rendering simple fields within complex structures
    renderSimpleField?: (field: FormField, value: any, onChange: (value: any) => void, parentPath?: string) => React.ReactNode;
}

/**
 * ComplexFieldPanel - Reusable component for rendering complex field types (arrays and nested objects)
 * Handles recursive rendering of nested structures with proper visual hierarchy
 */
const ComplexFieldPanel: React.FC<ComplexFieldPanelProps> = ({
    field,
    value,
    onChange,
    depth,
    errors,
    fieldErrors = new Set(),
    directFieldErrors = new Set(),
    errorStateMap = {},
    onFieldFocus,
    onFieldBlur,
    onInfoIconClick,
    parentPath,
    renderSimpleField
}) => {
    const [expandedItems, setExpandedItems] = useState<Record<number, boolean>>({});

    // Helper: Get field label with required indicator
    const getFieldLabel = (label: string, isRequired: boolean = false) => {
        const cleanLabel = label.replace(/(\s*\*\s*)+$/, '').trim();
        return isRequired ? `${cleanLabel} *` : cleanLabel;
    };

    // Helper: Get depth-based styling - using same color for all depths
    const getDepthStyles = (_currentDepth: number) => {
        return {
            borderColor: 'rgba(96, 165, 250, 0.4)',
            backgroundColor: 'rgba(96, 165, 250, 0.02)'
        };
    };

    // Helper: Get info icon with tooltip
    const getInfoIcon = (description?: string, fieldKey?: string, urn?: string) => {
        if (!description && !urn) return null;
        return (
            <CustomTooltip title="Description" description={description} urn={urn}>
                <InfoIcon
                    sx={{
                        fontSize: 16,
                        color: 'text.secondary',
                        cursor: 'pointer',
                        opacity: 1,
                        ml: 1
                    }}
                    onClick={fieldKey && onInfoIconClick ? (e) => { e.stopPropagation(); onInfoIconClick(fieldKey); } : undefined}
                />
            </CustomTooltip>
        );
    };

    /**
     * Normalize a path by removing array indices
     * "materialList[0].processing[1].country" -> "materialList.processing.country"
     */
    const normalizePath = (path: string): string => {
        return path.replace(/\[\d+\]/g, '').replace(/\[item\]/g, '');
    };

    /**
     * Build the schema path for the info icon click (Schema Rules navigation)
     * This converts actual paths with numeric indices to schema format with [item]
     * e.g., "sustainability.productFootprint.environmental[0]" -> "sustainability.productFootprint.environmental[item]"
     */
    const buildSchemaPath = (): string => {
        // If no parent path, use the field key directly (it already has [item] format)
        if (!parentPath) {
            return field.key;
        }
        
        // Convert parentPath indices [0], [1], etc. to [item] for schema matching
        const parentPathWithItemPlaceholder = parentPath.replace(/\[\d+\]/g, '[item]');
        
        // Extract the simple key (last segment) from the field.key
        // field.key might be "parent[item].child" or "parent[item].nested[item].child"
        const keyWithoutPlaceholders = field.key.replace(/\[item\]/g, '');
        const segments = keyWithoutPlaceholders.split('.');
        const simpleKey = segments[segments.length - 1];
        
        // Check if the field itself is an array (has [item] at the end of its key)
        const fieldIsArray = field.key.endsWith('[item]') || field.type === 'array';
        
        const result = fieldIsArray 
            ? `${parentPathWithItemPlaceholder}.${simpleKey}[item]`
            : `${parentPathWithItemPlaceholder}.${simpleKey}`;
        
        return result;
    };

    /**
     * Build the actual field path considering parent context
     * This handles arrays and objects at any nesting level
     */
    const buildActualPath = (): string => {
        // If no parent path, use the field key directly (replacing [item] with actual indices if needed)
        if (!parentPath) {
            const result = field.key.replace(/\[item\]/g, '');
            console.log('[ComplexFieldPanel] buildActualPath: no parentPath, returning cleaned field.key:', field.key, '->', result);
            return result;
        }
        
        // Extract the simple key (last segment) from the field.key
        // field.key might be "parent[item].child" or "parent[item].nested[item].child"
        // We need just "child" to append to parentPath
        const keyWithoutPlaceholders = field.key.replace(/\[item\]/g, '');
        const segments = keyWithoutPlaceholders.split('.');
        const simpleKey = segments[segments.length - 1];
        
        const result = `${parentPath}.${simpleKey}`;
        console.log('[ComplexFieldPanel] buildActualPath:', {
            parentPath,
            fieldKey: field.key,
            keyWithoutPlaceholders,
            simpleKey,
            result
        });
        return result;
    };

    // Check if this field or any of its children have errors
    const hasDirectOrChildError = (): { hasDirectError: boolean; childErrorCount: number } => {
        const actualPath = buildActualPath();
        const normalizedPath = normalizePath(actualPath);
        const normalizedFieldKey = normalizePath(field.key);
        
        // Check for direct error using directFieldErrors (not parents)
        let hasDirectError = false;
        if (directFieldErrors.has(actualPath)) hasDirectError = true;
        if (directFieldErrors.has(normalizedPath)) hasDirectError = true;
        if (directFieldErrors.has(field.key)) hasDirectError = true;
        if (directFieldErrors.has(normalizedFieldKey)) hasDirectError = true;
        
        // Count child errors using directFieldErrors
        // Use a Set to track unique normalized paths to avoid counting duplicates
        const uniqueChildErrors = new Set<string>();
        
        Array.from(directFieldErrors).forEach(errPath => {
            const normalizedErr = normalizePath(errPath);
            
            // Check if this error belongs to a child of this field
            const isChildError = (
                normalizedErr.startsWith(normalizedPath + '.') ||
                normalizedErr.startsWith(normalizedPath + '[') ||
                errPath.startsWith(actualPath + '.') ||
                errPath.startsWith(actualPath + '[')
            ) && errPath !== actualPath && errPath !== normalizedPath;
            
            if (isChildError) {
                // Add the normalized path to avoid counting the same logical error twice
                uniqueChildErrors.add(normalizedErr);
            }
        });
        
        return { hasDirectError, childErrorCount: uniqueChildErrors.size };
    };
    
    const { hasDirectError, childErrorCount } = hasDirectOrChildError();

    // ARRAY RENDERING
    if (field.type === 'array') {
        const arrayValue = Array.isArray(value) ? value : [];
        
        // Count items with errors using directFieldErrors
        const actualPath = buildActualPath();
        const itemsWithErrors = arrayValue.reduce((count: number, _: any, index: number) => {
            const itemPath = `${actualPath}[${index}]`;
            const hasItemError = Array.from(directFieldErrors).some(errPath => 
                errPath.startsWith(itemPath + '.') || errPath.startsWith(itemPath + '[') || errPath === itemPath
            );
            return hasItemError ? count + 1 : count;
        }, 0);

        /**
         * Get error information for a specific array item
         * Returns the count of errors within this item and whether it has any errors
         */
        const getItemErrorInfo = (index: number): { hasErrors: boolean; errorCount: number } => {
            const itemPath = `${actualPath}[${index}]`;
            
            // Use a Set to track unique normalized paths to avoid counting duplicates
            const uniqueItemErrors = new Set<string>();
            
            Array.from(directFieldErrors).forEach(errPath => {
                // Check if error path belongs to this item
                const belongsToItem = errPath === itemPath || 
                       errPath.startsWith(itemPath + '.') || 
                       errPath.startsWith(itemPath + '[');
                
                if (belongsToItem) {
                    // Normalize to avoid counting same logical error twice
                    const normalizedErr = normalizePath(errPath);
                    uniqueItemErrors.add(normalizedErr);
                }
            });
            
            return {
                hasErrors: uniqueItemErrors.size > 0,
                errorCount: uniqueItemErrors.size
            };
        };
        
        const addArrayItem = () => {
            // Create new item with properly initialized structure
            // For object items, initialize all fields with appropriate empty values
            // This ensures required field validation works from the moment the item is created
            const newItem = field.itemType === 'object' 
                ? createInitialArrayItem(field.itemFields) 
                : '';
            onChange([...arrayValue, newItem]);
        };
        
        const removeArrayItem = (index: number) => {
            const newArray = arrayValue.filter((_: any, i: number) => i !== index);
            onChange(newArray);
        };
        
        const updateArrayItem = (index: number, itemValue: any) => {
            const newArray = [...arrayValue];
            newArray[index] = itemValue;
            onChange(newArray);
        };

        // Count simple vs complex fields in items
        const simpleCount = field.itemFields?.filter(f => f.fieldCategory === 'simple').length || 0;
        const complexCount = field.itemFields?.filter(f => f.fieldCategory === 'complex').length || 0;

        const depthStyles = getDepthStyles(depth);
        
        // Build the array container path for navigation
        const arrayContainerPath = buildActualPath();

        return (
            <Box sx={{ width: '100%', mb: 2 }}>
                {/* Array Header - this is the navigation target for the array */}
                <Box 
                    data-field-key={arrayContainerPath}
                    data-array-header="true"
                    sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between',
                        mb: 2,
                        pb: 1.5,
                        px: 1.5,
                        py: 1,
                        mx: -1.5,
                        borderRadius: 1,
                        borderBottom: `2px solid ${depthStyles.borderColor}`,
                        transition: 'all 0.3s ease'
                    }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="subtitle2" sx={{ 
                            color: hasDirectError ? 'error.main' : 'text.primary',
                            fontWeight: 600,
                            fontSize: '0.95rem'
                        }}>
                            {getFieldLabel(field.label, field.required)}
                        </Typography>
                        {getInfoIcon(field.description, field.key, field.urn)}
                        <Chip 
                            label={`${arrayValue.length} item${arrayValue.length !== 1 ? 's' : ''}`}
                            size="small" 
                            sx={{ 
                                height: 20,
                                fontSize: '0.75rem',
                                backgroundColor: depthStyles.backgroundColor,
                                color: 'text.primary',
                                border: `1px solid ${depthStyles.borderColor}`
                            }} 
                        />
                        {(simpleCount > 0 || complexCount > 0) && (
                            <Tooltip title={`${simpleCount} simple field${simpleCount !== 1 ? 's' : ''}, ${complexCount} complex field${complexCount !== 1 ? 's' : ''}`}>
                                <Chip 
                                    label={`${simpleCount}S / ${complexCount}C`}
                                    size="small" 
                                    sx={{ 
                                        height: 20,
                                        fontSize: '0.7rem',
                                        backgroundColor: 'rgba(255, 255, 255, 0.02)',
                                        color: 'text.secondary'
                                    }} 
                                />
                            </Tooltip>
                        )}
                        {itemsWithErrors > 0 && (
                            <Tooltip title={`${itemsWithErrors} item${itemsWithErrors !== 1 ? 's' : ''} contain${itemsWithErrors === 1 ? 's' : ''} errors`}>
                                <Chip
                                    label={`${itemsWithErrors} item${itemsWithErrors !== 1 ? 's' : ''} with errors`}
                                    size="small"
                                    sx={{
                                        height: 20,
                                        fontSize: '0.7rem',
                                        backgroundColor: 'rgba(239, 68, 68, 0.2)',
                                        color: 'error.main',
                                        fontWeight: 500
                                    }}
                                />
                            </Tooltip>
                        )}
                    </Box>
                    <Button
                        size="small"
                        startIcon={<AddIcon />}
                        onClick={addArrayItem}
                        sx={{
                            textTransform: 'none',
                            fontSize: '0.8rem',
                            color: 'primary.main',
                            border: `1px solid ${depthStyles.borderColor}`,
                            '&:hover': {
                                backgroundColor: depthStyles.backgroundColor,
                                borderColor: 'primary.main'
                            }
                        }}
                    >
                        Add Item
                    </Button>
                </Box>

                {/* Array Items */}
                {arrayValue.length === 0 ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <Box 
                            sx={{
                                p: 3,
                                textAlign: 'center',
                                backgroundColor: 'rgba(255, 255, 255, 0.01)',
                                borderRadius: 2,
                                border: '1px dashed rgba(255, 255, 255, 0.2)'
                            }}
                        >
                            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                No items added yet.
                            </Typography>
                        </Box>
                        
                        <Button
                            fullWidth
                            size="medium"
                            startIcon={<AddIcon />}
                            onClick={addArrayItem}
                            sx={{
                                textTransform: 'none',
                                fontSize: '0.85rem',
                                color: 'primary.main',
                                border: '1px dashed rgba(96, 165, 250, 0.4)',
                                borderRadius: 2,
                                py: 1.5,
                                backgroundColor: 'rgba(96, 165, 250, 0.02)',
                                '&:hover': {
                                    backgroundColor: 'rgba(96, 165, 250, 0.08)',
                                    borderColor: 'primary.main',
                                    borderStyle: 'solid'
                                }
                            }}
                        >
                            Add Item
                        </Button>
                    </Box>
                ) : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {arrayValue.map((item: any, index: number) => {
                            const isExpanded = expandedItems[index] ?? true;
                            // Get error info for this specific item
                            const itemErrorInfo = getItemErrorInfo(index);
                            const itemHasErrors = itemErrorInfo.hasErrors;
                            const itemErrorCount = itemErrorInfo.errorCount;
                            
                            // Build the item path for navigation - use actualPath to include parentPath context
                            const itemPath = `${actualPath}[${index}]`;
                            
                            return (
                                <Card 
                                    key={index} 
                                    data-field-key={itemPath}
                                    data-array-item="true"
                                    sx={{
                                    backgroundColor: itemHasErrors 
                                        ? 'rgba(239, 68, 68, 0.03)' 
                                        : depthStyles.backgroundColor,
                                    border: itemHasErrors 
                                        ? '1px solid rgba(239, 68, 68, 0.4)' 
                                        : `1px solid ${depthStyles.borderColor}`,
                                    borderRadius: 2,
                                    transition: 'all 0.2s ease',
                                    ...(itemHasErrors && {
                                        boxShadow: '0 0 0 1px rgba(239, 68, 68, 0.1)'
                                    })
                                }}>
                                    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                                            {/* Drag handle */}
                                            <DragIndicatorIcon sx={{ 
                                                color: itemHasErrors ? 'error.main' : 'text.secondary', 
                                                fontSize: 20,
                                                mt: 1,
                                                cursor: 'grab',
                                                opacity: itemHasErrors ? 0.7 : 1
                                            }} />
                                            
                                            {/* Item content */}
                                            <Box sx={{ flex: 1 }}>
                                                {/* Item header (clickable to collapse/expand) */}
                                                <Box 
                                                    sx={{ 
                                                        display: 'flex', 
                                                        alignItems: 'center', 
                                                        gap: 1, 
                                                        mb: 1,
                                                        cursor: 'pointer',
                                                        userSelect: 'none'
                                                    }}
                                                    onClick={() => setExpandedItems(prev => ({ ...prev, [index]: !isExpanded }))}
                                                >
                                                    <ExpandMoreIcon 
                                                        sx={{ 
                                                            fontSize: 18,
                                                            color: itemHasErrors ? 'error.main' : 'primary.main',
                                                            transform: isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)',
                                                            transition: 'transform 0.2s ease'
                                                        }} 
                                                    />
                                                    <Typography variant="caption" sx={{ 
                                                        color: itemHasErrors ? 'error.main' : 'text.secondary',
                                                        fontWeight: 600,
                                                        textTransform: 'uppercase',
                                                        letterSpacing: 1
                                                    }}>
                                                        Item {index + 1}
                                                    </Typography>
                                                    {/* Error indicator chip for this item */}
                                                    {itemHasErrors && (
                                                        <Tooltip title={`This item contains ${itemErrorCount} validation error${itemErrorCount !== 1 ? 's' : ''}`}>
                                                            <Chip
                                                                label={`${itemErrorCount} error${itemErrorCount !== 1 ? 's' : ''}`}
                                                                size="small"
                                                                sx={{
                                                                    height: 18,
                                                                    fontSize: '0.65rem',
                                                                    fontWeight: 600,
                                                                    backgroundColor: 'rgba(239, 68, 68, 0.15)',
                                                                    color: 'error.main',
                                                                    border: '1px solid rgba(239, 68, 68, 0.3)',
                                                                    '& .MuiChip-label': {
                                                                        px: 1
                                                                    }
                                                                }}
                                                            />
                                                        </Tooltip>
                                                    )}
                                                </Box>
                                                
                                                {/* Item fields (collapsible) */}
                                                <Collapse in={isExpanded} timeout={200}>
                                                    {field.itemType === 'object' && field.itemFields ? (
                                                        // Render object fields
                                                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                                                            {field.itemFields.map((subField: FormField) => {
                                                                const simpleKey = subField.key.includes('.') 
                                                                    ? subField.key.split('.').pop() 
                                                                    : subField.key;
                                                                const subFieldValue = item[simpleKey!] || '';
                                                                
                                                                // Recursively render complex fields
                                                                if (subField.fieldCategory === 'complex') {
                                                                    // Construct parent path correctly, removing [item] placeholder and building proper indexed path
                                                                    const baseFieldKey = field.key.replace(/\[item\]/g, '');
                                                                    const fieldName = baseFieldKey.split('.').pop() || baseFieldKey;
                                                                    const nestedParentPath = parentPath 
                                                                        ? `${parentPath}.${fieldName}[${index}]`
                                                                        : `${baseFieldKey}[${index}]`;
                                                                    return (
                                                                        <ComplexFieldPanel
                                                                            key={subField.key}
                                                                            field={subField}
                                                                            value={subFieldValue}
                                                                            onChange={(newValue) => {
                                                                                const newItem = { ...item, [simpleKey!]: newValue };
                                                                                updateArrayItem(index, newItem);
                                                                        }}
                                                                        depth={depth + 1}
                                                                        errors={errors}
                                                                        fieldErrors={fieldErrors}
                                                                        directFieldErrors={directFieldErrors}
                                                                        errorStateMap={errorStateMap}
                                                                        onFieldFocus={onFieldFocus}
                                                                        onFieldBlur={onFieldBlur}
                                                                        onInfoIconClick={onInfoIconClick}
                                                                            parentPath={nestedParentPath}
                                                                            renderSimpleField={renderSimpleField}
                                                                        />
                                                                    );
                                                                }
                                                                
                                                                // Render simple field using callback if provided
                                                                if (renderSimpleField) {
                                                                    // Construct parent path with array index
                                                                    // Use parentPath context if available, otherwise fall back to field.key
                                                                    const baseFieldKey = field.key.replace(/\[item\]/g, '');
                                                                    const fieldName = baseFieldKey.split('.').pop() || baseFieldKey;
                                                                    const arrayParentPath = parentPath 
                                                                        ? `${parentPath}.${fieldName}[${index}]`
                                                                        : `${baseFieldKey}[${index}]`;
                                                                    // Build the full field path for navigation
                                                                    const fullFieldPath = `${arrayParentPath}.${simpleKey}`;
                                                                    return (
                                                                        <Box 
                                                                            key={subField.key}
                                                                            data-field-key={fullFieldPath}
                                                                        >
                                                                            {renderSimpleField(
                                                                                subField,
                                                                                subFieldValue,
                                                                                (newValue) => {
                                                                                    const newItem = { ...item, [simpleKey!]: newValue };
                                                                                    updateArrayItem(index, newItem);
                                                                                },
                                                                                arrayParentPath
                                                                            )}
                                                                        </Box>
                                                                    );
                                                                }
                                                                
                                                                // Fallback: basic text field
                                                                return (
                                                                    <TextField
                                                                        key={subField.key}
                                                                        fullWidth
                                                                        size="small"
                                                                        label={getFieldLabel(subField.label, subField.required)}
                                                                        value={subFieldValue}
                                                                        onChange={(e) => {
                                                                            const newItem = { ...item, [simpleKey!]: e.target.value };
                                                                            updateArrayItem(index, newItem);
                                                                        }}
                                                                        placeholder={subField.placeholder}
                                                                    />
                                                                );
                                                            })}
                                                        </Box>
                                                    ) : (
                                                        // Render simple field (primitive array)
                                                        <TextField
                                                            fullWidth
                                                            size="small"
                                                            value={item}
                                                            onChange={(e) => updateArrayItem(index, e.target.value)}
                                                            placeholder={`${field.label} item`}
                                                        />
                                                    )}
                                                </Collapse>
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
                            );
                        })}
                    </Box>
                )}

                {/* Array validation summary */}
                {field.validation && (
                    <Box sx={{ 
                        mt: 2, 
                        p: 1, 
                        backgroundColor: 'rgba(255, 255, 255, 0.01)',
                        borderRadius: 1,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            {arrayValue.length} item{arrayValue.length !== 1 ? 's' : ''}
                        </Typography>
                        {field.validation.minItems && arrayValue.length < field.validation.minItems && (
                            <Typography variant="caption" sx={{ color: 'error.main' }}>
                                Minimum {field.validation.minItems} items required
                            </Typography>
                        )}
                    </Box>
                )}
            </Box>
        );
    }

    // OBJECT RENDERING
    if (field.type === 'object' && field.objectFields) {
        const depthStyles = getDepthStyles(depth);
        const simpleCount = field.objectFields.filter(f => f.fieldCategory === 'simple').length;
        const complexCount = field.objectFields.filter(f => f.fieldCategory === 'complex').length;
        const objectHasErrors = hasDirectError || childErrorCount > 0;
        
        // Build the object container path for navigation
        const objectContainerPath = buildActualPath();

        return (
            <Box 
                data-field-key={objectContainerPath}
                data-nested-object="true"
                sx={{ 
                width: '100%', 
                mb: 2,
                position: 'relative', // Needed for pseudo-elements positioning
                transition: 'all 0.3s ease'
            }}>
                {/* Inner container with border and background */}
                <Box sx={{
                    border: objectHasErrors 
                        ? '1px solid rgba(239, 68, 68, 0.5)' 
                        : `1px solid ${depthStyles.borderColor}`,
                    borderRadius: 2,
                    backgroundColor: objectHasErrors 
                        ? 'rgba(239, 68, 68, 0.03)' 
                        : depthStyles.backgroundColor,
                    overflow: 'hidden', // Keep content clipped
                    ...(objectHasErrors && {
                        boxShadow: '0 0 0 1px rgba(239, 68, 68, 0.1)'
                    })
                }}>
                {/* Object Header */}
                <Box sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    py: 1.5,
                    px: 2,
                    backgroundColor: objectHasErrors 
                        ? 'rgba(239, 68, 68, 0.05)' 
                        : 'rgba(255, 255, 255, 0.02)',
                    borderBottom: objectHasErrors 
                        ? '1px solid rgba(239, 68, 68, 0.3)' 
                        : `1px solid ${depthStyles.borderColor}`
                }}>
                    <Typography 
                        variant="subtitle2" 
                        sx={{ 
                            fontWeight: 600,
                            color: hasDirectError ? 'error.main' : 'text.primary',
                            fontSize: '0.9rem'
                        }}
                    >
                        {getFieldLabel(field.label, field.required)}
                    </Typography>
                    {getInfoIcon(field.description, field.key, field.urn)}
                    {childErrorCount > 0 && (
                        <Tooltip title={`${childErrorCount} error${childErrorCount !== 1 ? 's' : ''} in nested fields`}>
                            <Chip
                                label={`${childErrorCount} error${childErrorCount !== 1 ? 's' : ''}`}
                                size="small"
                                sx={{
                                    height: 20,
                                    fontSize: '0.7rem',
                                    backgroundColor: 'rgba(239, 68, 68, 0.2)',
                                    color: 'error.main',
                                    fontWeight: 500
                                }}
                            />
                        </Tooltip>
                    )}
                    <Chip 
                        label={`${field.objectFields.length} field${field.objectFields.length !== 1 ? 's' : ''}`}
                        size="small" 
                        sx={{ 
                            ml: 'auto',
                            height: 20,
                            fontSize: '0.75rem',
                            backgroundColor: depthStyles.backgroundColor,
                            color: 'text.primary'
                        }} 
                    />
                    {(simpleCount > 0 || complexCount > 0) && (
                        <Tooltip title={`${simpleCount} simple, ${complexCount} complex`}>
                            <Chip 
                                label={`${simpleCount}S / ${complexCount}C`}
                                size="small" 
                                sx={{ 
                                    height: 20,
                                    fontSize: '0.7rem',
                                    backgroundColor: 'rgba(255, 255, 255, 0.02)',
                                    color: 'text.secondary'
                                }} 
                            />
                        </Tooltip>
                    )}
                </Box>
                
                {/* Object Content */}
                <Box sx={{ p: 2 }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {field.objectFields.map((objField: FormField) => {
                            const fieldKeyParts = objField.key.split('.');
                            const simpleKey = fieldKeyParts[fieldKeyParts.length - 1];
                            const objValue = value?.[simpleKey] || '';
                            
                            // Build the parent path for child fields
                            // This should include the current object's path
                            const objectParentPath = buildActualPath();
                            
                            // Recursively render complex fields
                            if (objField.fieldCategory === 'complex') {
                                return (
                                    <ComplexFieldPanel
                                        key={objField.key}
                                        field={objField}
                                        value={objValue}
                                        onChange={(newValue) => {
                                            onChange({ ...value, [simpleKey]: newValue });
                                        }}
                                        depth={depth + 1}
                                        errors={errors}
                                        fieldErrors={fieldErrors}
                                        directFieldErrors={directFieldErrors}
                                        errorStateMap={errorStateMap}
                                        onFieldFocus={onFieldFocus}
                                        onFieldBlur={onFieldBlur}
                                        onInfoIconClick={onInfoIconClick}
                                        parentPath={objectParentPath}  // Pass the object's path as parent for nested structures
                                        renderSimpleField={renderSimpleField}
                                    />
                                );
                            }
                            
                            // Render simple field using callback
                            if (renderSimpleField) {
                                // Build the full field path for navigation
                                const objectFieldPath = objectParentPath 
                                    ? `${objectParentPath}.${simpleKey}` 
                                    : objField.key;
                                return (
                                    <Box 
                                        key={objField.key}
                                        data-field-key={objectFieldPath}
                                    >
                                        {renderSimpleField(
                                            objField,
                                            objValue,
                                            (newValue) => {
                                                onChange({ ...value, [simpleKey]: newValue });
                                            },
                                            objectParentPath  // Pass object's path as parentPath for simple fields
                                        )}
                                    </Box>
                                );
                            }
                            
                            // Fallback
                            return null;
                        })}
                    </Box>
                </Box>
                </Box>
                {/* End of inner container */}
            </Box>
        );
    }

    return null;
};

export default ComplexFieldPanel;
