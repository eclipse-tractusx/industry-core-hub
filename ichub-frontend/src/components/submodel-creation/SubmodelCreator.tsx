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

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createInitialFormData } from '../../utils/schemaUtils';
import JsonImportDialog from './JsonImportDialog';
import { 
    processValidationErrors, 
    StructuredValidationError,
    ValidationErrorResult 
} from '../../utils/validation-error-manager';
import {
    Dialog,
    DialogContent,
    Box,
    Typography,
    IconButton,
    Grid2,
    Container,
    createTheme,
    ThemeProvider,
    alpha,
    AppBar,
    Toolbar,
    Paper,
    Divider,
    Button,
    Card,
    CardContent,
    Tooltip,
    Chip,
    Badge,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    DialogTitle,
    DialogActions,
    Backdrop,
    CircularProgress,
    LinearProgress
} from '@mui/material';
import {
    Close as CloseIcon,
    ArrowBack as ArrowBackIcon,
    Schema as SchemaIcon,
    Preview as PreviewIcon,
    Save as SaveIcon,
    Code as CodeIcon,
    AccountTree as AccountTreeIcon,
    Fingerprint as FingerprintIcon,
    Inventory as InventoryIcon,
    Error as ErrorIcon,
    ViewModule as ViewModuleIcon,
    DataObject as DataObjectIcon,
    Warning as WarningIcon,
    ChevronRight as ChevronRightIcon,
    ExpandMore as ExpandMoreIcon,
    CheckCircle as CheckCircleIcon,
    Rule as RuleIcon,
    Place as PlaceIcon,
    Search as SearchIcon,
    CleaningServices as CleaningServicesIcon,
    Visibility as VisibilityIcon,
    VisibilityOff as VisibilityOffIcon,
    Edit as EditIcon,
    Upload as UploadIcon
} from '@mui/icons-material';
import { getAvailableSchemas, SchemaDefinition } from '../../schemas';
import { FormField } from '../../schemas/json-schema-interpreter';
import SchemaSelector from './SchemaSelector';
import DynamicForm, { DynamicFormRef } from './DynamicForm';
import JsonPreview from './JsonPreview';
import SchemaRulesViewer from './SchemaRulesViewer';
import ScrollToTopFab from './ScrollToTopFab';
import { ValidationButton } from './ValidationButton';

interface SubmodelCreatorProps {
    open: boolean;
    onClose: () => void;
    onBack: () => void;
    onCreateSubmodel: (submodelData: any) => Promise<void>;
    selectedSchema: SchemaDefinition | null;
    schemaKey: string;
    manufacturerPartId?: string;
    twinId?: string;
    dtrAasId?: string;
    serializedPartTwin?: any; // Complete serialized part twin data
    loading?: boolean;
    initialData?: any;
    saveButtonLabel?: string;
}

