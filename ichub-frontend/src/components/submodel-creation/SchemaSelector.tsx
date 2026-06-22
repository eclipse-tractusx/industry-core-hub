/********************************************************************************
 * Eclipse Tractus-X - Industry Core Hub Frontend
 *
 * Copyright (c) 2026 LKS Next
 * Copyright (c) 2026 Contributors to the Eclipse Foundation
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
import {
    Dialog,
    DialogContent,
    Box,
    Typography,
    IconButton,
    Card,
    CardContent,
    CardActionArea,
    Grid2,
    Container,
    createTheme,
    ThemeProvider,
    alpha,
    Chip,
    AppBar,
    Toolbar,
    Tooltip,
    Snackbar,
    Alert,
    TextField,
    InputAdornment,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Accordion,
    AccordionSummary,
    AccordionDetails,
} from '@mui/material';
import {
    Close as CloseIcon,
    Schema as SchemaIcon,
    AccountTree as AccountTreeIcon,
    OpenInNew as OpenInNewIcon,
    Search as SearchIcon,
    ExpandMore as ExpandMoreIcon,
} from '@mui/icons-material';
import { SchemaDefinition, SchemaFamily, SchemaVersion, getAllGroups, getGroupedSchemaFamilies } from '../../schemas';
import environmentService from '../../services/EnvironmentService';
import { DualPcfCreationWizard } from '../../features/pcf-kit/shared/components/DualPcfCreationWizard';

// PCF namespace + dual-creation theme color
const PCF_NAMESPACE = 'io.catenax.pcf';
const PCF_PRIMARY = '#10b981';

interface SchemaSelectorProps {
    open: boolean;
    onClose: () => void;
    onSchemaSelect: (schemaKey: string, schema: SchemaDefinition) => void;
    manufacturerPartId?: string;
    /**
     * Called when the dual PCF creation flow (PCF_BACKWARD_COMPATIBILITY_SATURN=true)
     * completes with both validated and reconciled versions.
     * May return a Promise — SchemaSelector will await it and keep the wizard in
     * saving state until the Promise settles.
     */
    onDualSchemaComplete?: (
        v9Data: Record<string, unknown>,
        v7Data: Record<string, unknown>,
    ) => Promise<void> | void;
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
    },
});

