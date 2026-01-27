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

import React, { useState, useMemo } from 'react';
import {
    Box,
    Typography,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Card,
    CardContent,
    Chip,
    Divider,
    TextField,
    InputAdornment,
    IconButton,
    Tooltip,
    Autocomplete
} from '@mui/material';
import { autocompleteClasses } from '@mui/material/Autocomplete';
import {
    ExpandMore as ExpandMoreIcon,
    CheckCircle as CheckCircleIcon,
    Rule as RuleIcon,
    Info as InfoIcon,
    ChevronRight as ChevronRightIcon,
    Search as SearchIcon,
    Clear as ClearIcon,
    Place as PlaceIcon
} from '@mui/icons-material';
import { SchemaDefinition } from '../../schemas';
import { FormField } from '../../schemas/json-schema-interpreter';

interface SchemaRulesViewerProps {
    schema: SchemaDefinition;
    onNavigateToField: (fieldKey: string) => void;
    initialSearchTerm?: string;
    onSearchTermChange?: (term: string) => void;
}

interface FieldRule {
    field: FormField;
    rules: {
        type?: string;
        required?: boolean;
        enum?: Array<{ value: any; label: string; description?: string }>;
        pattern?: string;
        minLength?: number;
        maxLength?: number;
        minimum?: number;
        maximum?: number;
        minItems?: number;
        maxItems?: number;
        uniqueItems?: boolean;
        format?: string;
        description?: string;
        dependencies?: string[];
    };
    /** Depth level in the hierarchy (0 = top level) */
    depth: number;
    /** Parent field key for context */
    parentKey?: string;
    /** Whether this is an array item template field */
    isArrayItem?: boolean;
}