// Dark theme matching the application style
const darkTheme = createTheme({
    palette: {
        mode: 'dark',
        primary: {
            main: '#60a5fa',
        },
        secondary: {
            main: '#f48fb1',
        },
        background: {
            default: '#121212',
            paper: 'rgba(0, 0, 0, 0.4)',
        },
        text: {
            primary: '#ffffff',
            secondary: '#b3b3b3',
        },
        danger: {
            danger: undefined,
            dangerHover: undefined,
            dangerBadge: undefined
        },
        textField: {
            placeholderText: undefined,
            helperText: undefined,
            background: undefined,
            backgroundHover: undefined
        },
        chip: {
            release: '',
            active: '',
            inactive: '',
            created: '',
            inReview: '',
            enabled: '',
            default: '',
            bgRelease: '',
            bgActive: '',
            bgInactive: '',
            bgCreated: '',
            bgInReview: '',
            bgEnabled: '',
            bgDefault: '',
            warning: '',
            registered: '',
            bgRegistered: '',
            borderDraft: '',
            black: '',
            none: ''
        }
    },
    components: {
        MuiDialog: {
            styleOverrides: {
                paper: {
                    backgroundColor: '#121212',
                },
            },
        },
        MuiPaper: {
            styleOverrides: {
                root: {
                    backgroundColor: 'rgba(0, 0, 0, 0.4)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                },
            },
        },
    },
});

// Validation state type
type ValidationState = 'initial' | 'validated' | 'errors';

const SubmodelCreator: React.FC<SubmodelCreatorProps> = ({
    open,
    onClose,
    onBack,
    onCreateSubmodel,
    selectedSchema,
    schemaKey,
    manufacturerPartId,
    twinId,
    dtrAasId,
    serializedPartTwin,
    loading = false,
    initialData,
    saveButtonLabel = 'Create Submodel'
}) => {
    const [formData, setFormData] = useState<any>(initialData || {});
    const [requestedActive, setRequestedActive] = useState(false);
    const [clearDialogOpen, setClearDialogOpen] = useState(false);
    const getDefaultJson = () => {
        if (selectedSchema && selectedSchema.formFields) {
            const rootKeys = Array.from(new Set(selectedSchema.formFields.map(f => f.key.split('.')[0])));
            const result: Record<string, any> = {};
            for (const key of rootKeys) {
                const field = selectedSchema.formFields.find(f => f.key === key);
                // Initialize based on sectionType
                if (field?.sectionType === 'primitive') {
                    result[key] = ''; // Primitive sections get empty string
                } else if (field?.type === 'array') {
                    result[key] = []; // Arrays get empty array
                } else {
                    result[key] = {}; // Objects get empty object
                }
            }
            return result;
        }
        return {};
    };
    const [validationErrors, setValidationErrors] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [viewMode, setViewMode] = useState<'json' | 'errors' | 'rules'>('json');
    const [validationState, setValidationState] = useState<ValidationState>('initial');
    const [rulesSearchTerm, setRulesSearchTerm] = useState<string>('');
    const [fieldErrors, setFieldErrors] = useState<Set<string>>(new Set());
    const [directFieldErrors, setDirectFieldErrors] = useState<Set<string>>(new Set());
    const [focusedField, setFocusedField] = useState<string | null>(null);
    const [jsonImportOpen, setJsonImportOpen] = useState(false);
    const [jsonImportError, setJsonImportError] = useState<string | undefined>(undefined);
    const formRef = useRef<DynamicFormRef>(null);
    const containerRef = React.useRef<HTMLDivElement>(null) as React.RefObject<HTMLDivElement>;

    // Unified error processing using the centralized validation-error-manager
    // This provides a single source of truth for both ErrorViewer and DynamicForm
    const processedValidationResult = useMemo<ValidationErrorResult | null>(() => {
        if (validationErrors.length === 0 || !selectedSchema) {
            return null;
        }
        return processValidationErrors(validationErrors, selectedSchema);
    }, [validationErrors, selectedSchema]);

    const handleFieldFocus = (fieldKey: string) => {
        setFocusedField(fieldKey);
        setViewMode((prev) => prev !== 'json' ? 'json' : prev);
    };

    const handleCopy = async (text: string, fieldName: string) => {
        try {
            await navigator.clipboard.writeText(text);
        } catch (error) {
        }
    };

    /**
     * ErrorViewer Component - Displays validation errors using the unified error manager
     * 
     * This component now uses processedValidationResult from the useMemo above,
     * which is processed by the centralized validation-error-manager.
     * This ensures consistency between error display and field highlighting.
     */
    const ErrorViewer: React.FC<{ 
        onNavigateToField: (fieldKey: string) => void,
        onSearchInRules: (fieldKey: string) => void
    }> = ({ onNavigateToField, onSearchInRules }) => {
        
        // State for controlling which error groups are expanded
        const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

        // If no processed errors, show success state
        if (!processedValidationResult || processedValidationResult.errors.length === 0) {
            return (
                <Box sx={{ 
                    display: 'flex', 
                    flexDirection: 'column',
                    alignItems: 'center', 
                    justifyContent: 'center',
                    height: '100%',
                    textAlign: 'center',
                    p: 4
                }}>
                    <Box sx={{ 
                        fontSize: 64, 
                        mb: 2,
                        opacity: 0.5
                    }}>
                        ✅
                    </Box>
                    <Typography variant="h6" sx={{ color: 'success.main', mb: 1, fontWeight: 600 }}>
                        No Validation Errors
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        Your submodel data is valid and ready to submit
                    </Typography>
                </Box>
            );
        }

        const { errors: processedErrors, errorsBySection, sectionsWithErrors } = processedValidationResult;

        // Toggle group expansion
        const toggleGroup = (sectionName: string) => {
            setExpandedGroups(prev => ({
                ...prev,
                [sectionName]: !prev[sectionName]
            }));
        };

        return (
            <Box sx={{ height: '100%', overflow: 'auto' }}>
                {/* Grouped Errors by Section */}
                {Array.from(errorsBySection.entries()).map(([sectionName, sectionErrors]) => {
                    const isExpanded = expandedGroups[sectionName] ?? false; // Default collapsed
                    
                    return (
                        <Accordion
                            key={sectionName}
                            expanded={isExpanded}
                            onChange={() => toggleGroup(sectionName)}
                            sx={{
                                mb: 2,
                                backgroundColor: 'rgba(244, 67, 54, 0.03)',
                                border: '1px solid rgba(244, 67, 54, 0.15)',
                                '&:before': {
                                    display: 'none',
                                },
                                '& .MuiAccordionSummary-root': {
                                    backgroundColor: 'rgba(244, 67, 54, 0.08)',
                                    borderBottom: isExpanded ? '1px solid rgba(244, 67, 54, 0.2)' : 'none',
                                    '&:hover': {
                                        backgroundColor: 'rgba(244, 67, 54, 0.12)',
                                    }
                                }
                            }}
                        >
                            <AccordionSummary 
                                expandIcon={<ExpandMoreIcon sx={{ color: 'error.main' }} />}
                            >
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
                                    <ErrorIcon sx={{ color: 'error.main', fontSize: 20 }} />
                                    <Typography variant="subtitle1" sx={{ 
                                        fontWeight: 600,
                                        color: 'error.main'
                                    }}>
                                        {sectionName}
                                    </Typography>
                                    <Chip
                                        label={`${sectionErrors.length} error${sectionErrors.length !== 1 ? 's' : ''}`}
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
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                    {sectionErrors.map((structuredError: StructuredValidationError, index: number) => (
                                        <Card key={index} sx={{
                                            backgroundColor: 'rgba(244, 67, 54, 0.05)',
                                            border: '1px solid rgba(244, 67, 54, 0.2)',
                                            borderRadius: 2,
                                            overflow: 'hidden',
                                            transition: 'all 0.2s ease'
                                        }}>
                                            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                                                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                                                    <Box sx={{ 
                                                        flexShrink: 0,
                                                        width: 20,
                                                        height: 20,
                                                        borderRadius: '50%',
                                                        backgroundColor: 'error.main',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        mt: 0.25
                                                    }}>
                                                        <WarningIcon sx={{ fontSize: 12, color: 'white' }} />
                                                    </Box>
                                                    
                                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                                        {/* Error message */}
                                                        <Typography 
                                                            variant="body2" 
                                                            sx={{ 
                                                                color: 'error.main',
                                                                lineHeight: 1.4,
                                                                fontWeight: 500,
                                                                mb: 1
                                                            }}
                                                        >
                                                            {structuredError.displayMessage}
                                                        </Typography>
                                                        
                                                        {/* Field path */}
                                                        {structuredError.fullPath && (
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
                                                                    mt: 0.5
                                                                }}
                                                            >
                                                                {structuredError.fullPath}
                                                            </Typography>
                                                        )}
                                                    </Box>
                                                    
                                                    {/* Action buttons */}
                                                    {structuredError.fieldKey && (
                                                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, flexShrink: 0 }}>
                                                            <Tooltip title="Go to field in form" placement="left">
                                                                <IconButton
                                                                    size="small"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        onNavigateToField(structuredError.fieldKey!);
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
                                                            <Tooltip title="Search in schema rules" placement="left">
                                                                <IconButton
                                                                    size="small"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        onSearchInRules(structuredError.fieldKey!);
                                                                    }}
                                                                    sx={{
                                                                        backgroundColor: 'rgba(96, 165, 250, 0.1)',
                                                                        color: 'primary.main',
                                                                        '&:hover': {
                                                                            backgroundColor: 'rgba(96, 165, 250, 0.2)',
                                                                        }
                                                                    }}
                                                                >
                                                                    <SearchIcon sx={{ fontSize: 18 }} />
                                                                </IconButton>
                                                            </Tooltip>
                                                        </Box>
                                                    )}
                                                </Box>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </Box>
                            </AccordionDetails>
                        </Accordion>
                    );
                })}
                
                {/* Overall Summary */}
                <Box sx={{ 
                    mt: 3, 
                    p: 2, 
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: 2,
                    border: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                    <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center', mb: 1 }}>
                        <strong>{processedErrors.length}</strong> validation issue{processedErrors.length !== 1 ? 's' : ''} found across <strong>{sectionsWithErrors.size}</strong> section{sectionsWithErrors.size !== 1 ? 's' : ''}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary', textAlign: 'center', display: 'block' }}>
                        Use the action buttons to navigate to fields or search rules. Expand sections to view details.
                    </Typography>
                </Box>
            </Box>
        );
    };

    // Initialize form data with default values when schema changes
    useEffect(() => {
        if (selectedSchema && open) {
            if (initialData) {
                // Use provided initial data if available
                setFormData(initialData);
                setValidationState('initial');
                setValidationErrors([]);
            } else {
                // Use generic utility to create initial form data structure from schema
                const newInitialData = createInitialFormData(selectedSchema);
                setFormData(newInitialData); // JSON starts with empty objects for required groups using schema keys
                setValidationState('initial');
                setValidationErrors([]);
            }
        }
    }, [selectedSchema, manufacturerPartId, open, initialData]);

    const handleFormChange = (newData: any, changedFieldKey?: string) => {
        setFormData(newData);
        // Siempre que se edite un campo tras validar, volver a estado 'initial' para forzar revalidación
        if (validationState !== 'initial') {
            setValidationState('initial');
        }
        // Limpiar errores de campo editado
        if (changedFieldKey && fieldErrors.has(changedFieldKey)) {
            const newFieldErrors = new Set(fieldErrors);
            newFieldErrors.delete(changedFieldKey);
            setFieldErrors(newFieldErrors);
        }
    };

    // Manual validation function triggered by button click
    const handleValidate = () => {
        if (!selectedSchema?.validate) {
            return;
        }

        const validation = selectedSchema.validate(formData);
        const uniqueErrors = Array.from(new Set(validation.errors));
        setValidationErrors(uniqueErrors);

        // Use the unified validation-error-manager for consistent error processing
        // This ensures both ErrorViewer and DynamicForm use the same logic
        if (uniqueErrors.length > 0) {
            const processed = processValidationErrors(uniqueErrors, selectedSchema);
            // pathsWithErrors includes parents for navigation/highlighting
            setFieldErrors(processed.pathsWithErrors);
            // directErrorPaths only has actual errors (not parents) for marking containers in red
            setDirectFieldErrors(processed.directErrorPaths);
            setValidationState('errors');
            setViewMode('errors'); // Show errors on failed validation
        } else {
            setValidationState('validated');
            setFieldErrors(new Set()); // Clear field errors when valid
            setDirectFieldErrors(new Set());
            setViewMode('json'); // Show JSON on successful validation
        }
    };

    const handleSubmit = async () => {
        // Only allow submission if validation has been performed and passed
        if (!selectedSchema || validationState !== 'validated') {
            return;
        }

        setIsSubmitting(true);
        try {
            await onCreateSubmodel(formData);
        } catch (error) {
            // Error creating submodel
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleNavigateToField = (fieldKey: string) => {
        // Switch to JSON view when navigating to a field
        setViewMode('json');
        
        if (formRef.current) {
            formRef.current.scrollToField(fieldKey);
        }
    };

    const handleSearchInRules = (fieldKey: string) => {
        // Normalize the field key to match schema format (replace [0], [1], etc. with [item])
        // This ensures consistency between error paths and schema paths
        const normalizedKey = fieldKey.replace(/\[\d+\]/g, '[item]');
        
        // Set the search term and switch to rules view
        setRulesSearchTerm(normalizedKey);
        setViewMode('rules');
    };

    // Form is only valid if it has been validated successfully
    const isFormValid = validationState === 'validated' && Object.keys(formData).length > 0;

    // Local loading states for block-level spinners
    const [formLoading, setFormLoading] = useState(false);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [isNavigating, setIsNavigating] = useState(false);
    
    // Handlers for navigation state (used by DynamicForm)
    const handleNavigationStart = () => setIsNavigating(true);
    const handleNavigationEnd = () => setIsNavigating(false);

    // Show global loading if submitting or loading prop is true
    const globalLoading = isSubmitting || loading;

    return (
        <ThemeProvider theme={darkTheme}>
            {/* Global loading overlay */}
            <Backdrop open={!!globalLoading} sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 2 }}>
                <CircularProgress color="inherit" />
            </Backdrop>
            <Dialog
                open={open}
                onClose={onClose}
                fullScreen
                PaperProps={{
                    sx: {
                        backgroundColor: 'background.paper',
                    }
                }}
            >
                {/* Custom App Bar */}
                <AppBar position="relative" elevation={0} sx={{ backgroundColor: '#1e1e1e' }}>
                    <Toolbar sx={{ px: 3 }}>
                        <IconButton 
                            onClick={onBack}
                            color="inherit"
                            sx={{ 
                                mr: 2,
                                p: 1,
                                '&:hover': {
                                    backgroundColor: alpha('#ffffff', 0.1)
                                }
                            }}
                        >
                            <ArrowBackIcon />
                        </IconButton>
                        
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
                            <Box>
                                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                    Create New Submodel - {selectedSchema?.metadata.name}
                                </Typography>
                                <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                                    {twinId ? `For Twin: ${twinId}` : 'Creating new submodel'}
                                    {selectedSchema && ` • SemanticID: ${selectedSchema.metadata.semanticId}`}
                                </Typography>
                            </Box>
                        </Box>                        <IconButton 
                            onClick={onClose} 
                            color="inherit"
                            sx={{ 
                                p: 1.5,
                                '&:hover': {
                                    backgroundColor: alpha('#ffffff', 0.1)
                                }
                            }}
                        >
                            <CloseIcon />
                        </IconButton>
                    </Toolbar>
                </AppBar>

                <DialogContent
                    sx={{ 
                        p: 0,
                        backgroundColor: '#121212',
                        height: 'calc(100vh - 140px)',
                        overflow: 'auto',
                        position: 'relative' // Needed for absolute FAB
                    }}
                    ref={containerRef}
                >
                    <Container
                        maxWidth={false}
                        sx={{ minHeight: '100%', p: 3, display: 'flex', flexDirection: 'column' }}
                    >
                        {/* Header Section - Manufacturer Part ID */}
                        <Paper sx={{ 
                            p: 3, 
                            mb: 3, 
                            backgroundColor: 'rgba(96, 165, 250, 0.1)',
                            border: '1px solid rgba(96, 165, 250, 0.2)',
                            flexShrink: 0
                        }}>
                            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 3 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
                                    <SchemaIcon sx={{ color: 'primary.main', fontSize: 24 }} />
                                    <Box sx={{ flex: 1 }}>
                                        <Typography variant="h6" sx={{ color: 'text.primary', fontWeight: 600, mb: 2 }}>
                                            Target Product
                                        </Typography>
                                        
                                        {/* All IDs as self-contained chips */}
                                        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2, mb: 1 }}>
                                            {/* Manufacturer Part ID */}
                                            <Tooltip title="Click to copy Manufacturer Part ID">
                                                <Chip
                                                    icon={<InventoryIcon />}
                                                    label={`Manufacturer Part ID: ${manufacturerPartId}`}
                                                    variant="outlined"
                                                    size="medium"
                                                    clickable
                                                    onClick={() => handleCopy(manufacturerPartId || '', 'Manufacturer Part ID')}
                                                    sx={{
                                                        height: '36px',
                                                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                                        borderColor: 'rgba(255, 255, 255, 0.3)',
                                                        color: '#ffffff',
                                                        '&:hover': {
                                                            backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                                            borderColor: 'rgba(255, 255, 255, 0.5)'
                                                        },
                                                        '& .MuiChip-icon': {
                                                            color: '#ffffff'
                                                        },
                                                        '& .MuiChip-label': {
                                                            color: '#ffffff !important',
                                                            fontSize: '14px',
                                                            fontWeight: 500,
                                                            px: 1
                                                        }
                                                    }}
                                                />
                                            </Tooltip>

                                            {/* Twin ID */}
                                            {twinId && (
                                                <Tooltip title="Click to copy Twin ID (Global Asset ID)">
                                                    <Chip
                                                        icon={<AccountTreeIcon />}
                                                        label={`Twin ID: ${twinId.startsWith('urn:uuid:') ? twinId : `urn:uuid:${twinId}`}`}
                                                        variant="outlined"
                                                        size="medium"
                                                        clickable
                                                        onClick={() => handleCopy(twinId.startsWith('urn:uuid:') ? twinId : `urn:uuid:${twinId}`, 'Twin ID')}
                                                        sx={{
                                                            height: '36px',
                                                            backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                                            borderColor: 'rgba(255, 255, 255, 0.3)',
                                                            color: '#ffffff',
                                                            '&:hover': {
                                                                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                                                borderColor: 'rgba(255, 255, 255, 0.5)'
                                                            },
                                                            '& .MuiChip-icon': {
                                                                color: '#ffffff'
                                                            },
                                                            '& .MuiChip-label': {
                                                                color: '#ffffff !important',
                                                                fontSize: '14px',
                                                                fontWeight: 500,
                                                                px: 1
                                                            }
                                                        }}
                                                    />
                                                </Tooltip>
                                            )}

                                            {/* AAS ID */}
                                            {dtrAasId && (
                                                <Tooltip title="Click to copy AAS ID">
                                                    <Chip
                                                        icon={<FingerprintIcon />}
                                                        label={`AAS ID: ${dtrAasId.startsWith('urn:uuid:') ? dtrAasId : `urn:uuid:${dtrAasId}`}`}
                                                        variant="outlined"
                                                        size="medium"
                                                        clickable
                                                        onClick={() => handleCopy(dtrAasId.startsWith('urn:uuid:') ? dtrAasId : `urn:uuid:${dtrAasId}`, 'AAS ID')}
                                                        sx={{
                                                            height: '36px',
                                                            backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                                            borderColor: 'rgba(255, 255, 255, 0.3)',
                                                            color: '#ffffff',
                                                            '&:hover': {
                                                                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                                                borderColor: 'rgba(255, 255, 255, 0.5)'
                                                            },
                                                            '& .MuiChip-icon': {
                                                                color: '#ffffff'
                                                            },
                                                            '& .MuiChip-label': {
                                                                color: '#ffffff !important',
                                                                fontSize: '14px',
                                                                fontWeight: 500,
                                                                px: 1
                                                            }
                                                        }}
                                                    />
                                                </Tooltip>
                                            )}

                                            {/* Additional Serialized Part Information */}
                                            {serializedPartTwin && (
                                                <>
                                                    {/* Part Instance ID */}
                                                    {serializedPartTwin.partInstanceId && (
                                                        <Tooltip title="Click to copy Part Instance ID (Serial Number)">
                                                            <Chip
                                                                icon={<FingerprintIcon />}
                                                                label={`Serial Number: ${serializedPartTwin.partInstanceId}`}
                                                                variant="outlined"
                                                                size="medium"
                                                                clickable
                                                                onClick={() => handleCopy(serializedPartTwin.partInstanceId, 'Part Instance ID')}
                                                                sx={{
                                                                    height: '36px',
                                                                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                                                    borderColor: 'rgba(255, 255, 255, 0.3)',
                                                                    color: '#ffffff',
                                                                    '&:hover': {
                                                                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                                                        borderColor: 'rgba(255, 255, 255, 0.5)'
                                                                    },
                                                                    '& .MuiChip-icon': {
                                                                        color: '#ffffff'
                                                                    },
                                                                    '& .MuiChip-label': {
                                                                        color: '#ffffff !important',
                                                                        fontSize: '14px',
                                                                        fontWeight: 500,
                                                                        px: 1
                                                                    }
                                                                }}
                                                            />
                                                        </Tooltip>
                                                    )}

                                                    {/* Part Name */}
                                                    {serializedPartTwin.name && (
                                                        <Chip
                                                            icon={<InventoryIcon />}
                                                            label={`Part Name: ${serializedPartTwin.name}`}
                                                            variant="outlined"
                                                            size="medium"
                                                            sx={{
                                                                height: '36px',
                                                                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                                                borderColor: 'rgba(255, 255, 255, 0.3)',
                                                                color: '#ffffff',
                                                                '& .MuiChip-icon': {
                                                                    color: '#ffffff'
                                                                },
                                                                '& .MuiChip-label': {
                                                                    color: '#ffffff !important',
                                                                    fontSize: '14px',
                                                                    fontWeight: 500,
                                                                    px: 1
                                                                }
                                                            }}
                                                        />
                                                    )}

                                                    {/* Manufacturer ID */}
                                                    {serializedPartTwin.manufacturerId && (
                                                        <Tooltip title="Click to copy Manufacturer ID (BPNL)">
                                                            <Chip
                                                                icon={<PlaceIcon />}
                                                                label={`Manufacturer: ${serializedPartTwin.manufacturerId}`}
                                                                variant="outlined"
                                                                size="medium"
                                                                clickable
                                                                onClick={() => handleCopy(serializedPartTwin.manufacturerId, 'Manufacturer ID')}
                                                                sx={{
                                                                    height: '36px',
                                                                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                                                    borderColor: 'rgba(255, 255, 255, 0.3)',
                                                                    color: '#ffffff',
                                                                    '&:hover': {
                                                                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                                                        borderColor: 'rgba(255, 255, 255, 0.5)'
                                                                    },
                                                                    '& .MuiChip-icon': {
                                                                        color: '#ffffff'
                                                                    },
                                                                    '& .MuiChip-label': {
                                                                        color: '#ffffff !important',
                                                                        fontSize: '14px',
                                                                        fontWeight: 500,
                                                                        px: 1
                                                                    }
                                                                }}
                                                            />
                                                        </Tooltip>
                                                    )}

                                                    {/* VAN */}
                                                    {serializedPartTwin.van && (
                                                        <Tooltip title="Click to copy VAN (Vehicle Anonymized Number)">
                                                            <Chip
                                                                icon={<FingerprintIcon />}
                                                                label={`VAN: ${serializedPartTwin.van}`}
                                                                variant="outlined"
                                                                size="medium"
                                                                clickable
                                                                onClick={() => handleCopy(serializedPartTwin.van, 'VAN')}
                                                                sx={{
                                                                    height: '36px',
                                                                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                                                    borderColor: 'rgba(255, 255, 255, 0.3)',
                                                                    color: '#ffffff',
                                                                    '&:hover': {
                                                                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                                                        borderColor: 'rgba(255, 255, 255, 0.5)'
                                                                    },
                                                                    '& .MuiChip-icon': {
                                                                        color: '#ffffff'
                                                                    },
                                                                    '& .MuiChip-label': {
                                                                        color: '#ffffff !important',
                                                                        fontSize: '14px',
                                                                        fontWeight: 500,
                                                                        px: 1
                                                                    }
                                                                }}
                                                            />
                                                        </Tooltip>
                                                    )}
                                                </>
                                            )}

                                            {/* Twin Status - shows if twin is registered or not */}
                                            {(twinId && dtrAasId) ? (
                                                <Chip 
                                                    icon={<CheckCircleIcon />}
                                                    label="Twin Status: Registered" 
                                                    variant="outlined" 
                                                    size="medium" 
                                                    sx={{ 
                                                        height: '36px',
                                                        color: '#22c55e',
                                                        borderColor: 'rgba(34, 197, 94, 0.5)',
                                                        backgroundColor: 'rgba(34, 197, 94, 0.1)',
                                                        '& .MuiChip-icon': {
                                                            color: '#22c55e'
                                                        },
                                                        '& .MuiChip-label': {
                                                            fontSize: '14px',
                                                            fontWeight: 600,
                                                            px: 2
                                                        }
                                                    }}
                                                />
                                            ) : (
                                                <Chip 
                                                    icon={<WarningIcon />}
                                                    label="Twin Status: Not yet created" 
                                                    variant="outlined" 
                                                    size="medium" 
                                                    sx={{ 
                                                        height: '36px',
                                                        color: '#f59e0b',
                                                        borderColor: 'rgba(245, 158, 11, 0.5)',
                                                        backgroundColor: 'rgba(245, 158, 11, 0.1)',
                                                        '& .MuiChip-icon': {
                                                            color: '#f59e0b'
                                                        },
                                                        '& .MuiChip-label': {
                                                            fontSize: '14px',
                                                            fontWeight: 600,
                                                            px: 2
                                                        }
                                                    }}
                                                />
                                            )}
                                        </Box>
                                    </Box>
                                </Box>
                            </Box>
                        </Paper>

                        {/* Footer Actions - moved up below Target Product */}
                        <Box sx={{
                            mt: 0,
                            mb: 3,
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            py: 1.5,
                            px: 3,
                            backgroundColor: 'rgba(0, 0, 0, 0.2)',
                            borderRadius: 2,
                            border: '1px solid rgba(255, 255, 255, 0.12)',
                            position: 'sticky',
                            top: 0,
                            zIndex: 20,
                            backdropFilter: 'blur(8px)',
                        }}>
                            <Box>
                                {validationState === 'initial' && (
                                    <Typography variant="body2" sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <WarningIcon sx={{ fontSize: 18, color: 'warning.main' }} />
                                        Please validate your form before submitting
                                    </Typography>
                                )}
                                {validationState === 'validated' && (
                                    <Typography variant="body2" sx={{ color: 'success.main', display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <CheckCircleIcon sx={{ fontSize: 18 }} />
                                        Form is valid and ready to submit
                                    </Typography>
                                )}
                                {validationState === 'errors' && (
                                    <Typography variant="body2" sx={{ color: 'error.main', display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <ErrorIcon sx={{ fontSize: 18 }} />
                                        {validationErrors.length} validation error{validationErrors.length !== 1 ? 's' : ''} found - fix and re-validate
                                    </Typography>
                                )}
                            </Box>
                            <Box sx={{ display: 'flex', gap: 0 }}>
                                <ValidationButton
                                    validationState={validationState}
                                    validationErrorsCount={validationErrors.length}
                                    onValidate={handleValidate}
                                    onShowErrors={() => setViewMode('errors')}
                                    tooltipInitial="Click to validate your form data against schema requirements"
                                    tooltipValidated="Form validated successfully - ready to create submodel"
                                    tooltipValidatedHover="Click to re-validate the form with current data"
                                    tooltipErrors={`${validationErrors.length} validation error${validationErrors.length !== 1 ? 's' : ''} found - click to view details`}
                                />
                                <Tooltip 
                                    title={
                                        validationState === 'initial'
                                            ? 'Please validate the form first'
                                            : validationState === 'errors'
                                            ? `Fix ${validationErrors.length} validation error${validationErrors.length !== 1 ? 's' : ''} and re-validate before creating the submodel`
                                            : isSubmitting
                                            ? 'Creating submodel...'
                                            : 'Create submodel with validated data'
                                    }
                                    placement="top"
                                >
                                    <span>
                                        <Button
                                        variant="contained"
                                        size="large"
                                        startIcon={<SaveIcon />}
                                        onClick={handleSubmit}
                                        disabled={!isFormValid || isSubmitting}
                                        sx={{
                                            background: isFormValid && !isSubmitting 
                                                ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)'
                                                : 'rgba(100, 100, 100, 0.3)',
                                            borderRadius: '10px',
                                            textTransform: 'none',
                                            color: '#ffffff',
                                            px: 4,
                                            py: 1.5,
                                            fontSize: '1rem',
                                            fontWeight: 600,
                                            boxShadow: isFormValid && !isSubmitting 
                                                ? '0 4px 16px rgba(34, 197, 94, 0.3)'
                                                : 'none',
                                            marginRight: 2, // Add extra right margin
                                            '&:hover': {
                                                background: isFormValid && !isSubmitting 
                                                    ? 'linear-gradient(135deg, #16a34a 0%, #22c55e 100%)'
                                                    : 'rgba(100, 100, 100, 0.3)',
                                                transform: isFormValid && !isSubmitting ? 'translateY(-1px)' : 'none',
                                                boxShadow: isFormValid && !isSubmitting 
                                                    ? '0 6px 20px rgba(34, 197, 94, 0.4)'
                                                    : 'none',
                                            },
                                            '&:disabled': {
                                                backgroundColor: '#333',
                                                color: 'rgba(255, 255, 255, 0.5)',
                                                cursor: 'not-allowed',
                                            },
                                            transition: 'all 0.2s ease-in-out',
                                        }}
                                    >
                                        {isSubmitting ? `Saving...` : saveButtonLabel}
                                    </Button>
                                    </span>
                                </Tooltip>
                            </Box>
                        </Box>

                        {/* Main Content - Two Panel Layout */}
                        <Box sx={{ flex: 1, display: 'flex', gap: 3, minHeight: '600px', position: 'relative' }}>
                            {/* Left Panel - Form with Independent Scroll */}
                            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                <Card sx={{ 
                                    display: 'flex', 
                                    flexDirection: 'column',
                                    backgroundColor: 'rgba(0, 0, 0, 0.4)',
                                    position: 'relative'
                                }}>
                                    {/* Form Header - Sticky */}
                                    <Box sx={{ 
                                        p: 3, 
                                        borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 2,
                                        position: 'sticky',
                                        top: 0,
                                        zIndex: 10,
                                        backgroundColor: 'rgba(0, 0, 0, 0.4)',
                                        backdropFilter: 'blur(10px)'
                                    }}>
                                        <EditIcon sx={{ color: 'primary.main' }} />
                                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                                            <Box>
                                                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                                                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                                        Submodel Configuration
                                                    </Typography>
                                                    {requestedActive && (
                                                        <Typography variant="body2" sx={{ color: 'error.main', fontWeight: 600 }}>
                                                                • Displaying Required Only
                                                        </Typography>
                                                    )}
                                                </Box>
                                                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                                    Fill in the details for your {selectedSchema?.metadata.name} submodel
                                                </Typography>

                                                
                                            </Box>
                                            <Box sx={{ display: 'flex', gap: 1 }}>
                                                {/* REQUESTED button (left of IMPORT) */}
                                                <Button
                                                    variant={requestedActive ? 'contained' : 'outlined'}
                                                    size="small"
                                                    color={requestedActive ? 'primary' : 'inherit'}
                                                    startIcon={requestedActive ? <VisibilityIcon /> : <VisibilityOffIcon />}
                                                    sx={{ px: 2 }}
                                                    onClick={() => setRequestedActive(prev => !prev)}
                                                >
                                                    {requestedActive ? 'Display All' : 'Required'}
                                                </Button>
                                                <Button
                                                    variant="outlined"
                                                    size="small"
                                                    onClick={() => setJsonImportOpen(true)}
                                                    startIcon={<UploadIcon />}
                                                >
                                                    IMPORT
                                                </Button>
                                                <Button
                                                    variant="outlined"
                                                    size="small"
                                                    color="error"
                                                    startIcon={<CleaningServicesIcon />}
                                                    onClick={() => setClearDialogOpen(true)}
                                                >
                                                    CLEAR
                                                </Button>
                                    {/* Clear Form Confirmation Dialog */}
                                    <Dialog open={clearDialogOpen} onClose={() => setClearDialogOpen(false)}>
                                        <DialogTitle>Clear Form</DialogTitle>
                                        <DialogContent>
                                            {JSON.stringify(formData) === JSON.stringify(getDefaultJson()) ? (
                                                <Typography>The form is already empty.</Typography>
                                            ) : (
                                                <Typography>Are you sure you want to clear all form fields? This will reset the form to its base values, but will not remove the JSON view content.</Typography>
                                            )}
                                        </DialogContent>
                                        <DialogActions>
                                            {JSON.stringify(formData) === JSON.stringify(getDefaultJson()) ? (
                                                <Button onClick={() => setClearDialogOpen(false)} color="primary" autoFocus>
                                                    Close
                                                </Button>
                                            ) : (
                                                <>
                                                    <Button onClick={() => setClearDialogOpen(false)} color="primary">
                                                        Cancel
                                                    </Button>
                                                    <Button
                                                        onClick={() => {
                                                            setFormData(getDefaultJson());
                                                            setValidationState('initial');
                                                            setValidationErrors([]);
                                                            setFieldErrors(new Set());
                                                            setViewMode('json');
                                                            setClearDialogOpen(false);
                                                        }}
                                                        color="error"
                                                        variant="contained"
                                                        startIcon={<CleaningServicesIcon />}
                                                    >
                                                        Clear Form
                                                    </Button>
                                                </>
                                            )}
                                        </DialogActions>
                                    </Dialog>
                                            </Box>
                                        </Box>

                                    {/* JSON Import Dialog */}
                                    <JsonImportDialog
                                        open={jsonImportOpen}
                                        onClose={() => { setJsonImportOpen(false); setJsonImportError(undefined); }}
                                        onImport={(json: any) => {
                                            setJsonImportError(undefined);
                                            if (!selectedSchema) return;
                                            setFormData(json);
                                            setValidationState('initial'); // Forzar que vuelva a estado inicial (requiere validar)
                                            setValidationErrors([]);
                                            setFieldErrors(new Set());
                                            setViewMode('json'); // Cambiar a vista JSON
                                            setJsonImportOpen(false);
                                            // If invalid, set error:
                                            // setJsonImportError('Invalid JSON for this schema');
                                        }}
                                        error={jsonImportError}
                                    />
                                    </Box>

                                    {/* Form Content - No scroll logic */}
                                    <Box sx={{ p: 3, position: 'relative' }}>
                                        {formLoading && <LinearProgress sx={{ position: 'absolute', top: 0, left: 0, width: '100%', zIndex: 2 }} />}
                                        
                                        {/* Navigation loading overlay */}
                                        {isNavigating && (
                                            <Box sx={{ 
                                                position: 'absolute', 
                                                top: 0, 
                                                left: 0, 
                                                right: 0, 
                                                bottom: 0, 
                                                backgroundColor: 'rgba(0, 0, 0, 0.3)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                zIndex: 10,
                                                borderRadius: 1
                                            }}>
                                                <Box sx={{ 
                                                    display: 'flex', 
                                                    flexDirection: 'column', 
                                                    alignItems: 'center', 
                                                    gap: 1,
                                                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                                                    px: 3,
                                                    py: 2,
                                                    borderRadius: 2
                                                }}>
                                                    <CircularProgress size={24} color="primary" />
                                                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                                        Navigating to field...
                                                    </Typography>
                                                </Box>
                                            </Box>
                                        )}
                                        
                                        {selectedSchema && (
                                            <DynamicForm
                                                ref={formRef}
                                                schema={selectedSchema}
                                                data={formData}
                                                onChange={handleFormChange}
                                                errors={validationErrors}
                                                fieldErrors={fieldErrors}
                                                directFieldErrors={directFieldErrors}
                                                focusedField={focusedField}
                                                onFieldFocus={handleFieldFocus}
                                                onFieldBlur={() => setFocusedField(null)}
                                                onInfoIconClick={handleSearchInRules}
                                                onlyRequired={requestedActive}
                                                onNavigationStart={handleNavigationStart}
                                                onNavigationEnd={handleNavigationEnd}
                                            />
                                        )}
                                    </Box>
                                </Card>
                            </Box>

                            {/* Right Panel - JSON Preview with Sticky Header */}
                            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                <Card sx={{ 
                                    display: 'flex', 
                                    flexDirection: 'column',
                                    backgroundColor: 'rgba(0, 0, 0, 0.4)',
                                    position: 'relative'
                                }}>
                                    <CardContent sx={{ p: 0, display: 'flex', flexDirection: 'column', position: 'relative' }}>
                                        {previewLoading && <LinearProgress color="secondary" sx={{ position: 'absolute', top: 0, left: 0, width: '100%', zIndex: 2 }} />}
                                        {/* Preview Header - Sticky */}
                                        <Box sx={{ 
                                            p: 3, 
                                            borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            position: 'sticky',
                                            top: 0,
                                            zIndex: 10,
                                            backgroundColor: 'rgba(0, 0, 0, 0.4)',
                                            backdropFilter: 'blur(10px)'
                                        }}>
                                            {/* Left side - Title and description */}
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                                {viewMode === 'json' ? (
                                                    <DataObjectIcon sx={{ color: 'primary.main' }} />
                                                ) : viewMode === 'errors' ? (
                                                    <Badge 
                                                        badgeContent={validationErrors.length} 
                                                        color="error"
                                                        sx={{ 
                                                            '& .MuiBadge-badge': { 
                                                                fontSize: '0.75rem',
                                                                minWidth: '20px',
                                                                height: '20px'
                                                            } 
                                                        }}
                                                    >
                                                        <ErrorIcon sx={{ color: 'error.main' }} />
                                                    </Badge>
                                                ) : (
                                                    <RuleIcon sx={{ color: 'primary.main' }} />
                                                )}
                                                <Box>
                                                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                                        {viewMode === 'json' && 'JSON Preview'}
                                                        {viewMode === 'errors' && 'Validation Errors'}
                                                        {viewMode === 'rules' && 'Schema Rules'}
                                                    </Typography>
                                                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                                        {viewMode === 'json' && 'Real-time preview of your submodel data'}
                                                        {viewMode === 'errors' && `${validationErrors.length} validation issue${validationErrors.length !== 1 ? 's' : ''} found`}
                                                        {viewMode === 'rules' && 'All schema rules and requirements'}
                                                    </Typography>
                                                </Box>
                                            </Box>

                                            {/* Right side - Toggle buttons */}
                                            <Box sx={{ display: 'flex', gap: 1, flexShrink: 0 }}>
                                                {/* JSON Button - No changes */}
                                                <Button
                                                    variant={viewMode === 'json' ? 'contained' : 'outlined'}
                                                    size="small"
                                                    startIcon={<DataObjectIcon />}
                                                    onClick={() => setViewMode('json')}
                                                    sx={{
                                                        minWidth: '80px',
                                                        textTransform: 'none',
                                                        fontSize: '0.875rem',
                                                        ...(viewMode === 'json' && {
                                                            backgroundColor: 'primary.main',
                                                            '&:hover': {
                                                                backgroundColor: 'primary.dark'
                                                            }
                                                        })
                                                    }}
                                                >
                                                    JSON
                                                </Button>

                                                {/* Rules Button - Always visible */}
                                                <Button
                                                    variant={viewMode === 'rules' ? 'contained' : 'outlined'}
                                                    size="small"
                                                    startIcon={<RuleIcon />}
                                                    onClick={() => setViewMode('rules')}
                                                    sx={{
                                                        minWidth: '90px',
                                                        textTransform: 'none',
                                                        fontSize: '0.875rem',
                                                        ...(viewMode === 'rules' && {
                                                            backgroundColor: 'primary.main',
                                                            '&:hover': {
                                                                backgroundColor: 'primary.dark'
                                                            }
                                                        })
                                                    }}
                                                >
                                                    Rules
                                                </Button>
                                            </Box>
                                        </Box>

                                        {/* Preview Content - Dynamic height based on content */}
                                        <Box sx={{ p: 3 }}>
                                            {viewMode === 'json' && (
                                                <JsonPreview data={formData} interactive={true} onNavigateToField={handleNavigateToField} />
                                            )}
                                            {viewMode === 'errors' && (
                                                <ErrorViewer 
                                                    onNavigateToField={handleNavigateToField}
                                                    onSearchInRules={handleSearchInRules}
                                                />
                                            )}
                                            {viewMode === 'rules' && selectedSchema && (
                                                <SchemaRulesViewer 
                                                    schema={selectedSchema}
                                                    onNavigateToField={handleNavigateToField}
                                                    initialSearchTerm={rulesSearchTerm}
                                                    onSearchTermChange={setRulesSearchTerm}
                                                />
                                            )}
                                        </Box>
                                    </CardContent>
                                </Card>
                            </Box>
                        </Box>

                        {/* Footer Actions removed from bottom, now only present below Target Product */}
                        {/* FAB must be rendered as a child of DialogContent, not Container */}
                        {/* So move it outside Container, but inside DialogContent */}
                    </Container>
                    <ScrollToTopFab containerRef={containerRef} />
                </DialogContent>
            </Dialog>
        </ThemeProvider>
    );
};

export default SubmodelCreator;