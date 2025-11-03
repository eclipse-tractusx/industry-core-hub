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

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  Chip,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  Snackbar,
  useMediaQuery,
  useTheme
} from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import FingerprintIcon from '@mui/icons-material/Fingerprint';
import PublicIcon from '@mui/icons-material/Public';
import LabelIcon from '@mui/icons-material/Label';
import CloseIcon from '@mui/icons-material/Close';
import ArrowBackIosIcon from '@mui/icons-material/ArrowBackIos';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import SecurityIcon from '@mui/icons-material/Security';
import LockIcon from '@mui/icons-material/Lock';
import { SubmodelViewer } from '../submodel/SubmodelViewer';

interface SingleTwinResultProps {
  counterPartyId: string;
  singleTwinResult: {
    shell_descriptor: {
      id: string;
      idShort?: string;
      globalAssetId: string;
      assetKind: string;
      assetType: string;
      submodelDescriptors: Array<{
        endpoints: Array<{
          interface: string;
          protocolInformation: {
            href: string;
            endpointProtocol: string;
            endpointProtocolVersion: string[];
            subprotocol: string;
            subprotocolBody: string;
            subprotocolBodyEncoding: string;
            securityAttributes: Array<{
              type: string;
              key: string;
              value: string;
            }>;
          };
        }>;
        idShort: string;
        id: string;
        semanticId: {
          type: string;
          keys: Array<{
            type: string;
            value: string;
          }>;
        };
        supplementalSemanticId: unknown[];
        description: unknown[];
        displayName: unknown[];
      }>;
      specificAssetIds: Array<{
        name: string;
        value: string;
      }>;
    };
    dtr?: {
      connectorUrl: string;
      assetId: string;
    };
  };
}