const SchemaRulesViewer: React.FC<SchemaRulesViewerProps> = ({ 
    schema, 
    onNavigateToField, 
    initialSearchTerm = '', 
    onSearchTermChange 
}) => {
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
        'required': false,
        'otherRules': false,
        'formatRules': false
    });
    // Track expanded/collapsed state for long descriptions by field key
    const [expandedDescriptions, setExpandedDescriptions] = useState<Record<string, boolean>>({});
    const [searchTerm, setSearchTerm] = useState<string>(initialSearchTerm);
    const [autocompleteOpen, setAutocompleteOpen] = useState(false);
    

    // Update search term when initialSearchTerm changes (from external search)
    React.useEffect(() => {
        setSearchTerm(initialSearchTerm || '');
    }, [initialSearchTerm]);


    /**
     * RECURSIVE function to extract rules from a field and all its nested children
     * Handles: itemFields (arrays), objectFields (nested objects), and any combination
     */
    const extractFieldRulesRecursive = (
        field: FormField,
        depth: number = 0,
        parentKey?: string,
        isArrayItem: boolean = false
    ): FieldRule[] => {
        const results: FieldRule[] = [];
        
        // Build rules object for this field
        const rules: FieldRule['rules'] = {
            type: field.type,
            required: field.required,
            description: field.description
        };

        // Add enum options
        if (field.options && field.options.length > 0) {
            rules.enum = field.options;
        }

        // Add validation rules if they exist
        let hasFormat = false;
        if (field.validation) {
            if (field.validation.pattern) {
                rules.pattern = field.validation.pattern;
                hasFormat = true;
            }
            if (field.validation.minLength !== undefined) {
                rules.minLength = field.validation.minLength;
                hasFormat = true;
            }
            if (field.validation.maxLength !== undefined) {
                rules.maxLength = field.validation.maxLength;
                hasFormat = true;
            }
            if (field.validation.format) {
                rules.format = field.validation.format;
                hasFormat = true;
            }
            if (field.validation.min !== undefined) {
                rules.minimum = field.validation.min;
            }
            if (field.validation.max !== undefined) {
                rules.maximum = field.validation.max;
            }
            // Array-specific validation
            if (field.validation.minItems !== undefined) {
                rules.minItems = field.validation.minItems;
            }
            if (field.validation.maxItems !== undefined) {
                rules.maxItems = field.validation.maxItems;
            }
            if (field.validation.uniqueItems !== undefined) {
                rules.uniqueItems = field.validation.uniqueItems;
            }
        }

        // Add this field's rule
        const fieldRule: FieldRule = { 
            field, 
            rules, 
            depth, 
            parentKey,
            isArrayItem
        };
        results.push(fieldRule);

        // Recursively process itemFields (for arrays with object items)
        if (field.itemFields && field.itemFields.length > 0) {
            field.itemFields.forEach((itemField: FormField) => {
                const nestedRules = extractFieldRulesRecursive(
                    itemField,
                    depth + 1,
                    field.key,
                    true // Mark as array item
                );
                results.push(...nestedRules);
            });
        }

        // Recursively process objectFields (for nested objects)
        if (field.objectFields && field.objectFields.length > 0) {
            field.objectFields.forEach((objField: FormField) => {
                const nestedRules = extractFieldRulesRecursive(
                    objField,
                    depth + 1,
                    field.key,
                    false
                );
                results.push(...nestedRules);
            });
        }

        return results;
    };

    // Extract all rules from schema fields recursively
    const extractFieldRules = () => {
        const requiredFields: FieldRule[] = [];
        const otherFields: FieldRule[] = [];
        const formatFields: FieldRule[] = [];

        // Process all top-level fields recursively
        schema.formFields?.forEach((field: FormField) => {
            const allFieldRules = extractFieldRulesRecursive(field, 0);
            
            // Categorize each rule
            allFieldRules.forEach((fieldRule) => {
                const hasFormat = !!(
                    fieldRule.rules.pattern ||
                    fieldRule.rules.minLength !== undefined ||
                    fieldRule.rules.maxLength !== undefined ||
                    fieldRule.rules.format
                );

                if (hasFormat) {
                    formatFields.push(fieldRule);
                } else if (fieldRule.rules.required) {
                    requiredFields.push(fieldRule);
                } else {
                    otherFields.push(fieldRule);
                }
            });
        });

        return { requiredFields, otherFields, formatFields };
    };

    const { requiredFields, otherFields, formatFields } = extractFieldRules();



    // Build a tree of all field keys for hierarchical autocomplete
    const allFieldKeys = useMemo(() => {
        const all = [...requiredFields, ...otherFields, ...formatFields];
        const keys = all.map(f => f.field.key);
        return keys;
    }, [requiredFields, otherFields, formatFields]);

    // Given a prefix (e.g. "foo.bar"), return next possible segments
    function getNextKeySegments(prefix: string): string[] {
        const prefixParts = prefix ? prefix.split('.') : [];
        const suggestions = new Set<string>();
        allFieldKeys.forEach(key => {
            const parts = key.split('.');
            if (prefixParts.length === 0) {
                // Suggest root keys
                if (parts.length > 0) suggestions.add(parts[0]);
            } else if (parts.length > prefixParts.length) {
                let match = true;
                for (let i = 0; i < prefixParts.length; i++) {
                    if (parts[i] !== prefixParts[i]) {
                        match = false;
                        break;
                    }
                }
                if (match) suggestions.add(parts[prefixParts.length]);
            }
        });
        return Array.from(suggestions).sort();
    }

    // Build hierarchical options for autocomplete
    const hierarchicalOptions = useMemo(() => {
        if (!searchTerm) return [];
        const term = searchTerm.trim();
        // If term ends with a dot, show next segments
        if (term.endsWith('.')) {
            return getNextKeySegments(term.slice(0, -1)).map(seg => term + seg);
        }
        // Otherwise, show completions for current segment
        const lastDot = term.lastIndexOf('.');
        const prefix = lastDot >= 0 ? term.slice(0, lastDot) : '';
        const base = lastDot >= 0 ? term.slice(0, lastDot + 1) : '';
        const partial = term.slice(lastDot + 1);
        const segments = getNextKeySegments(prefix);
        return segments
            .filter(seg => seg.startsWith(partial))
            .map(seg => base + seg);
    }, [searchTerm, allFieldKeys]);

    // Filter fields based on search term
    const filterFields = (fields: FieldRule[]) => {
        if (!searchTerm.trim()) return fields;
        const term = searchTerm.toLowerCase();
        
        // Normalize search term (replace [0], [1], etc. with [item] for consistency)
        const normalizedTerm = term.replace(/\[\d+\]/g, '[item]');
        
        return fields.filter(fieldRule => {
            const key = fieldRule.field.key.toLowerCase();
            const label = fieldRule.field.label.toLowerCase();
            const parentKey = (fieldRule.parentKey || '').toLowerCase();
            
            // Check direct matches
            if (key.includes(normalizedTerm) || label.includes(normalizedTerm)) {
                return true;
            }
            
            // Check if searching for a parent path that contains this field
            if (normalizedTerm && key.startsWith(normalizedTerm + '.')) {
                return true;
            }
            
            // Check parent key for nested fields
            if (parentKey && parentKey.includes(normalizedTerm)) {
                return true;
            }
            
            return false;
        });
    };

    const filteredRequiredFields = useMemo(() => filterFields(requiredFields), [requiredFields, searchTerm]);
    const filteredOtherFields = useMemo(() => filterFields(otherFields), [otherFields, searchTerm]);
    const filteredFormatFields = useMemo(() => filterFields(formatFields), [formatFields, searchTerm]);

    // Group required fields by section
    const groupRequiredFieldsBySection = (fields: FieldRule[]): Record<string, FieldRule[]> => {
        return fields.reduce((acc, fieldRule) => {
            const section = fieldRule.field.section || 'General';
            if (!acc[section]) {
                acc[section] = [];
            }
            acc[section].push(fieldRule);
            return acc;
        }, {} as Record<string, FieldRule[]>);
    };

    const groupedRequiredFields = groupRequiredFieldsBySection(filteredRequiredFields);

    // Auto-expand only groups with results when searchTerm changes (must be after filtered fields are defined)
    React.useEffect(() => {
        if (searchTerm) {
            setExpandedGroups({
                required: filteredRequiredFields.length > 0,
                formatRules: filteredFormatFields.length > 0,
                otherRules: filteredOtherFields.length > 0
            });
        } else {
            setExpandedGroups({
                required: false,
                formatRules: false,
                otherRules: false
            });
        }
    }, [searchTerm, filteredRequiredFields.length, filteredFormatFields.length, filteredOtherFields.length]);

    const toggleGroup = (groupName: string) => {
        setExpandedGroups(prev => ({
            ...prev,
            [groupName]: !prev[groupName]
        }));
    };

    const renderRuleChip = (label: string, value: string | number, color: 'primary' | 'secondary' | 'default' = 'default') => (
        <Chip
            label={`${label}: ${value}`}
            size="small"
            color={color}
            sx={{
                fontSize: '0.7rem',
                height: '22px',
                mr: 0.5,
                mb: 0.5
            }}
        />
    );

    const renderFieldRuleCard = (fieldRule: FieldRule, showRequiredBadge: boolean = false) => {
        const { field, rules, depth, parentKey, isArrayItem, minItems, maxItems, uniqueItems } = fieldRule;
        const desc = rules.description || '';
        const isLong = desc.length > 120;
        const isExpanded = expandedDescriptions[field.key] || false;

        // Determine if this is a nested field
        const isNested = depth > 0;
        
        // Generate depth indicator colors
        const depthColors = [
            'rgba(96, 165, 250, 0.05)',  // depth 0 - default blue
            'rgba(139, 92, 246, 0.08)',   // depth 1 - purple tint
            'rgba(236, 72, 153, 0.08)',   // depth 2 - pink tint
            'rgba(245, 158, 11, 0.08)',   // depth 3 - amber tint
            'rgba(16, 185, 129, 0.08)',   // depth 4+ - emerald tint
        ];
        const bgColor = depthColors[Math.min(depth, depthColors.length - 1)];
        
        const borderColors = [
            'rgba(96, 165, 250, 0.2)',   // depth 0
            'rgba(139, 92, 246, 0.3)',    // depth 1
            'rgba(236, 72, 153, 0.3)',    // depth 2
            'rgba(245, 158, 11, 0.3)',    // depth 3
            'rgba(16, 185, 129, 0.3)',    // depth 4+
        ];
        const borderColor = borderColors[Math.min(depth, borderColors.length - 1)];

        return (
            <Card
                key={field.key}
                sx={{
                    backgroundColor: bgColor,
                    border: `1px solid ${borderColor}`,
                    borderRadius: 2,
                    overflow: 'hidden',
                    transition: 'all 0.2s ease',
                    // Visual nesting indicator with left border
                    ...(isNested && {
                        borderLeft: `3px solid ${borderColor}`,
                        ml: Math.min(depth, 3) * 1.5, // Indent nested fields, max 3 levels visually
                    })
                }}
            >
                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                        <Box sx={{ 
                            flexShrink: 0,
                            width: 20,
                            height: 20,
                            borderRadius: '50%',
                            backgroundColor: showRequiredBadge ? 'error.main' : (isArrayItem ? 'secondary.main' : 'primary.main'),
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            mt: 0.25
                        }}>
                            {showRequiredBadge ? (
                                <Typography sx={{ fontSize: 12, color: 'white', fontWeight: 'bold' }}>!</Typography>
                            ) : isArrayItem ? (
                                <Typography sx={{ fontSize: 10, color: 'white', fontWeight: 'bold' }}>[]</Typography>
                            ) : (
                                <RuleIcon sx={{ fontSize: 12, color: 'white' }} />
                            )}
                        </Box>

                        <Box sx={{ flex: 1, minWidth: 0 }}>
                            {/* Field name and label with nesting context */}
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5, flexWrap: 'wrap' }}>
                                <Typography 
                                    variant="subtitle2" 
                                    sx={{ 
                                        color: 'primary.main',
                                        fontWeight: 600
                                    }}
                                >
                                    {field.label}
                                </Typography>
                                {showRequiredBadge && (
                                    <Chip
                                        label="Required"
                                        size="small"
                                        color="error"
                                        sx={{
                                            fontSize: '0.65rem',
                                            height: '18px'
                                        }}
                                    />
                                )}
                                {isArrayItem && (
                                    <Chip
                                        label="Array Item"
                                        size="small"
                                        color="secondary"
                                        variant="outlined"
                                        sx={{
                                            fontSize: '0.6rem',
                                            height: '16px'
                                        }}
                                    />
                                )}
                                {depth > 0 && (
                                    <Chip
                                        label={`Depth ${depth}`}
                                        size="small"
                                        variant="outlined"
                                        sx={{
                                            fontSize: '0.6rem',
                                            height: '16px',
                                            color: 'text.secondary',
                                            borderColor: 'divider'
                                        }}
                                    />
                                )}
                            </Box>

                            {/* Parent context for nested fields */}
                            {parentKey && (
                                <Typography 
                                    variant="caption" 
                                    sx={{ 
                                        display: 'block',
                                        color: 'text.disabled',
                                        fontSize: '0.65rem',
                                        mb: 0.5
                                    }}
                                >
                                    Inside: {parentKey}
                                </Typography>
                            )}

                            {/* Field path */}
                            <Typography 
                                variant="caption" 
                                sx={{ 
                                    display: 'block',
                                    color: 'text.secondary',
                                    fontFamily: 'monospace',
                                    fontSize: '0.7rem',
                                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                    px: 1,
                                    py: 0.5,
                                    borderRadius: 1,
                                    mb: 1
                                }}
                            >
                                {field.key}
                            </Typography>

                            {/* Description with leer más */}
                            {desc && (
                                <Box sx={{ mb: 1.5 }}>
                                    <Typography 
                                        variant="body2" 
                                        sx={{ 
                                            color: 'text.secondary',
                                            fontSize: '0.8rem',
                                            fontStyle: 'italic',
                                            display: 'inline'
                                        }}
                                    >
                                        {isLong && !isExpanded ? desc.slice(0, 120) + '...' : desc}
                                    </Typography>
                                    {isLong && (
                                        <Box component="span" sx={{ ml: 1 }}>
                                            <Typography
                                                variant="caption"
                                                sx={{ color: 'primary.main', cursor: 'pointer', fontWeight: 600 }}
                                                onClick={() => setExpandedDescriptions(prev => ({ ...prev, [field.key]: !isExpanded }))}
                                            >
                                                {isExpanded ? 'read less' : 'read more'}
                                            </Typography>
                                        </Box>
                                    )}
                                </Box>
                            )}

                            {/* Rules chips */}
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                {rules.type && renderRuleChip('Type', rules.type, 'primary')}
                                {rules.format && renderRuleChip('Format', rules.format, 'secondary')}
                                {rules.pattern && (
                                    <Tooltip
                                        title={
                                            <Box sx={{ fontFamily: 'monospace', fontSize: '0.9em', px: 1, py: 0.5 }}>
                                                {rules.pattern}
                                            </Box>
                                        }
                                        arrow
                                        placement="top"
                                    >
                                        <Chip
                                            label={`Pattern: ${rules.pattern}`}
                                            size="small"
                                            sx={{
                                                fontSize: '0.7rem',
                                                height: '22px',
                                                mr: 0.5,
                                                mb: 0.5,
                                                maxWidth: 220,
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap',
                                                cursor: 'pointer',
                                            }}
                                            onClick={() => {
                                                navigator.clipboard.writeText(rules.pattern || '');
                                            }}
                                        />
                                    </Tooltip>
                                )}
                                {rules.minLength !== undefined && renderRuleChip('Min Length', rules.minLength)}
                                {rules.maxLength !== undefined && renderRuleChip('Max Length', rules.maxLength)}
                                {rules.minimum !== undefined && renderRuleChip('Min', rules.minimum)}
                                {rules.maximum !== undefined && renderRuleChip('Max', rules.maximum)}
                                {/* Array-specific rules */}
                                {minItems !== undefined && renderRuleChip('Min Items', minItems, 'secondary')}
                                {maxItems !== undefined && renderRuleChip('Max Items', maxItems, 'secondary')}
                                {uniqueItems && (
                                    <Chip
                                        label="Unique Items"
                                        size="small"
                                        color="secondary"
                                        variant="outlined"
                                        sx={{
                                            fontSize: '0.7rem',
                                            height: '22px',
                                            mr: 0.5,
                                            mb: 0.5
                                        }}
                                    />
                                )}
                                {rules.enum && (
                                    <Chip
                                        label={`Options: ${rules.enum.slice(0, 3).map(opt => opt.label).join(', ')}${rules.enum.length > 3 ? '...' : ''}`}
                                        size="small"
                                        sx={{
                                            fontSize: '0.7rem',
                                            height: '22px',
                                            mr: 0.5,
                                            mb: 0.5
                                        }}
                                    />
                                )}
                            </Box>
                        </Box>

                        {/* Navigation button */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
                            <Tooltip title="Go to field in form" placement="left">
                                <IconButton
                                    size="small"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onNavigateToField(field.key);
                                    }}
                                    sx={{
                                        backgroundColor: 'rgba(96, 165, 250, 0.1)',
                                        color: 'primary.main',
                                        '&:hover': {
                                            backgroundColor: 'rgba(96, 165, 250, 0.2)',
                                        }
                                    }}
                                >
                                    <PlaceIcon sx={{ fontSize: 18 }} />
                                </IconButton>
                            </Tooltip>
                        </Box>
                    </Box>
                </CardContent>
            </Card>
        );
    };

    return (
        <Box sx={{ height: '100%', overflow: 'auto' }}>
            {/* Header Info */}
            <Box sx={{ 
                mb: 3, 
                p: 2, 
                backgroundColor: 'rgba(96, 165, 250, 0.1)',
                borderRadius: 2,
                border: '1px solid rgba(96, 165, 250, 0.2)'
            }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <InfoIcon sx={{ color: 'primary.main', fontSize: 20 }} />
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'primary.main' }}>
                        Schema Rules Overview
                    </Typography>
                </Box>
                <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
                    {schema.metadata.name} - v{schema.metadata.version}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 2 }}>
                    Search by field ID or name, then use the button to navigate to the field in the form.
                </Typography>
                
                {/* Search Field with Hierarchical Autocomplete */}
                <Autocomplete
                    freeSolo
                    options={hierarchicalOptions}
                    inputValue={searchTerm}
                    open={autocompleteOpen && !!searchTerm && hierarchicalOptions.length > 0}
                    onOpen={() => setAutocompleteOpen(true)}
                    onClose={() => setAutocompleteOpen(false)}
                    onInputChange={(_, value, reason) => {
                        setSearchTerm(value);
                        onSearchTermChange?.(value);
                        if (reason === 'clear' || value === '') setAutocompleteOpen(false);
                        else setAutocompleteOpen(true);
                    }}
                    onChange={(_, value, reason) => {
                        if (typeof value === 'string') {
                            setSearchTerm(value);
                            onSearchTermChange?.(value);
                        }
                        // Close dropdown after selection
                        setAutocompleteOpen(false);
                    }}
                    filterOptions={x => x} // No filtering, we already filter
                    renderInput={params => (
                        <TextField
                            {...params}
                            fullWidth
                            size="small"
                            placeholder="Search by field path (e.g. group.key.subkey)"
                            InputProps={{
                                ...params.InputProps,
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon sx={{ color: 'primary.main', fontSize: 20 }} />
                                    </InputAdornment>
                                ),
                                endAdornment: searchTerm && (
                                    <InputAdornment position="end" sx={{ mr: -1.5 }}>
                                        <IconButton
                                            size="small"
                                            onClick={() => {
                                                setSearchTerm('');
                                                onSearchTermChange?.('');
                                            }}
                                            sx={{ padding: 0.5 }}
                                        >
                                            <ClearIcon sx={{ fontSize: 18 }} />
                                        </IconButton>
                                    </InputAdornment>
                                )
                            }}
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                    '&:hover': {
                                        backgroundColor: 'rgba(255, 255, 255, 0.08)',
                                    },
                                    '&.Mui-focused': {
                                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                    }
                                }
                            }}
                        />
                    )}
                    sx={{
                        [`& .${autocompleteClasses.paper}`]: {
                            backgroundColor: '#fff',
                            color: '#222',
                            boxShadow: 3,
                        }
                    }}
                />
            </Box>

            {/* Group 1: Required Fields by Section */}
            <Accordion
                expanded={expandedGroups['required'] || false}
                onChange={() => toggleGroup('required')}
                sx={{
                    mb: 2,
                    backgroundColor: 'rgba(244, 67, 54, 0.03)',
                    border: '1px solid rgba(244, 67, 54, 0.15)',
                    '&:before': {
                        display: 'none',
                    },
                    '& .MuiAccordionSummary-root': {
                        backgroundColor: 'rgba(244, 67, 54, 0.08)',
                        borderBottom: expandedGroups['required'] ? '1px solid rgba(244, 67, 54, 0.2)' : 'none',
                    }
                }}
            >
                <AccordionSummary 
                    expandIcon={<ExpandMoreIcon sx={{ color: 'error.main' }} />}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
                        <CheckCircleIcon sx={{ color: 'error.main', fontSize: 20 }} />
                        <Typography variant="subtitle1" sx={{ 
                            fontWeight: 600,
                            color: 'error.main'
                        }}>
                            Required Attributes
                        </Typography>
                        <Chip
                            label={searchTerm ? `${filteredRequiredFields.length} / ${requiredFields.length}` : `${requiredFields.length} field${requiredFields.length !== 1 ? 's' : ''}`}
                            size="small"
                            sx={{
                                fontSize: '0.7rem',
                                height: 20,
                                backgroundColor: 'rgba(244, 67, 54, 0.2)',
                                color: 'error.main',
                                ml: 'auto'
                            }}
                        />
                    </Box>
                </AccordionSummary>
                <AccordionDetails sx={{ p: 2, pt: 1 }}>
                    {Object.entries(groupedRequiredFields).map(([sectionName, sectionFields]) => (
                        <Box key={sectionName} sx={{ mb: 3 }}>
                            <Typography 
                                variant="subtitle2" 
                                sx={{ 
                                    color: 'text.secondary',
                                    fontWeight: 600,
                                    mb: 1.5,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1
                                }}
                            >
                                <Box sx={{ 
                                    width: 4, 
                                    height: 16, 
                                    backgroundColor: 'error.main',
                                    borderRadius: 1
                                }} />
                                {sectionName}
                                <Chip
                                    label={sectionFields.length}
                                    size="small"
                                    sx={{
                                        fontSize: '0.65rem',
                                        height: '16px',
                                        minWidth: '16px',
                                        ml: 0.5
                                    }}
                                />
                            </Typography>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                {sectionFields.map(fieldRule => renderFieldRuleCard(fieldRule, true))}
                            </Box>
                        </Box>
                    ))}
                </AccordionDetails>
            </Accordion>


            {/* Group 2: Format Rules */}
            <Accordion
                expanded={expandedGroups['formatRules'] || false}
                onChange={() => toggleGroup('formatRules')}
                sx={{
                    mb: 2,
                    backgroundColor: 'rgba(255, 193, 7, 0.03)',
                    border: '1px solid rgba(255, 193, 7, 0.15)',
                    '&:before': {
                        display: 'none',
                    },
                    '& .MuiAccordionSummary-root': {
                        backgroundColor: 'rgba(255, 193, 7, 0.08)',
                        borderBottom: expandedGroups['formatRules'] ? '1px solid rgba(255, 193, 7, 0.2)' : 'none',
                    }
                }}
            >
                <AccordionSummary 
                    expandIcon={<ExpandMoreIcon sx={{ color: 'warning.main' }} />}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
                        <RuleIcon sx={{ color: 'warning.main', fontSize: 20 }} />
                        <Typography variant="subtitle1" sx={{ 
                            fontWeight: 600,
                            color: 'warning.main'
                        }}>
                            Format Rules
                        </Typography>
                        <Chip
                            label={searchTerm ? `${filteredFormatFields.length} / ${formatFields.length}` : `${formatFields.length} field${formatFields.length !== 1 ? 's' : ''}`}
                            size="small"
                            sx={{
                                fontSize: '0.7rem',
                                height: 20,
                                backgroundColor: 'rgba(255, 193, 7, 0.2)',
                                color: 'warning.main',
                                ml: 'auto'
                            }}
                        />
                    </Box>
                </AccordionSummary>
                <AccordionDetails sx={{ p: 2, pt: 1 }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                        {filteredFormatFields.map(fieldRule => renderFieldRuleCard(fieldRule, false))}
                    </Box>
                </AccordionDetails>
            </Accordion>

            {/* Group 3: Other Rules */}
            <Accordion
                expanded={expandedGroups['otherRules'] || false}
                onChange={() => toggleGroup('otherRules')}
                sx={{
                    mb: 2,
                    backgroundColor: 'rgba(96, 165, 250, 0.03)',
                    border: '1px solid rgba(96, 165, 250, 0.15)',
                    '&:before': {
                        display: 'none',
                    },
                    '& .MuiAccordionSummary-root': {
                        backgroundColor: 'rgba(96, 165, 250, 0.08)',
                        borderBottom: expandedGroups['otherRules'] ? '1px solid rgba(96, 165, 250, 0.2)' : 'none',
                    }
                }}
            >
                <AccordionSummary 
                    expandIcon={<ExpandMoreIcon sx={{ color: 'primary.main' }} />}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
                        <RuleIcon sx={{ color: 'primary.main', fontSize: 20 }} />
                        <Typography variant="subtitle1" sx={{ 
                            fontWeight: 600,
                            color: 'primary.main'
                        }}>
                            Other Field Rules
                        </Typography>
                        <Chip
                            label={searchTerm ? `${filteredOtherFields.length} / ${otherFields.length}` : `${otherFields.length} field${otherFields.length !== 1 ? 's' : ''}`}
                            size="small"
                            sx={{
                                fontSize: '0.7rem',
                                height: 20,
                                backgroundColor: 'rgba(96, 165, 250, 0.2)',
                                color: 'primary.main',
                                ml: 'auto'
                            }}
                        />
                    </Box>
                </AccordionSummary>
                <AccordionDetails sx={{ p: 2, pt: 1 }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                        {filteredOtherFields.map(fieldRule => renderFieldRuleCard(fieldRule, false))}
                    </Box>
                </AccordionDetails>
            </Accordion>

            {/* Summary */}
            <Box sx={{ 
                mt: 3, 
                p: 2, 
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                borderRadius: 2,
                border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
                {searchTerm ? (
                    <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center' }}>
                        Showing: <strong>{filteredRequiredFields.length + filteredOtherFields.length}</strong> of <strong>{requiredFields.length + otherFields.length}</strong> fields
                        {' '}(<strong>{filteredRequiredFields.length}</strong> required, <strong>{filteredOtherFields.length}</strong> optional)
                    </Typography>
                ) : (
                    <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center' }}>
                        Total: <strong>{requiredFields.length + otherFields.length}</strong> fields 
                        (<strong>{requiredFields.length}</strong> required, <strong>{otherFields.length}</strong> optional)
                    </Typography>
                )}
            </Box>
        </Box>
    );
};

export default SchemaRulesViewer;