const SchemaSelector: React.FC<SchemaSelectorProps> = ({
    open,
    onClose,
    onSchemaSelect,
    manufacturerPartId,
    onDualSchemaComplete
}) => {
    // Feature flag: when enabled, PCF requires dual (v9 + v7) creation
    const backwardCompatibility = environmentService.getFeatureFlags().backwardCompatibility;
    const [dualWizardOpen, setDualWizardOpen] = useState(false);
    const [isDualSaving, setIsDualSaving] = useState(false);
    const [copySuccess, setCopySuccess] = useState(false);
    const [copiedValue, setCopiedValue] = useState<string | null>(null);
    const [expandedMap, setExpandedMap] = useState<Record<string, boolean>>({});
    const [lineClampsMap, setLineClampsMap] = useState<Record<string, number>>({});
    const [overflowMap, setOverflowMap] = useState<Record<string, boolean>>({});
    
    // Refs for measuring card heights
    const cardRefs = useRef<Record<string, HTMLElement | null>>({});
    const titleRefs = useRef<Record<string, HTMLElement | null>>({});
    const versionRefs = useRef<Record<string, HTMLElement | null>>({});
    const descRefs = useRef<Record<string, HTMLElement | null>>({});
    const namespaceRefs = useRef<Record<string, HTMLElement | null>>({});

    // Search & filter state
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedGroup, setSelectedGroup] = useState<string>('all');

    // Per-family selected version: namespace → registry key
    const [selectedVersionMap, setSelectedVersionMap] = useState<Record<string, string>>({});

    const allGroups = useMemo(() => getAllGroups(), []);
    const groupedFamilies = useMemo(() => getGroupedSchemaFamilies(), []);

    // Initialise selectedVersionMap with default (latest) versions
    useEffect(() => {
        const initialMap: Record<string, string> = {};
        for (const families of Object.values(groupedFamilies)) {
            for (const family of families) {
                initialMap[family.namespace] = family.defaultVersionKey;
            }
        }
        setSelectedVersionMap(initialMap);
    }, [groupedFamilies]);

    // Filtered groups/families based on search + group filter
    const filteredGroupedFamilies = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        const result: Record<string, SchemaFamily[]> = {};

        for (const [group, families] of Object.entries(groupedFamilies)) {
            if (selectedGroup !== 'all' && group !== selectedGroup) continue;

            const matchingFamilies = families.filter(family =>
                !query || family.name.toLowerCase().includes(query)
            );

            if (matchingFamilies.length > 0) {
                result[group] = matchingFamilies;
            }
        }
        return result;
    }, [groupedFamilies, searchQuery, selectedGroup]);

    // Calculate optimal line clamps based on card height
    useEffect(() => {
        if (!open) return;
        const timer = setTimeout(() => {
            const newLineClampsMap: Record<string, number> = {};
            const newOverflowMap: Record<string, boolean> = {};
            
            // Measure card dimensions and calculate line clamps
            for (const [namespace, cardEl] of Object.entries(cardRefs.current)) {
                if (!cardEl) continue;
                
                const titleEl = titleRefs.current[namespace];
                const versionEl = versionRefs.current[namespace];
                const descEl = descRefs.current[namespace];
                const namespaceEl = namespaceRefs.current[namespace];
                
                if (!titleEl || !descEl) continue;
                
                // Get heights (use getBoundingClientRect or offsetHeight)
                const titleHeight = titleEl.offsetHeight || 0;
                const versionHeight = versionEl?.offsetHeight || 0;
                const namespaceHeight = namespaceEl?.offsetHeight || 0;
                const padding = 12 * 4; // p: 3 = 12px * 4 sides
                const gaps = 16 + 24 + 24; // gap between elements: mb: 1 (4px) + mb: 1.5 (6px) + mt: 1.5 (6px) ~ estimate
                
                const cardHeight = cardEl.offsetHeight || 0;
                const usedHeight = titleHeight + versionHeight + namespaceHeight + padding + gaps;
                const descHeight = cardHeight - usedHeight;
                
                // Line height is ~1.4 * 0.875rem = ~1.225em, ~17-18px per line
                const lineHeight = 18;
                const availableLines = Math.floor(descHeight / lineHeight);
                
                // Clamp: min 3, max based on title length
                // If title is short (1 line), allow 5-6 lines; if long (2+ lines), allow 3-4 lines
                const titleLines = Math.ceil(titleHeight / 24); // rough line height for h5
                const maxLines = titleLines > 1 ? 3 : 5;
                const clampLines = Math.max(3, Math.min(maxLines, availableLines));
                
                newLineClampsMap[namespace] = clampLines;
                
                // Check if text overflows at clamped height
                if (descEl) {
                    const scrollHeight = descEl.scrollHeight || 0;
                    const clampedHeight = clampLines * lineHeight;
                    newOverflowMap[namespace] = scrollHeight > clampedHeight;
                }
            }
            
            setLineClampsMap(newLineClampsMap);
            setOverflowMap(newOverflowMap);
        }, 100); // Delay to allow DOM to settle
        
        return () => clearTimeout(timer);
    }, [open, filteredGroupedFamilies]);

    const handleCopy = async (value: string, event: React.MouseEvent) => {
        event.stopPropagation(); // Prevent card click
        try {
            await navigator.clipboard.writeText(value);
            setCopiedValue(value);
            setCopySuccess(true);
        } catch (error) {
            console.error('Failed to copy value:', error);
        }
    };

    const toggleExpanded = (namespace: string, event?: React.MouseEvent) => {
        if (event) event.stopPropagation();
        setExpandedMap(prev => ({ ...prev, [namespace]: !prev[namespace] }));
    };

    return (
        <ThemeProvider theme={darkTheme}>
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
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
                            <AccountTreeIcon sx={{ fontSize: 28 }} />
                            <Box>
                                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                    Select Schema for New Submodel
                                </Typography>
                                <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                                    {manufacturerPartId ? `Creating submodel for: ${manufacturerPartId}` : 'Choose a schema template to create your submodel'}
                                </Typography>
                            </Box>
                        </Box>
                        <IconButton 
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

                <DialogContent sx={{ 
                    p: 0,
                    backgroundColor: '#121212',
                    height: 'calc(100vh - 140px)',
                    overflow: 'auto'
                }}>
                    <Container maxWidth="xl" sx={{ py: 4, px: 3, height: '100%' }}>
                        {/* Header */}
                        <Box sx={{ mb: 3 }}>
                            <Typography variant="h5" sx={{ 
                                color: 'text.primary', 
                                mb: 1,
                                fontWeight: 600,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1
                            }}>
                                <SchemaIcon sx={{ color: 'primary.main' }} />
                                Available Schema Templates
                            </Typography>
                            <Typography variant="body1" sx={{ 
                                color: 'text.secondary',
                            }}>
                                Select a schema template to begin creating your submodel. Each template provides a structured 
                                format with predefined fields and validation rules.
                            </Typography>
                        </Box>

                        {/* Search & Filter Bar */}
                        <Box sx={{ display: 'flex', gap: 2, mb: 4, alignItems: 'center' }}>
                            <TextField
                                placeholder="Search schemas by name…"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                size="small"
                                sx={{
                                    flex: 1,
                                    '& .MuiOutlinedInput-root': {
                                        backgroundColor: 'rgba(255,255,255,0.05)',
                                        '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                                        '&:hover fieldset': { borderColor: 'rgba(96,165,250,0.5)' },
                                        '&.Mui-focused fieldset': { borderColor: 'rgba(96,165,250,0.8)' },
                                    },
                                    '& .MuiInputBase-input': { color: 'text.primary' },
                                }}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <SearchIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                                        </InputAdornment>
                                    ),
                                }}
                            />
                            <FormControl size="small" sx={{ minWidth: 180 }}>
                                <InputLabel sx={{ color: 'text.secondary' }}>Group</InputLabel>
                                <Select
                                    value={selectedGroup}
                                    label="Group"
                                    onChange={e => setSelectedGroup(e.target.value)}
                                    sx={{
                                        backgroundColor: 'rgba(255,255,255,0.05)',
                                        color: 'text.primary',
                                        '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.2)' },
                                        '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(96,165,250,0.5)' },
                                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(96,165,250,0.8)' },
                                        '& .MuiSvgIcon-root': { color: 'text.secondary' },
                                    }}
                                    MenuProps={{
                                        PaperProps: {
                                            sx: { backgroundColor: '#1e1e1e', color: 'white' }
                                        }
                                    }}
                                >
                                    <MenuItem value="all">All groups</MenuItem>
                                    {allGroups.map(group => (
                                        <MenuItem key={group} value={group}>{group}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Box>

                        {/* No results */}
                        {Object.keys(filteredGroupedFamilies).length === 0 && (
                            <Box sx={{ textAlign: 'center', py: 8 }}>
                                <Typography variant="h6" sx={{ color: 'text.secondary' }}>
                                    No schemas match your search
                                </Typography>
                            </Box>
                        )}

                        {/* Accordions per group */}
                        {Object.entries(filteredGroupedFamilies).map(([group, families]) => (
                            <Accordion
                                key={group}
                                defaultExpanded
                                disableGutters
                                sx={{
                                    backgroundColor: 'transparent',
                                    backgroundImage: 'none',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '8px !important',
                                    mb: 3,
                                    '&:before': { display: 'none' },
                                    '& .MuiAccordionSummary-root': {
                                        borderRadius: '8px',
                                        minHeight: 52,
                                    }
                                }}
                            >
                                <AccordionSummary
                                    expandIcon={<ExpandMoreIcon sx={{ color: 'text.secondary' }} />}
                                    sx={{
                                        backgroundColor: 'rgba(255,255,255,0.04)',
                                        borderRadius: '8px',
                                        px: 3,
                                        '&.Mui-expanded': {
                                            borderBottomLeftRadius: 0,
                                            borderBottomRightRadius: 0,
                                        }
                                    }}
                                >
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                        <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'text.primary', textTransform: 'capitalize' }}>
                                            {group}
                                        </Typography>
                                        <Chip
                                            label={families.length}
                                            size="small"
                                            sx={{
                                                height: 20,
                                                fontSize: '0.7rem',
                                                backgroundColor: 'rgba(96,165,250,0.2)',
                                                color: 'rgba(96,165,250,0.9)',
                                                fontWeight: 600,
                                            }}
                                        />
                                    </Box>
                                </AccordionSummary>

                                <AccordionDetails sx={{ p: 3 }}>
                                    <Grid2 container spacing={3}>
                                        {families.map((family: SchemaFamily) => {
                                            const activeKey = selectedVersionMap[family.namespace] ?? family.defaultVersionKey;
                                            const activeSchema = family.versions.find((v: SchemaVersion) => v.key === activeKey)?.schema
                                                ?? family.versions[family.versions.length - 1].schema;
                                            const isMultiVersion = family.versions.length > 1;
                                            // Newest version first for display
                                            const versionsNewestFirst = [...family.versions].reverse();
                                            // Dual PCF creation: only for the PCF namespace when backward compatibility is on
                                            const isPcfDual = backwardCompatibility && family.namespace === PCF_NAMESPACE;

                                            return (
                                                <Grid2
                                                    key={family.namespace}
                                                    size={{ xs: 12, sm: 6, md: 4, lg: 3 }}
                                                    sx={{ display: 'flex' }}
                                                >
                                                    <Card data-schema-card={activeKey} sx={{
                                                        width: '100%',
                                                        backgroundColor: 'rgba(0, 0, 0, 0.4)',
                                                        border: '1px solid rgba(255, 255, 255, 0.12)',
                                                        borderRadius: 2,
                                                        transition: 'all 0.3s ease',
                                                        '&:hover': {
                                                            backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                                            border: '1px solid rgba(96, 165, 250, 0.4)',
                                                            transform: 'translateY(-4px)',
                                                            boxShadow: '0 12px 32px rgba(96, 165, 250, 0.2)'
                                                        },
                                                        overflow: 'hidden'
                                                    }}
                                                    ref={(el: HTMLElement | null) => { cardRefs.current[family.namespace] = el; }}
                                                    >
                                                        <CardActionArea
                                                            onClick={() => isPcfDual ? setDualWizardOpen(true) : onSchemaSelect(activeKey, activeSchema)}
                                                            sx={{ height: '100%', p: 0, display: 'flex', alignItems: 'stretch' }}
                                                        >
                                                            <CardContent sx={{ p: 3, width: '100%', display: 'flex', flexDirection: 'column' }}>
                                                                {/* Schema Title */}
                                                                <Typography
                                                                    variant="h5"
                                                                    ref={(el: HTMLElement | null) => { titleRefs.current[family.namespace] = el; }}
                                                                    sx={{
                                                                        color: 'text.primary',
                                                                        fontWeight: 600,
                                                                        mb: 1,
                                                                        fontSize: '1.5rem',
                                                                        lineHeight: 1.3,
                                                                    }}
                                                                >
                                                                    {family.name}
                                                                </Typography>

                                                                {/* Version chip(s) — newest first; dual badge next to version chip */}
                                                                <Box
                                                                    ref={(el: HTMLElement | null) => { versionRefs.current[family.namespace] = el; }}
                                                                    sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1.5, alignItems: 'center' }}>
                                                                    {isPcfDual ? (
                                                                        <>
                                                                            <Chip
                                                                                label="v9.0.0 + v7.0.0"
                                                                                size="small"
                                                                                sx={{
                                                                                    backgroundColor: PCF_PRIMARY,
                                                                                    color: 'white',
                                                                                    fontWeight: 700,
                                                                                    fontSize: '10px',
                                                                                }}
                                                                            />
                                                                            <Chip
                                                                                label="Dual PCF Creation Required"
                                                                                size="small"
                                                                                sx={{
                                                                                    backgroundColor: alpha('#f59e0b', 0.15),
                                                                                    color: '#f59e0b',
                                                                                    border: '1px solid rgba(245, 158, 11, 0.4)',
                                                                                    fontWeight: 600,
                                                                                    fontSize: '0.7rem',
                                                                                }}
                                                                            />
                                                                        </>
                                                                    ) : isMultiVersion ? (
                                                                        versionsNewestFirst.map((v: SchemaVersion) => {
                                                                            const isActive = v.key === activeKey;
                                                                            return (
                                                                                <Chip
                                                                                    key={v.key}
                                                                                    label={`v${v.version}`}
                                                                                    size="small"
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        setSelectedVersionMap(prev => ({
                                                                                            ...prev,
                                                                                            [family.namespace]: v.key
                                                                                        }));
                                                                                    }}
                                                                                    sx={{
                                                                                        fontSize: '10px',
                                                                                        fontWeight: isActive ? 700 : 400,
                                                                                        backgroundColor: isActive ? activeSchema.metadata.color : 'transparent',
                                                                                        color: isActive ? 'white' : alpha(activeSchema.metadata.color, 0.8),
                                                                                        border: `1px solid ${isActive ? activeSchema.metadata.color : alpha(activeSchema.metadata.color, 0.5)}`,
                                                                                        cursor: 'pointer',
                                                                                        transition: 'all 0.2s ease',
                                                                                        '&:hover': {
                                                                                            backgroundColor: isActive ? activeSchema.metadata.color : alpha(activeSchema.metadata.color, 0.2),
                                                                                        }
                                                                                    }}
                                                                                />
                                                                            );
                                                                        })
                                                                    ) : (
                                                                        <Chip
                                                                            label={`v${activeSchema.metadata.version}`}
                                                                            size="small"
                                                                            sx={{
                                                                                backgroundColor: activeSchema.metadata.color,
                                                                                color: 'white',
                                                                                fontWeight: 600,
                                                                                fontSize: '10px',
                                                                            }}
                                                                        />
                                                                    )}
                                                                </Box>

                                                                {/* Description – with dynamic line clamp */}
                                                                <Box sx={{
                                                                    display: 'flex',
                                                                    flex: 1,
                                                                    flexDirection: 'column',
                                                                    minHeight: 0,
                                                                }}>
                                                                    {(() => {
                                                                        const expanded = !!expandedMap[family.namespace];
                                                                        const isOverflowing = !!overflowMap[family.namespace];
                                                                        const lineClamp = lineClampsMap[family.namespace] ?? 3;
                                                                        
                                                                        return (
                                                                            <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                                                                                <Box
                                                                                    ref={(el: HTMLElement | null) => { descRefs.current[family.namespace] = el; }}
                                                                                    id={`desc-${family.namespace}`}
                                                                                    sx={{
                                                                                        flex: 1,
                                                                                        overflow: 'hidden',
                                                                                        color: 'text.secondary',
                                                                                        fontSize: '0.875rem',
                                                                                        lineHeight: 1.4,
                                                                                        whiteSpace: 'pre-line',
                                                                                        display: !expanded ? '-webkit-box' : 'block',
                                                                                        WebkitBoxOrient: !expanded ? 'vertical' : undefined,
                                                                                        WebkitLineClamp: !expanded ? lineClamp : undefined,
                                                                                    }}
                                                                                >
                                                                                    {activeSchema.metadata.description || ''}
                                                                                </Box>
                                                                                {isOverflowing && (
                                                                                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 0.5 }}>
                                                                                        <Box component="span"
                                                                                            onClick={(e: any) => toggleExpanded(family.namespace, e)}
                                                                                            role="button"
                                                                                            tabIndex={0}
                                                                                            aria-expanded={expanded}
                                                                                            aria-controls={`desc-${family.namespace}`}
                                                                                            onKeyDown={(e: any) => {
                                                                                                if (e.key === 'Enter' || e.key === ' ') {
                                                                                                    e.preventDefault();
                                                                                                    toggleExpanded(family.namespace, e);
                                                                                                }
                                                                                            }}
                                                                                            sx={{
                                                                                                background: 'transparent',
                                                                                                border: 'none',
                                                                                                color: 'primary.main',
                                                                                                cursor: 'pointer',
                                                                                                fontSize: '0.75rem',
                                                                                                fontWeight: 600,
                                                                                                px: 0,
                                                                                                textDecoration: 'underline',
                                                                                                '&:hover': { opacity: 0.8 }
                                                                                            }}
                                                                                        >
                                                                                            {expanded ? 'Show less' : 'Read more'}
                                                                                        </Box>
                                                                                    </Box>
                                                                                )}
                                                                            </Box>
                                                                        );
                                                                    })()}
                                                                </Box>

                                                                {/* Namespace Chip — always pinned to bottom */}
                                                                {activeSchema.metadata.namespace && (
                                                                    <Box 
                                                                        ref={(el: HTMLElement | null) => { namespaceRefs.current[family.namespace] = el; }}
                                                                        sx={{ mt: 1.5 }}>
                                                                        <Tooltip
                                                                            title={`Click to copy namespace: ${activeSchema.metadata.namespace}`}
                                                                            placement="top"
                                                                            arrow
                                                                            disableInteractive
                                                                            enterDelay={200}
                                                                            leaveDelay={0}
                                                                        >
                                                                            <Chip
                                                                                component="div"
                                                                                label={activeSchema.metadata.namespace}
                                                                                size="medium"
                                                                                variant="outlined"
                                                                                onClick={(e) => handleCopy(activeSchema.metadata.namespace!, e)}
                                                                                sx={{
                                                                                    fontSize: '10px',
                                                                                    height: '24px',
                                                                                    width: '100%',
                                                                                    borderColor: 'rgba(96, 165, 250, 0.4)',
                                                                                    color: 'rgba(96, 165, 250, 0.9)',
                                                                                    backgroundColor: 'rgba(96, 165, 250, 0.1)',
                                                                                    fontFamily: 'monospace',
                                                                                    cursor: 'pointer',
                                                                                    transition: 'all 0.2s ease',
                                                                                    '&:hover': {
                                                                                        borderColor: 'rgba(96, 165, 250, 0.8)',
                                                                                        backgroundColor: 'rgba(96, 165, 250, 0.2)',
                                                                                        transform: 'scale(1.02)'
                                                                                    },
                                                                                    '& .MuiChip-label': {
                                                                                        px: 1,
                                                                                        overflow: 'hidden',
                                                                                        textOverflow: 'ellipsis',
                                                                                        whiteSpace: 'nowrap'
                                                                                    }
                                                                                }}
                                                                            />
                                                                        </Tooltip>
                                                                    </Box>
                                                                )}
                                                            </CardContent>
                                                        </CardActionArea>
                                                    </Card>
                                                </Grid2>
                                            );
                                        })}

                                        {/* More Schemas Card — only in last group */}
                                        {group === Object.keys(filteredGroupedFamilies)[Object.keys(filteredGroupedFamilies).length - 1] && (
                                            <Grid2 size={{ xs: 12, sm: 6, md: 4, lg: 3 }} sx={{ display: 'flex' }}>
                                                <Card
                                                    sx={{
                                                        width: '100%',
                                                        minHeight: '200px',
                                                        backgroundColor: 'rgba(0, 0, 0, 0.2)',
                                                        border: '2px dashed rgba(255, 255, 255, 0.2)',
                                                        borderRadius: 2,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        transition: 'all 0.3s ease',
                                                        cursor: 'pointer',
                                                        '&:hover': {
                                                            backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                                            border: '2px dashed rgba(96, 165, 250, 0.4)',
                                                        }
                                                    }}
                                                    onClick={() => window.open('https://github.com/eclipse-tractusx/sldt-semantic-models/tree/main', '_blank', 'noopener,noreferrer')}
                                                >
                                                    <CardContent sx={{ textAlign: 'center', p: 3 }}>
                                                        <OpenInNewIcon sx={{ fontSize: 48, color: alpha('#ffffff', 0.3), mb: 2 }} />
                                                        <Typography variant="h6" sx={{ color: alpha('#ffffff', 0.5), fontWeight: 500, mb: 1 }}>
                                                            More Schemas
                                                        </Typography>
                                                        <Typography variant="body2" sx={{ color: alpha('#ffffff', 0.3), fontSize: '0.75rem' }}>
                                                            Browse additional schema templates on GitHub
                                                        </Typography>
                                                    </CardContent>
                                                </Card>
                                            </Grid2>
                                        )}
                                    </Grid2>
                                </AccordionDetails>
                            </Accordion>
                        ))}
                    </Container>
                </DialogContent>
            </Dialog>

            {/* Snackbar for copy confirmation */}
            <Snackbar
                open={copySuccess}
                autoHideDuration={2000}
                onClose={() => setCopySuccess(false)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert
                    onClose={() => setCopySuccess(false)}
                    severity="success"
                    sx={{ width: '100%' }}
                >
                    Copied to clipboard: {copiedValue}
                </Alert>
            </Snackbar>

            {/* Dual PCF creation wizard — shown when PCF_BACKWARD_COMPATIBILITY_SATURN is enabled */}
            {backwardCompatibility && (
                <DualPcfCreationWizard
                    open={dualWizardOpen}
                    onClose={() => { if (!isDualSaving) setDualWizardOpen(false); }}
                    manufacturerPartId={manufacturerPartId}
                    isSaving={isDualSaving}
                    onSaveBoth={async (v9Data, v7Data) => {
                        // The synchronous catalog flow always provides both versions.
                        if (!v9Data || !v7Data) return;
                        setIsDualSaving(true);
                        try {
                            await onDualSchemaComplete?.(v9Data, v7Data);
                            setDualWizardOpen(false);
                            onClose();
                        } finally {
                            setIsDualSaving(false);
                        }
                    }}
                />
            )}
        </ThemeProvider>
    );
};

export default SchemaSelector;