export const SingleTwinResult: React.FC<SingleTwinResultProps> = ({ counterPartyId, singleTwinResult }) => {
  const [dtrInfoOpen, setDtrInfoOpen] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [allSubmodelsOpen, setAllSubmodelsOpen] = useState(false);
  const [submodelViewerOpen, setSubmodelViewerOpen] = useState(false);
  const [selectedSubmodel, setSelectedSubmodel] = useState<SingleTwinResultProps['singleTwinResult']['shell_descriptor']['submodelDescriptors'][0] | null>(null);
  
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Reset carousel when submodels change
  useEffect(() => {
    if (singleTwinResult?.shell_descriptor?.submodelDescriptors) {
      setCarouselIndex(0);
    }
  }, [singleTwinResult?.shell_descriptor?.submodelDescriptors]);

  // Safety checks to prevent runtime errors
  if (!singleTwinResult || !singleTwinResult.shell_descriptor) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="error">
          Invalid digital twin data: Missing shell descriptor
        </Typography>
      </Box>
    );
  }

  if (!singleTwinResult.shell_descriptor.submodelDescriptors) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="error">
          Invalid digital twin data: Missing submodel descriptors
        </Typography>
      </Box>
    );
  }
  
  // Calculate items per slide for carousel - show fewer items to enable navigation
  const itemsPerSlide = isMobile ? 2 : 3;

  // Parse semantic ID to extract version and model name
  const parseSemanticId = (semanticId: string) => {
    try {
      // Handle different URN formats:
      // urn:bamm:io.catenax.single_level_bom_as_built:3.0.0#SingleLevelBomAsBuilt
      // urn:samm:io.catenax.generic.digital_product_passport:5.0.0#DigitalProductPassport
      
      const parts = semanticId.split(':');
      if (parts.length >= 4) {
        const lastPart = parts[parts.length - 1]; // "3.0.0#SingleLevelBomAsBuilt"
        const [version, modelName] = lastPart.split('#');
        
        // Extract model name from the namespace if no # separator
        let displayName = modelName || '';
        if (!displayName && parts.length >= 3) {
          const namespacePart = parts[parts.length - 2]; // "io.catenax.single_level_bom_as_built"
          const nameParts = namespacePart.split('.');
          displayName = nameParts[nameParts.length - 1]
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
        }
        
        return {
          version: version || 'Unknown',
          name: displayName || 'Unknown Model',
          namespace: parts.slice(2, -1).join(':')
        };
      }
      
      return {
        version: 'Unknown',
        name: 'Unknown Model',
        namespace: semanticId
      };
    } catch (error) {
      console.warn('Error parsing semantic ID:', error);
      return {
        version: 'Unknown',
        name: 'Unknown Model',
        namespace: semanticId
      };
    }
  };

  // Detect and parse verifiable credentials from semantic IDs
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const parseVerifiableCredential = (submodel: any) => {
    if (!submodel.semanticId?.keys) return null;

    const keys = submodel.semanticId.keys;
    
    // Look for verifiable credential patterns
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w3cKey = keys.find((key: any) => key.value?.includes('w3c.github.io/vc-jws') || key.value?.includes('www.w3.org/ns/credentials'));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const submodelKey = keys.find((key: any) => key.type === 'Submodel');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const dataElementKey = keys.find((key: any) => key.type === 'DataElement');
    // Look for additional credential-related keys
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const operationKeys = keys.filter((key: any) => key.type === 'Operation');
    
    if (w3cKey || dataElementKey) {
      // This is a verifiable credential
      let modelName = 'Verifiable Credential';
      let version = 'Unknown';
      let credentialType = 'Unknown';
      let signatureType = null;
      let w3cVersion = 'Unknown';
      
      // Extract model name and version from submodel key
      if (submodelKey?.value) {
        const parsed = parseSemanticId(submodelKey.value);
        modelName = parsed.name;
        version = parsed.version;
      }
      
      // Extract credential type from data element
      if (dataElementKey?.value) {
        const parts = dataElementKey.value.split('#');
        if (parts.length > 1) {
          credentialType = parts[1];
        } else {
          const urlParts = dataElementKey.value.split(':');
          credentialType = urlParts[urlParts.length - 1];
        }
      }
      
      // Extract signature type from operation keys and other sources
      if (operationKeys.length > 0) {
        for (const opKey of operationKeys) {
          if (opKey.value) {
            const parts = opKey.value.split('#');
            if (parts.length > 1) {
              const candidate = parts[1];
              // Look for signature-related terms
              if (candidate.toLowerCase().includes('signature') || candidate.includes('JsonWeb') || candidate.includes('Jws')) {
                signatureType = candidate;
                break;
              }
            }
          }
        }
      }
      
      // If not found in operation keys, look in all keys for signature types
      if (!signatureType) {
        for (const key of keys) {
          if (key.value) {
            // Check for JsonWebSignature patterns
            if (key.value.includes('JsonWebSignature2020') || key.value.includes('JsonWebSignature')) {
              if (key.value.includes('JsonWebSignature2020')) {
                signatureType = 'JWS 2020';
              } else {
                signatureType = 'JsonWebSignature';
              }
              break;
            }
            // Check for other signature patterns
            const parts = key.value.split('#');
            if (parts.length > 1) {
              const candidate = parts[1];
              if (candidate.toLowerCase().includes('signature') || candidate.includes('JsonWeb') || candidate.includes('Jws')) {
                // Format common signature types nicely
                if (candidate.includes('JsonWebSignature2020')) {
                  signatureType = 'JWS 2020';
                } else if (candidate.includes('JsonWebSignature')) {
                  signatureType = 'JsonWebSignature';
                } else {
                  signatureType = candidate;
                }
                break;
              }
            }
            // Also check the URL path for signature type
            if (key.value.includes('/vc-jws-')) {
              signatureType = 'JWS 2020';
              break;
            }
          }
        }
      }
      
      // Extract W3C credential version from URL and fallback signature type
      if (w3cKey?.value) {
        const w3cUrl = w3cKey.value;
        // Handle patterns like: https://www.w3.org/ns/credentials/v2 or https://www.w3.org/ns/credentials/v1.1
        if (w3cUrl.includes('www.w3.org/ns/credentials/')) {
          const versionMatch = w3cUrl.match(/\/v(\d+(?:\.\d+)?)/);
          if (versionMatch) {
            w3cVersion = versionMatch[1]; // Extract just the version number (e.g., "2" or "1.1")
          }
        } else if (w3cUrl.includes('w3c.github.io/vc-jws')) {
          // Handle older GitHub format - try to extract version from path
          const versionMatch = w3cUrl.match(/-(\d{4})/); // Look for year-based versions
          if (versionMatch) {
            w3cVersion = versionMatch[1];
          } else {
            w3cVersion = '2020'; // Default for vc-jws format
          }
          
          // If signature type not found elsewhere, infer from vc-jws URL
          if (!signatureType) {
            signatureType = 'JWS 2020';
          }
        }
      }
      
      return {
        isVerifiable: true,
        modelName,
        version,
        credentialType,
        signatureType,
        w3cVersion,
        w3cUrl: w3cKey?.value,
        submodelUrl: submodelKey?.value,
        dataElementUrl: dataElementKey?.value
      };
    }
    
    return null;
  };

  // Handle carousel navigation
  const handlePrevious = () => {
    setCarouselIndex(prev => Math.max(0, prev - itemsPerSlide));
  };

  const handleNext = () => {
    const maxIndex = Math.max(0, singleTwinResult.shell_descriptor.submodelDescriptors.length - itemsPerSlide);
    setCarouselIndex(prev => Math.min(maxIndex, prev + itemsPerSlide));
  };

  const handleCopyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    });
  };

  // Extract digitalTwinType from specificAssetIds
  const digitalTwinType = singleTwinResult.shell_descriptor.specificAssetIds.find(
    assetId => assetId.name === 'digitalTwinType'
  )?.value || 'Asset Administration Shell';

  const handleViewSubmodels = () => {
    setAllSubmodelsOpen(true);
  };

  const handleRetrieveSubmodel = (submodel: SingleTwinResultProps['singleTwinResult']['shell_descriptor']['submodelDescriptors'][0]) => {
    setSelectedSubmodel(submodel);
    setSubmodelViewerOpen(true);
  };

  return (
    <Box sx={{ 
      width: '100%', 
      px: { xs: 2, md: 4 }, 
      pb: 2,
      height: '100%',
      overflow: 'auto',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Single Twin Results Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        {/* Display displayName if available, otherwise idShort, otherwise display nothing */}
        {(() => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const descriptor = singleTwinResult.shell_descriptor as any;
          const displayName = descriptor.displayName && Array.isArray(descriptor.displayName) && descriptor.displayName.length > 0 
            ? descriptor.displayName[0].text 
            : null;
          const title = displayName || descriptor.idShort;
          
          if (title) {
            return (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: '600', color: 'primary.main' }}>
                  {title}
                </Typography>
                {/* Show asset type if available */}
                {descriptor.assetType && (
                  <Chip
                    label={`Asset Type: ${descriptor.assetType}`}
                    variant="outlined"
                    size="small"
                    sx={{
                      borderColor: 'success.main',
                      color: 'success.main',
                      fontWeight: '600',
                      '& .MuiChip-label': {
                        fontSize: '0.75rem'
                      }
                    }}
                  />
                )}

              </Box>
            );
          }
          return null;
        })()}
        
        {/* DTR Information Button */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 'auto' }}>
          {(() => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const descriptor = singleTwinResult.shell_descriptor as any;
            return descriptor.assetKind && (
              <Chip
                label={`Asset Kind: ${descriptor.assetKind}`}
                variant="outlined"
                size="small"
                sx={{
                  borderColor: 'primary.main',
                  color: 'primary.main',
                  fontWeight: '600',
                  '& .MuiChip-label': {
                    fontSize: '0.75rem'
                  }
                }}
              />
            );
          })()}
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            DTR Details
          </Typography>
          <IconButton
            onClick={() => setDtrInfoOpen(true)}
            sx={{
              color: 'primary.main',
              backgroundColor: 'rgba(25, 118, 210, 0.08)',
              '&:hover': {
                backgroundColor: 'rgba(25, 118, 210, 0.16)'
              }
            }}
          >
            <InfoIcon />
          </IconButton>
        </Box>
      </Box>

      {/* Cards Row - Digital Twin Info and IDs */}
      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        {/* Digital Twin Information Card */}
        <Card sx={{ flex: 1 }}>
          <Box sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: '600', color: 'primary.main' }}>
                Digital Twin Information
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Chip
                  label={digitalTwinType}
                  variant="filled"
                  size="small"
                  sx={{
                    backgroundColor: 'rgba(25, 118, 210, 0.1)',
                    color: 'primary.main',
                    fontWeight: '600',
                    '& .MuiChip-label': {
                      fontSize: '0.75rem'
                    }
                  }}
                />
              </Box>
            </Box>
            
            {/* Description if available */}
            {(() => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const descriptor = singleTwinResult.shell_descriptor as any;
              if (descriptor.description && Array.isArray(descriptor.description) && descriptor.description.length > 0) {
                return (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" sx={{ fontWeight: '600', color: 'text.secondary', mb: 0.5 }}>
                      Description:
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.primary', fontStyle: 'italic' }}>
                      {descriptor.description[0].text}
                      {descriptor.description[0].language && (
                        <Typography component="span" variant="caption" sx={{ color: 'text.secondary', ml: 1 }}>
                          ({descriptor.description[0].language})
                        </Typography>
                      )}
                    </Typography>
                  </Box>
                );
              }
              return null;
            })()}
            
            {/* Asset Identifiers Section */}
            {singleTwinResult.shell_descriptor.specificAssetIds.length > 0 && (
                <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: '600', color: 'text.secondary', mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LabelIcon sx={{ color: 'success.main', fontSize: '1.1rem' }} />
                    Asset Identifiers
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {singleTwinResult.shell_descriptor.specificAssetIds.map((assetId, index) => (
                    <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Chip
                        icon={<LabelIcon />}
                        label={`${assetId.name}: ${assetId.value}`}
                        variant="outlined"
                        size="small"
                        sx={{
                            maxWidth: '400px',
                            '& .MuiChip-label': {
                            fontFamily: 'monospace',
                            fontSize: '0.75rem'
                            },
                            '& .MuiChip-icon': {
                            color: '#000000 !important'
                            }
                        }}
                        />
                        <Tooltip title={`Copy ${assetId.name}`}>
                        <IconButton
                            size="small"
                            onClick={() => handleCopyToClipboard(assetId.value)}
                            sx={{
                            color: 'text.secondary',
                            '&:hover': {
                                color: 'success.main',
                                backgroundColor: 'rgba(76, 175, 80, 0.1)'
                            }
                            }}
                        >
                            <ContentCopyIcon fontSize="small" />
                        </IconButton>
                        </Tooltip>
                    </Box>
                    ))}
                </Box>
                </Box>
            )}
          </Box>
        </Card>

        {/* IDs Card */}
        <Card sx={{ flex: 1 }}>
          <Box sx={{ p: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: '600', color: 'primary.main', mb: 2 }}>
              Identifiers
            </Typography>
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {/* ID Short */}
              {(() => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const descriptor = singleTwinResult.shell_descriptor as any;
                const idShort = descriptor.idShort;
                
                if (idShort) {
                  return (
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: '600', color: 'text.secondary', mb: 0.5 }}>
                        ID Short:
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip
                          icon={<LabelIcon />}
                          label={idShort}
                          variant="outlined"
                          size="small"
                          sx={{
                            maxWidth: '100%',
                            color: 'text.primary',
                            '& .MuiChip-label': {
                              fontFamily: 'monospace',
                              fontSize: '0.75rem'
                            },
                            '& .MuiChip-icon': {
                              color: '#000000 !important'
                            }
                          }}
                        />
                        <Tooltip title="Copy ID Short">
                          <IconButton
                            size="small"
                            onClick={() => handleCopyToClipboard(idShort)}
                            sx={{
                              color: 'text.secondary',
                              '&:hover': {
                                color: 'primary.main',
                                backgroundColor: 'rgba(25, 118, 210, 0.1)'
                              }
                            }}
                          >
                            <ContentCopyIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </Box>
                  );
                }
                return null;
              })()}

              {/* AAS ID */}
              <Box>
                <Typography variant="body2" sx={{ fontWeight: '600', color: 'text.secondary', mb: 0.5 }}>
                  AAS ID:
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Chip
                    icon={<FingerprintIcon />}
                    label={singleTwinResult.shell_descriptor.id}
                    variant="outlined"
                    size="small"
                    sx={{
                      maxWidth: '100%',
                      color: 'text.primary',
                      '& .MuiChip-label': {
                        fontFamily: 'monospace',
                        fontSize: '0.75rem'
                      },
                      '& .MuiChip-icon': {
                        color: '#000000 !important'
                      }
                    }}
                  />
                  <Tooltip title="Copy AAS ID">
                    <IconButton
                      size="small"
                      onClick={() => handleCopyToClipboard(singleTwinResult.shell_descriptor.id)}
                      sx={{
                        color: 'text.secondary',
                        '&:hover': {
                          color: 'primary.main',
                          backgroundColor: 'rgba(25, 118, 210, 0.1)'
                        }
                      }}
                    >
                      <ContentCopyIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>

              {/* Global Asset ID */}
              <Box>
                <Typography variant="body2" sx={{ fontWeight: '600', color: 'text.secondary', mb: 1 }}>
                  Global Asset ID:
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Chip
                    icon={<PublicIcon />}
                    label={singleTwinResult.shell_descriptor.globalAssetId}
                    variant="outlined"
                    size="small"
                    sx={{
                      maxWidth: '100%',
                      color: 'text.primary',
                      '& .MuiChip-label': {
                        fontFamily: 'monospace',
                        fontSize: '0.75rem'
                      },
                      '& .MuiChip-icon': {
                        color: '#000000 !important'
                      }
                    }}
                  />
                  <Tooltip title="Copy Global Asset ID">
                    <IconButton
                      size="small"
                      onClick={() => handleCopyToClipboard(singleTwinResult.shell_descriptor.globalAssetId)}
                      sx={{
                        color: 'text.secondary',
                        '&:hover': {
                          color: 'primary.main',
                          backgroundColor: 'rgba(25, 118, 210, 0.1)'
                        }
                      }}
                    >
                      <ContentCopyIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>
            </Box>
          </Box>
        </Card>
      </Box>

      {/* Submodels Section */}
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: '600', color: 'primary.main' }}>
              Available Submodels
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: '500' }}>
              {singleTwinResult.shell_descriptor.submodelDescriptors.length} submodel(s) available
            </Typography>
          </Box>
          {/* View All Submodels button moved to top right */}
          {singleTwinResult.shell_descriptor.submodelDescriptors.length > 0 && (
            <Button
              variant="outlined"
              onClick={handleViewSubmodels}
              size="small"
              sx={{
                borderRadius: 2,
                textTransform: 'none',
                px: 2,
                py: 0.5,
                fontSize: '0.75rem',
                fontWeight: '500'
              }}
            >
              View All Submodels
            </Button>
          )}
        </Box>

        {singleTwinResult.shell_descriptor.submodelDescriptors.length > 0 && (() => {
          const totalSubmodels = singleTwinResult.shell_descriptor.submodelDescriptors.length;
          const endIndex = Math.min(carouselIndex + itemsPerSlide, totalSubmodels);
          const currentSubmodels = singleTwinResult.shell_descriptor.submodelDescriptors.slice(carouselIndex, endIndex);
          const canGoPrev = carouselIndex > 0;
          const canGoNext = endIndex < totalSubmodels;

          return (
            <Box sx={{ width: '100%', position: 'relative' }}>
              {/* Carousel Container */}
              <Box sx={{ 
                display: 'grid', 
                gridTemplateColumns: `repeat(${currentSubmodels.length}, 1fr)`, 
                gap: 1.5,
                mb: 2,
                transition: 'all 0.3s ease',
                px: totalSubmodels > itemsPerSlide ? 1.5 : 0
              }}>
                {currentSubmodels.map((submodel, index) => {
                  const actualIndex = carouselIndex + index;
                  return (
                    <Card key={actualIndex} sx={{ 
                      display: 'flex', 
                      flexDirection: 'column',
                      border: '1px solid rgba(0, 0, 0, 0.12)',
                      borderRadius: 2,
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        transform: 'translateY(-1px)'
                      }
                    }}>
                      <Box sx={{ p: 2, flex: 1 }}>
                        {/* Header with title and ID in top right */}
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                          <Typography variant="h6" sx={{ fontSize: '0.9rem', fontWeight: '600', color: 'text.primary', flex: 1, pr: 1 }}>
                            {submodel.idShort || `Submodel ${actualIndex + 1}`}
                          </Typography>
                          
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0 }}>
                            {/* Green lock for verifiable credentials with signature type */}
                            {(() => {
                              const verifiableInfo = parseVerifiableCredential(submodel);
                              if (verifiableInfo) {
                                return (
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <Tooltip title={`Secured with ${verifiableInfo.signatureType || 'Digital Signature'}`}>
                                      <LockIcon sx={{ color: 'success.main', fontSize: '1rem' }} />
                                    </Tooltip>
                                    {verifiableInfo.signatureType && (
                                      <Tooltip title={`Signature Type: ${verifiableInfo.signatureType}`}>
                                        <Chip
                                          label={verifiableInfo.signatureType}
                                          size="small"
                                          sx={{
                                            height: '16px',
                                            fontSize: '0.6rem',
                                            backgroundColor: 'rgba(76, 175, 80, 0.1)',
                                            color: 'success.dark',
                                            border: '1px solid rgba(76, 175, 80, 0.3)',
                                            '& .MuiChip-label': {
                                              px: 0.4
                                            }
                                          }}
                                        />
                                      </Tooltip>
                                    )}
                                  </Box>
                                );
                              }
                              return null;
                            })()}
                            
                            {/* ID in top right with copy button */}
                            {submodel.id && (
                              <>
                                <Tooltip title={submodel.id}>
                                  <Typography 
                                    variant="caption" 
                                    sx={{ 
                                      fontSize: '0.65rem', 
                                      color: 'text.secondary',
                                      fontFamily: 'monospace',
                                      backgroundColor: 'rgba(0, 0, 0, 0.04)',
                                      px: 0.5,
                                      py: 0.25,
                                      borderRadius: 0.5,
                                      maxWidth: '100px',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap'
                                    }}
                                  >
                                    {submodel.id.split(':').pop()?.substring(0, 8)}...
                                  </Typography>
                                </Tooltip>
                                <Tooltip title="Copy ID">
                                  <IconButton
                                    size="small"
                                    onClick={() => handleCopyToClipboard(submodel.id)}
                                    sx={{
                                      p: 0.25,
                                      color: 'text.secondary',
                                      '&:hover': {
                                        color: 'primary.main',
                                        backgroundColor: 'rgba(25, 118, 210, 0.1)'
                                      }
                                    }}
                                  >
                                    <ContentCopyIcon sx={{ fontSize: '0.75rem' }} />
                                  </IconButton>
                                </Tooltip>
                              </>
                            )}
                          </Box>
                        </Box>
                        
                        {/* Description if available */}
                        {(() => {
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          const submodelAny = submodel as any;
                          if (submodelAny.description && Array.isArray(submodelAny.description) && submodelAny.description.length > 0) {
                            return (
                              <Box sx={{ mb: 1.5 }}>
                                <Typography variant="caption" sx={{ fontWeight: '600', color: 'text.secondary' }}>
                                  Description:
                                </Typography>
                                <Typography 
                                  variant="body2" 
                                  sx={{ 
                                    fontSize: '0.75rem', 
                                    color: 'text.primary',
                                    fontStyle: 'italic',
                                    mt: 0.5
                                  }}
                                >
                                  {submodelAny.description[0].text}
                                  {submodelAny.description[0].language && (
                                    <Typography component="span" variant="caption" sx={{ color: 'text.secondary', ml: 0.5 }}>
                                      ({submodelAny.description[0].language})
                                    </Typography>
                                  )}
                                </Typography>
                              </Box>
                            );
                          }
                          return null;
                        })()}
                        
                        {submodel.semanticId && submodel.semanticId.keys && submodel.semanticId.keys.length > 0 && (
                          <Box>
                            {/* Check if this is a verifiable credential */}
                            {(() => {
                              const verifiableInfo = parseVerifiableCredential(submodel);
                              
                              if (verifiableInfo) {
                                // Display verifiable credential information
                                return (
                                  <Box>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                      <SecurityIcon sx={{ color: 'warning.main', fontSize: '1rem' }} />
                                      <Typography variant="caption" sx={{ fontWeight: '600', color: 'warning.main' }}>
                                        Verifiable Credential
                                      </Typography>
                                    </Box>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                                      <Chip
                                        label={verifiableInfo.modelName}
                                        size="small"
                                        sx={{
                                          height: '18px',
                                          fontSize: '0.7rem',
                                          backgroundColor: 'rgba(76, 175, 80, 0.1)',
                                          color: 'success.main',
                                          '& .MuiChip-label': {
                                            px: 0.5
                                          }
                                        }}
                                      />
                                      <Chip
                                        label={`v${verifiableInfo.version}`}
                                        size="small"
                                        sx={{
                                          height: '18px',
                                          fontSize: '0.7rem',
                                          backgroundColor: 'rgba(25, 118, 210, 0.1)',
                                          color: 'primary.main',
                                          '& .MuiChip-label': {
                                            px: 0.5
                                          }
                                        }}
                                      />
                                    </Box>
                                    <Typography variant="caption" sx={{ fontWeight: '600', color: 'text.secondary', display: 'block', mb: 0.5 }}>
                                      Credential Type:
                                    </Typography>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                                      <Chip
                                        label={verifiableInfo.credentialType}
                                        size="small"
                                        sx={{
                                          height: '18px',
                                          fontSize: '0.7rem',
                                          backgroundColor: 'rgba(255, 152, 0, 0.1)',
                                          color: 'warning.main',
                                          '& .MuiChip-label': {
                                            px: 0.5
                                          }
                                        }}
                                      />
                                      <Chip
                                        label={`W3C v${verifiableInfo.w3cVersion}`}
                                        size="small"
                                        sx={{
                                          height: '18px',
                                          fontSize: '0.7rem',
                                          backgroundColor: 'rgba(156, 39, 176, 0.15)',
                                          color: '#7B1FA2',
                                          fontWeight: '600',
                                          '& .MuiChip-label': {
                                            px: 0.5
                                          }
                                        }}
                                      />
                                    </Box>
                                  </Box>
                                );
                              } else {
                                // Display regular semantic ID info
                                const firstKey = submodel.semanticId.keys[0];
                                if (firstKey?.value) {
                                  const parsedSemanticId = parseSemanticId(firstKey.value);
                                  return (
                                    <Box sx={{ mb: 1 }}>
                                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                        <Typography variant="caption" sx={{ fontWeight: '600', color: 'text.secondary' }}>
                                          Model:
                                        </Typography>
                                        <Chip
                                          label={parsedSemanticId.name}
                                          size="small"
                                          sx={{
                                            height: '18px',
                                            fontSize: '0.7rem',
                                            backgroundColor: 'rgba(76, 175, 80, 0.1)',
                                            color: 'success.main',
                                            '& .MuiChip-label': {
                                              px: 0.5
                                            }
                                          }}
                                        />
                                        <Chip
                                          label={`v${parsedSemanticId.version}`}
                                          size="small"
                                          sx={{
                                            height: '18px',
                                            fontSize: '0.7rem',
                                            backgroundColor: 'rgba(25, 118, 210, 0.1)',
                                            color: 'primary.main',
                                            '& .MuiChip-label': {
                                              px: 0.5
                                            }
                                          }}
                                        />
                                      </Box>
                                    </Box>
                                  );
                                }
                                return null;
                              }
                            })()}
                            
                            {/* Show additional semantic IDs only if we don't know the model (no chips displayed) */}
                            {(() => {
                              const verifiableInfo = parseVerifiableCredential(submodel);
                              const firstKey = submodel.semanticId.keys[0];
                              const hasKnownModel = verifiableInfo || (firstKey?.value && parseSemanticId(firstKey.value).name !== 'Unknown Model');
                              
                              return !hasKnownModel && submodel.semanticId.keys.length > 0 && (
                                <Box>
                                  <Typography variant="caption" sx={{ fontWeight: '600', color: 'text.secondary' }}>
                                    Additional Semantic IDs:
                                  </Typography>
                                  <Box sx={{ mt: 0.5 }}>
                                    {submodel.semanticId.keys.map((key, keyIndex) => (
                                      <Box key={keyIndex} sx={{ mb: 0.5 }}>
                                        <Typography 
                                          variant="body2" 
                                          sx={{ 
                                            fontSize: '0.7rem', 
                                            color: 'primary.main', 
                                            fontFamily: 'monospace',
                                            wordBreak: 'break-all',
                                            backgroundColor: 'rgba(25, 118, 210, 0.04)',
                                            p: 0.5,
                                            borderRadius: 1
                                          }}
                                        >
                                          {key.value}
                                          {key.type && (
                                            <Typography 
                                              component="span" 
                                              sx={{ 
                                                fontSize: '0.65rem', 
                                                color: 'text.disabled', 
                                                ml: 1,
                                                fontFamily: 'inherit'
                                              }}
                                            >
                                              ({key.type})
                                            </Typography>
                                          )}
                                        </Typography>
                                      </Box>
                                    ))}
                                  </Box>
                                </Box>
                              );
                            })()}
                          </Box>
                        )}
                      </Box>
                      
                      {/* View button at the bottom of each card */}
                      <Box sx={{ p: 2, pt: 0 }}>
                        <Button
                          variant="contained"
                          fullWidth
                          onClick={() => handleRetrieveSubmodel(submodel)}
                          sx={{
                            borderRadius: 2,
                            textTransform: 'none',
                            py: 1,
                            fontSize: '0.85rem',
                            fontWeight: '500'
                          }}
                        >
                          View Details
                        </Button>
                      </Box>
                    </Card>
                  );
                })}
              </Box>

              {/* Carousel Indicators and Navigation */}
              {totalSubmodels > itemsPerSlide && (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mt: 1, gap: 2 }}>
                  {/* Left Arrow */}
                  <IconButton
                    onClick={handlePrevious}
                    disabled={!canGoPrev}
                    size="small"
                    sx={{
                      color: 'text.secondary',
                      '&:hover': {
                        color: 'primary.main',
                        backgroundColor: 'transparent'
                      },
                      '&:disabled': {
                        color: 'action.disabled'
                      }
                    }}
                  >
                    <ArrowBackIosIcon fontSize="small" />
                  </IconButton>
                  
                  {/* Indicators */}
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    {Array.from({ length: Math.ceil(totalSubmodels / itemsPerSlide) }).map((_, pageIndex) => {
                      const isActive = Math.floor(carouselIndex / itemsPerSlide) === pageIndex;
                      return (
                        <Box
                          key={pageIndex}
                          sx={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            backgroundColor: isActive ? 'primary.main' : 'action.disabled',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            '&:hover': {
                              backgroundColor: isActive ? 'primary.dark' : 'action.hover'
                            }
                          }}
                          onClick={() => setCarouselIndex(pageIndex * itemsPerSlide)}
                        />
                      );
                    })}
                    <Typography variant="caption" sx={{ ml: 2, color: 'text.secondary' }}>
                      {Math.floor(carouselIndex / itemsPerSlide) + 1} of {Math.ceil(totalSubmodels / itemsPerSlide)} • {totalSubmodels} total
                    </Typography>
                  </Box>
                  
                  {/* Right Arrow */}
                  <IconButton
                    onClick={handleNext}
                    disabled={!canGoNext}
                    size="small"
                    sx={{
                      color: 'text.secondary',
                      '&:hover': {
                        color: 'primary.main',
                        backgroundColor: 'transparent'
                      },
                      '&:disabled': {
                        color: 'action.disabled'
                      }
                    }}
                  >
                    <ArrowForwardIosIcon fontSize="small" />
                  </IconButton>
                </Box>
              )}
            </Box>
          );
        })()}
      </Box>
      
      {/* Full-Screen All Submodels Dialog */}
      <Dialog
        open={allSubmodelsOpen}
        onClose={() => setAllSubmodelsOpen(false)}
        maxWidth={false}
        fullScreen
        PaperProps={{
          sx: {
            background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
            borderRadius: 0
          }
        }}
      >
        <DialogTitle sx={{ 
          fontWeight: '600', 
          color: 'primary.main',
          borderBottom: '1px solid rgba(0,0,0,0.12)',
          pb: 2,
          px: 3,
          pt: 3,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <Typography variant="h5" sx={{ fontWeight: '600', color: 'primary.main' }}>
            All Submodels ({singleTwinResult.shell_descriptor.submodelDescriptors.length})
          </Typography>
          <IconButton
            onClick={() => setAllSubmodelsOpen(false)}
            sx={{
              color: 'text.secondary',
              '&:hover': {
                backgroundColor: 'rgba(0,0,0,0.04)'
              }
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ px: 3, py: 0, height: '100%', overflow: 'auto' }}>
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
            gap: 2,
            pb: 3,
            pt: 4
          }}>
            {singleTwinResult.shell_descriptor.submodelDescriptors.map((submodel, index) => (
              <Card key={index} sx={{ 
                display: 'flex', 
                flexDirection: 'column',
                border: '1px solid rgba(0, 0, 0, 0.12)',
                borderRadius: 2,
                transition: 'all 0.2s ease',
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                backdropFilter: 'blur(10px)',
                '&:hover': {
                  boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                  transform: 'translateY(-1px)'
                }
              }}>
                <Box sx={{ p: 2, flex: 1 }}>
                  {/* Header with title and ID in top right */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                    <Typography variant="h6" sx={{ fontSize: '0.9rem', fontWeight: '600', color: 'text.primary', flex: 1, pr: 1 }}>
                      {submodel.idShort || `Submodel ${index + 1}`}
                    </Typography>
                    
                    {/* ID in top right with copy button */}
                    {submodel.id && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0 }}>
                        {/* Green lock for verifiable credentials with signature type */}
                        {(() => {
                          const verifiableInfo = parseVerifiableCredential(submodel);
                          if (verifiableInfo) {
                            return (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Tooltip title={`Secured with ${verifiableInfo.signatureType || 'Digital Signature'}`}>
                                  <LockIcon sx={{ color: 'success.main', fontSize: '1rem' }} />
                                </Tooltip>
                                {verifiableInfo.signatureType && (
                                  <Tooltip title={`Signature Type: ${verifiableInfo.signatureType}`}>
                                    <Chip
                                      label={verifiableInfo.signatureType}
                                      size="small"
                                      sx={{
                                        height: '18px',
                                        fontSize: '0.65rem',
                                        backgroundColor: 'rgba(76, 175, 80, 0.1)',
                                        color: 'success.dark',
                                        border: '1px solid rgba(76, 175, 80, 0.3)',
                                        '& .MuiChip-label': {
                                          px: 0.5
                                        }
                                      }}
                                    />
                                  </Tooltip>
                                )}
                              </Box>
                            );
                          }
                          return null;
                        })()}
                        
                        <Tooltip title={submodel.id}>
                          <Typography 
                            variant="caption" 
                            sx={{ 
                              fontSize: '0.7rem', 
                              color: 'text.secondary',
                              fontFamily: 'monospace',
                              backgroundColor: 'rgba(0, 0, 0, 0.04)',
                              px: 0.75,
                              py: 0.5,
                              borderRadius: 0.5,
                              maxWidth: '120px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {submodel.id.split(':').pop()?.substring(0, 12)}...
                          </Typography>
                        </Tooltip>
                        <Tooltip title="Copy ID">
                          <IconButton
                            size="small"
                            onClick={() => handleCopyToClipboard(submodel.id)}
                            sx={{
                              p: 0.5,
                              color: 'text.secondary',
                              '&:hover': {
                                color: 'primary.main',
                                backgroundColor: 'rgba(25, 118, 210, 0.1)'
                              }
                            }}
                          >
                            <ContentCopyIcon sx={{ fontSize: '0.8rem' }} />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    )}
                  </Box>
                  
                  {/* Description if available */}
                  {(() => {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const submodelAny = submodel as any;
                    if (submodelAny.description && Array.isArray(submodelAny.description) && submodelAny.description.length > 0) {
                      return (
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="caption" sx={{ fontWeight: '600', color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 1 }}>
                            Description:
                          </Typography>
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              fontSize: '0.85rem', 
                              color: 'text.primary',
                              fontStyle: 'italic',
                              mt: 0.5,
                              lineHeight: 1.5
                            }}
                          >
                            {submodelAny.description[0].text}
                            {submodelAny.description[0].language && (
                              <Typography component="span" variant="caption" sx={{ color: 'text.secondary', ml: 1 }}>
                                ({submodelAny.description[0].language})
                              </Typography>
                            )}
                          </Typography>
                        </Box>
                      );
                    }
                    return null;
                  })()}
                  
                  {submodel.semanticId && submodel.semanticId.keys && submodel.semanticId.keys.length > 0 && (
                    <Box>
                      {/* Check if this is a verifiable credential */}
                      {(() => {
                        const verifiableInfo = parseVerifiableCredential(submodel);
                        
                        if (verifiableInfo) {
                          // Display verifiable credential information
                          return (
                            <Box sx={{ mb: 2 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                <SecurityIcon sx={{ color: 'warning.main', fontSize: '1.2rem' }} />
                                <Typography variant="caption" sx={{ fontWeight: '600', color: 'warning.main', textTransform: 'uppercase', letterSpacing: 1 }}>
                                  Verifiable Credential
                                </Typography>
                              </Box>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                                <Chip
                                  label={verifiableInfo.modelName}
                                  sx={{
                                    fontSize: '0.8rem',
                                    backgroundColor: 'rgba(76, 175, 80, 0.1)',
                                    color: 'success.main',
                                    fontWeight: '600'
                                  }}
                                />
                                <Chip
                                  label={`Version ${verifiableInfo.version}`}
                                  sx={{
                                    fontSize: '0.8rem',
                                    backgroundColor: 'rgba(25, 118, 210, 0.1)',
                                    color: 'primary.main',
                                    fontWeight: '600'
                                  }}
                                />
                              </Box>
                              <Typography variant="caption" sx={{ fontWeight: '600', color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 1, display: 'block', mb: 1 }}>
                                Credential Type:
                              </Typography>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                                <Chip
                                  label={verifiableInfo.credentialType}
                                  sx={{
                                    fontSize: '0.8rem',
                                    backgroundColor: 'rgba(255, 152, 0, 0.1)',
                                    color: 'warning.main',
                                    fontWeight: '600'
                                  }}
                                />
                                <Chip
                                  label={`W3C v${verifiableInfo.w3cVersion}`}
                                  sx={{
                                    fontSize: '0.8rem',
                                    backgroundColor: 'rgba(156, 39, 176, 0.15)',
                                    color: '#7B1FA2',
                                    fontWeight: '600'
                                  }}
                                />
                              </Box>
                              {verifiableInfo.w3cUrl && (
                                <Box sx={{ mb: 1 }}>
                                  <Typography variant="caption" sx={{ fontWeight: '600', color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 1 }}>
                                    W3C Credential:
                                  </Typography>
                                  <Typography 
                                    variant="body2" 
                                    sx={{ 
                                      fontSize: '0.75rem', 
                                      color: 'text.secondary',
                                      fontFamily: 'monospace',
                                      backgroundColor: 'rgba(0, 0, 0, 0.04)',
                                      p: 1,
                                      borderRadius: 1,
                                      wordBreak: 'break-all',
                                      mt: 0.5
                                    }}
                                  >
                                    {verifiableInfo.w3cUrl}
                                  </Typography>
                                </Box>
                              )}
                            </Box>
                          );
                        } else {
                          // Display regular semantic ID info
                          const firstKey = submodel.semanticId.keys[0];
                          if (firstKey?.value) {
                            const parsedSemanticId = parseSemanticId(firstKey.value);
                            return (
                              <Box sx={{ mb: 2 }}>
                                <Typography variant="caption" sx={{ fontWeight: '600', color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 1 }}>
                                  Model Information:
                                </Typography>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1, mb: 1 }}>
                                  <Chip
                                    label={parsedSemanticId.name}
                                    sx={{
                                      fontSize: '0.8rem',
                                      backgroundColor: 'rgba(76, 175, 80, 0.1)',
                                      color: 'success.main',
                                      fontWeight: '600'
                                    }}
                                  />
                                  <Chip
                                    label={`Version ${parsedSemanticId.version}`}
                                    sx={{
                                      fontSize: '0.8rem',
                                      backgroundColor: 'rgba(25, 118, 210, 0.1)',
                                      color: 'primary.main',
                                      fontWeight: '600'
                                    }}
                                  />
                                </Box>
                                <Typography 
                                  variant="body2" 
                                  sx={{ 
                                    fontSize: '0.75rem', 
                                    color: 'text.secondary',
                                    fontFamily: 'monospace',
                                    backgroundColor: 'rgba(0, 0, 0, 0.04)',
                                    p: 1,
                                    borderRadius: 1,
                                    wordBreak: 'break-all'
                                  }}
                                >
                                  {parsedSemanticId.namespace}
                                </Typography>
                              </Box>
                            );
                          }
                          return null;
                        }
                      })()}
                      
                      {/* Show additional semantic IDs only if we don't know the model (no chips displayed) */}
                      {(() => {
                        const verifiableInfo = parseVerifiableCredential(submodel);
                        const firstKey = submodel.semanticId.keys[0];
                        const hasKnownModel = verifiableInfo || (firstKey?.value && parseSemanticId(firstKey.value).name !== 'Unknown Model');
                        
                        return !hasKnownModel && submodel.semanticId.keys.length > 0 && (
                          <Box>
                            <Typography variant="caption" sx={{ fontWeight: '600', color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 1 }}>
                              Additional Semantic IDs:
                            </Typography>
                            <Box sx={{ mt: 0.5 }}>
                              {submodel.semanticId.keys.map((key, keyIndex) => (
                                <Box key={keyIndex} sx={{ mb: 0.5 }}>
                                  <Typography 
                                    variant="body2" 
                                    sx={{ 
                                      fontSize: '0.8rem', 
                                      color: 'primary.main', 
                                      fontFamily: 'monospace',
                                      wordBreak: 'break-all',
                                      backgroundColor: 'rgba(25, 118, 210, 0.06)',
                                      p: 1,
                                      borderRadius: 1,
                                      border: '1px solid rgba(25, 118, 210, 0.1)'
                                    }}
                                  >
                                    {key.value}
                                    {key.type && (
                                      <Typography 
                                        component="span" 
                                        sx={{ 
                                          fontSize: '0.75rem', 
                                          color: 'text.disabled', 
                                          ml: 1,
                                          fontFamily: 'inherit'
                                        }}
                                      >
                                        ({key.type})
                                      </Typography>
                                    )}
                                  </Typography>
                                </Box>
                              ))}
                            </Box>
                          </Box>
                        );
                      })()}
                    </Box>
                  )}
                </Box>
                
                {/* View button at the bottom of each card */}
                <Box sx={{ p: 2, pt: 0 }}>
                  <Button
                    variant="contained"
                    fullWidth
                    onClick={() => handleRetrieveSubmodel(submodel)}
                    sx={{
                      borderRadius: 2,
                      textTransform: 'none',
                      py: 1,
                      fontSize: '0.85rem',
                      fontWeight: '500',
                      background: 'linear-gradient(45deg, #1976d2 30%, #42a5f5 90%)',
                      '&:hover': {
                        background: 'linear-gradient(45deg, #1565c0 30%, #2196f3 90%)',
                      }
                    }}
                  >
                    View Details
                  </Button>
                </Box>
              </Card>
            ))}
          </Box>
        </DialogContent>
      </Dialog>

      {/* DTR Information Dialog */}
      <Dialog
        open={dtrInfoOpen}
        onClose={() => setDtrInfoOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: '0 20px 60px rgba(0,0,0,0.15)'
          }
        }}
      >
        <DialogTitle sx={{ 
          fontWeight: '600', 
          color: 'primary.main',
          borderBottom: '1px solid rgba(0,0,0,0.12)',
          pb: 2,
          px: 3,
          pt: 3
        }}>
          Digital Twin Registry Information
        </DialogTitle>
        <DialogContent sx={{ px: 3, py: 3 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* DTR Connector URL */}
            <Box sx={{ mt: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: '600', color: 'text.secondary', mb: 1 }}>
                DTR Connector URL:
              </Typography>
              <Typography variant="body2" sx={{ 
                wordBreak: 'break-all', 
                fontFamily: 'monospace', 
                backgroundColor: 'rgba(0,0,0,0.05)', 
                p: 2, 
                borderRadius: 1,
                fontSize: '0.8rem'
              }}>
                {singleTwinResult?.dtr?.connectorUrl}
              </Typography>
            </Box>

            {/* DTR Asset ID */}
            <Box>
              <Typography variant="body2" sx={{ fontWeight: '600', color: 'text.secondary', mb: 1 }}>
                DTR Asset ID:
              </Typography>
              <Typography variant="body2" sx={{ 
                wordBreak: 'break-all', 
                fontFamily: 'monospace', 
                backgroundColor: 'rgba(0,0,0,0.05)', 
                p: 2, 
                borderRadius: 1,
                fontSize: '0.8rem'
              }}>
                {singleTwinResult?.dtr?.assetId}
              </Typography>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, pt: 2 }}>
          <Button
            onClick={() => setDtrInfoOpen(false)}
            variant="contained"
            sx={{
              borderRadius: 2,
              textTransform: 'none',
              px: 3
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Copy Success Snackbar */}
      <Snackbar
        open={copySuccess}
        autoHideDuration={2000}
        onClose={() => setCopySuccess(false)}
        message="ID copied to clipboard!"
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{
          '& .MuiSnackbarContent-root': {
            backgroundColor: 'success.main',
            fontSize: '0.875rem'
          }
        }}
      />

      {/* Submodel Viewer Dialog */}
      {selectedSubmodel && (
        <SubmodelViewer
          open={submodelViewerOpen}
          onClose={() => setSubmodelViewerOpen(false)}
          counterPartyId={counterPartyId}
          shellId={singleTwinResult.shell_descriptor.id}
          dtrConnectorUrl={singleTwinResult.dtr?.connectorUrl}
          submodel={selectedSubmodel}
        />
      )}
    </Box>
  );
};
