/********************************************************************************
 * Eclipse Tractus-X - Industry Core Hub Frontend
 *
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

import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Container,
  Grid2,
  Paper,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Typography,
} from '@mui/material';
import { ArrowBack, ArrowForward, CheckCircle, CloudUpload, Hub, VerticalAlignBottom } from '@mui/icons-material';
import { discoverShells } from '@/features/industry-core-kit/part-discovery/api';
import { convertToSerializedParts } from '@/features/industry-core-kit/part-discovery/utils/data-converters';
import { SerializedPartData } from '@/features/industry-core-kit/part-discovery/types/types';
import { fetchPartners } from '@/features/business-partner-kit/partner-management/api';
import { PartnerInstance } from '@/features/business-partner-kit/partner-management/types/types';
import SubmodelCreator from '@/components/submodel-creation/SubmodelCreator';
import { getSchemaBySemanticId } from '@/schemas';
import { createTwinAspect } from '@/features/industry-core-kit/catalog-management/api';
import { fetchSubmodelContent } from '@/features/industry-core-kit/catalog-management/api';
import { fetchAllSerializedPartTwins, fetchAllSerializedParts } from '@/features/industry-core-kit/serialized-parts/api';
import { SerializedPart } from '@/features/industry-core-kit/serialized-parts/types';
import { SerializedPartTwinRead } from '@/features/industry-core-kit/serialized-parts/types/twin-types';
import { getParticipantId } from '@/services/EnvironmentService';
import { darkCardStyles } from '@/features/eco-pass-kit/passport-provision/styles/cardStyles';

interface LocalPartOption extends SerializedPart {
  globalId?: string;
  dtrAasId?: string;
}

const BOM_AS_BUILT_SEMANTIC_ID =
  'urn:samm:io.catenax.single_level_bom_as_built:4.0.0#SingleLevelBomAsBuilt';
const BOM_AS_BUILT_SEMANTIC_ID_ALT =
  'urn:samm:io.catenax.single_level_bom_as_built:4.0.0#SingleLevelBoMAsBuilt';
const BOM_AS_BUILT_URN = 'urn:samm:io.catenax.single_level_bom_as_built:4.0.0';
const BOM_AS_BUILT_SEMANTIC_IDS = new Set([
  BOM_AS_BUILT_SEMANTIC_ID,
  BOM_AS_BUILT_SEMANTIC_ID_ALT,
]);

interface SemanticKeyLike {
  value?: string;
}

interface SubmodelDescriptorLike {
  id?: string;
  submodelId?: string;
  semanticId?: {
    keys?: SemanticKeyLike[];
  };
}

interface ShellDescriptorLike {
  globalAssetId?: string;
  specificAssetIds?: Array<{ name?: string; value?: string }>;
  submodelDescriptors?: SubmodelDescriptorLike[];
}

interface BomChildItem {
  quantity?: {
    value?: unknown;
    unit?: unknown;
  };
  hasAlternatives?: unknown;
  createdOn?: unknown;
  lastModifiedOn?: unknown;
  globalAssetId?: unknown;
  businessPartner?: unknown;
  [key: string]: unknown;
}

const WIZARD_STEPS = [
  'Select Local Part Instance',
  'Find Partner Offered Part Instance',
  'Generate and Edit BoMAsBuilt',
  'Review and Attach Submodel',
];

const ORANGE_PRIMARY = '#ff7a00';
const ORANGE_DARK = '#ff5a00';

type ActiveWizard = 'none' | 'bom-topdown' | 'usage-bottomup';

const TraceabilityPreparationPage: React.FC = () => {
  const selectedSchema = useMemo(() => getSchemaBySemanticId(BOM_AS_BUILT_SEMANTIC_ID) ?? null, []);
  const [activeWizard, setActiveWizard] = useState<ActiveWizard>('none');

  const [activeStep, setActiveStep] = useState(0);
  const [loadingLocalParts, setLoadingLocalParts] = useState(false);
  const [searchingPartnerParts, setSearchingPartnerParts] = useState(false);
  const [attachingSubmodel, setAttachingSubmodel] = useState(false);
  const [generatingDraft, setGeneratingDraft] = useState(false);
  const [attachCompleted, setAttachCompleted] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [localParts, setLocalParts] = useState<LocalPartOption[]>([]);
  const [selectedLocalPart, setSelectedLocalPart] = useState<LocalPartOption | null>(null);

  const [bpnl, setBpnl] = useState('');
  const [availablePartners, setAvailablePartners] = useState<PartnerInstance[]>([]);
  const [isLoadingPartners, setIsLoadingPartners] = useState(false);
  const [partnersError, setPartnersError] = useState(false);
  const [partnerPartResults, setPartnerPartResults] = useState<SerializedPartData[]>([]);
  const [selectedPartnerPart, setSelectedPartnerPart] = useState<SerializedPartData | null>(null);

  const [generatedPayload, setGeneratedPayload] = useState<Record<string, unknown> | null>(null);
  const [draftPayload, setDraftPayload] = useState<Record<string, unknown> | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);

  const orangeButtonSx = {
    background: `linear-gradient(135deg, ${ORANGE_PRIMARY} 0%, ${ORANGE_DARK} 100%)`,
    color: '#fff',
    fontWeight: 600,
    textTransform: 'none' as const,
    borderRadius: '12px',
    boxShadow: '0 6px 22px rgba(255, 122, 0, 0.35)',
    '&:hover': {
      filter: 'brightness(1.05)',
      boxShadow: '0 8px 28px rgba(255, 122, 0, 0.45)',
      transform: 'translateY(-1px)',
    },
  };

  const orangeOutlinedButtonSx = {
    borderColor: `${ORANGE_PRIMARY}88`,
    color: ORANGE_PRIMARY,
    borderWidth: '2px',
    textTransform: 'none' as const,
    borderRadius: '12px',
    '&:hover': {
      borderColor: ORANGE_PRIMARY,
      backgroundColor: 'rgba(255, 122, 0, 0.12)',
      borderWidth: '2px',
    },
  };

  const wizardTextFieldSx = {
    ...darkCardStyles.textField,
    '& .MuiInputLabel-root': {
      color: 'rgba(255, 255, 255, 0.7)',
    },
    '& .MuiInputLabel-root.Mui-focused': {
      color: '#fff',
    },
    '& .MuiOutlinedInput-input': {
      color: '#fff',
    },
    '& .MuiInputBase-input::placeholder': {
      color: 'rgba(255, 255, 255, 0.5)',
      opacity: 1,
    },
    '& .MuiSvgIcon-root': {
      color: 'rgba(255, 255, 255, 0.7)',
    },
  };

  const wizardAutocompleteSlotProps = {
    paper: {
      sx: {
        bgcolor: 'rgba(18, 18, 18, 0.98)',
        color: '#fff',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        '& .MuiAutocomplete-option': {
          color: 'rgba(255, 255, 255, 0.9)',
        },
        '& .MuiAutocomplete-option.Mui-focused': {
          bgcolor: 'rgba(255, 255, 255, 0.08)',
        },
        '& .MuiAutocomplete-option[aria-selected="true"]': {
          bgcolor: 'rgba(255, 122, 0, 0.18)',
        },
      },
    },
  };

  const loadLocalPartInstances = async () => {
    setLoadingLocalParts(true);
    setError(null);

    try {
      const [allParts, allTwins] = await Promise.all([fetchAllSerializedParts(), fetchAllSerializedPartTwins()]);
      const twinMap = new Map<string, SerializedPartTwinRead>(
        allTwins.map((twin) => [
          `${twin.manufacturerId}|${twin.manufacturerPartId}|${twin.partInstanceId}`,
          twin,
        ])
      );

      const merged = allParts.map((part) => {
        const key = `${part.manufacturerId}|${part.manufacturerPartId}|${part.partInstanceId}`;
        const twin = twinMap.get(key);
        return {
          ...part,
          globalId: twin?.globalId,
          dtrAasId: twin?.dtrAasId,
        } as LocalPartOption;
      });

      setLocalParts(merged);
    } catch (loadError) {
      setError('Failed to load local serialized part instances.');
    } finally {
      setLoadingLocalParts(false);
    }
  };

  const loadAvailablePartners = async () => {
    setIsLoadingPartners(true);
    setPartnersError(false);
    try {
      const partners = await fetchPartners();
      setAvailablePartners(partners);
    } catch (loadPartnersError) {
      setPartnersError(true);
      setAvailablePartners([]);
    } finally {
      setIsLoadingPartners(false);
    }
  };

  useEffect(() => {
    loadLocalPartInstances();
    loadAvailablePartners();
  }, []);

  const getSubmodelSemanticIds = (descriptor: SubmodelDescriptorLike): string[] => {
    const keys = descriptor.semanticId?.keys ?? [];
    return keys.map((key) => key.value).filter((value): value is string => Boolean(value));
  };

  const extractGlobalAssetId = (shell: ShellDescriptorLike): string | null => {
    if (shell.globalAssetId) {
      return shell.globalAssetId;
    }

    return shell.specificAssetIds?.find((asset) => asset.name === 'globalAssetId')?.value ?? null;
  };

  const isBomAsBuiltSemanticId = (semanticId: string) => {
    return BOM_AS_BUILT_SEMANTIC_IDS.has(semanticId) || semanticId.startsWith(BOM_AS_BUILT_URN);
  };

  const findExistingBomDescriptors = async (localGlobalAssetId: string) => {
    const participantId = getParticipantId();
    if (!participantId) {
      return [] as Array<{ semanticId: string; submodelId: string }>;
    }

    const discoveryResponse = await discoverShells({
      counterPartyId: participantId,
      querySpec: [{ name: 'digitalTwinType', value: 'PartInstance' }],
      dtrGovernance: [],
      limit: 500,
    });

    if (discoveryResponse.error) {
      throw new Error(discoveryResponse.error);
    }

    const shellDescriptors = (discoveryResponse.shellDescriptors ?? []) as ShellDescriptorLike[];
    const localShell = shellDescriptors.find((shell) => extractGlobalAssetId(shell) === localGlobalAssetId);
    if (!localShell) {
      return [] as Array<{ semanticId: string; submodelId: string }>;
    }

    const descriptors = localShell.submodelDescriptors ?? [];
    return descriptors
      .map((descriptor) => {
        const semanticIds = getSubmodelSemanticIds(descriptor);
        const semanticId = semanticIds.find(isBomAsBuiltSemanticId);
        const submodelId = descriptor.id || descriptor.submodelId;
        if (!semanticId || !submodelId) {
          return null;
        }
        return { semanticId, submodelId };
      })
      .filter((entry): entry is { semanticId: string; submodelId: string } => Boolean(entry));
  };

  const toChildItems = (submodelContent: Record<string, unknown>): BomChildItem[] => {
    const childItems = submodelContent.childItems;
    if (!Array.isArray(childItems)) {
      return [];
    }

    return childItems.filter((item): item is BomChildItem => {
      return typeof item === 'object' && item !== null;
    });
  };

  const childItemDedupKey = (childItem: BomChildItem) => {
    return `${String(childItem.globalAssetId ?? '')}|${String(childItem.businessPartner ?? '')}`;
  };

  const loadExistingChildItems = async (localGlobalAssetId: string) => {
    const descriptors = await findExistingBomDescriptors(localGlobalAssetId);
    if (descriptors.length === 0) {
      return [] as BomChildItem[];
    }

    const existingContent = await Promise.all(
      descriptors.map(async (descriptor) => {
        try {
          const submodelContent = await fetchSubmodelContent(descriptor.semanticId, descriptor.submodelId);
          return toChildItems(submodelContent);
        } catch {
          return [] as BomChildItem[];
        }
      })
    );

    return existingContent.flat();
  };

  const searchPartnerOfferedParts = async () => {
    const trimmedBpnl = bpnl.trim();
    if (!trimmedBpnl) {
      setError('Please provide a partner BPNL.');
      return;
    }

    setSearchingPartnerParts(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await discoverShells({
        counterPartyId: trimmedBpnl,
        querySpec: [{ name: 'digitalTwinType', value: 'PartInstance' }],
        dtrGovernance: [],
        limit: 10,
      });
      if (response.error) {
        throw new Error(response.error);
      }

      const results = convertToSerializedParts(response.shellDescriptors ?? []);
      setPartnerPartResults(results);
      setSelectedPartnerPart(null);

      if (results.length === 0) {
        setError('No offered part instances were found for this partner and search criteria.');
      }
    } catch (searchError) {
      const message = searchError instanceof Error ? searchError.message : 'Partner discovery failed.';
      setError(`Partner discovery failed: ${message}`);
      setPartnerPartResults([]);
    } finally {
      setSearchingPartnerParts(false);
    }
  };

  const buildDefaultPayload = async (
    localPart: LocalPartOption,
    partnerPart: SerializedPartData,
    partnerBpnl: string
  ) => {
    if (!localPart.globalId) {
      throw new Error('Selected local part instance has no registered globalAssetId.');
    }

    const timestamp = new Date().toISOString();
    const existingChildItems = await loadExistingChildItems(localPart.globalId);
    const newChildItem: BomChildItem = {
      quantity: {
        value: 1,
        unit: 'unit:piece',
      },
      hasAlternatives: false,
      createdOn: timestamp,
      lastModifiedOn: timestamp,
      globalAssetId: partnerPart.globalAssetId,
      businessPartner: partnerBpnl,
    };

    const dedupedChildItems = [...existingChildItems, newChildItem].reduce<BomChildItem[]>((acc, childItem) => {
      const key = childItemDedupKey(childItem);
      if (!key || acc.some((existing) => childItemDedupKey(existing) === key)) {
        return acc;
      }
      acc.push(childItem);
      return acc;
    }, []);

    return {
      globalAssetId: localPart.globalId,
      childItems: dedupedChildItems,
    };
  };

  const handleOpenBomAsBuilt = async () => {
    if (!selectedLocalPart?.globalId) {
      setError('Select a registered local part instance first.');
      return;
    }
    if (!selectedPartnerPart) {
      setError('Select an offered part instance from the partner first.');
      return;
    }
    if (!selectedSchema) {
      setError('BoMAsBuilt schema is not available in the schema registry.');
      return;
    }

    setGeneratingDraft(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const payload = await buildDefaultPayload(selectedLocalPart, selectedPartnerPart, bpnl.trim());
      setGeneratedPayload(payload);
      setDraftPayload(payload);
      setEditorOpen(true);
      setAttachCompleted(false);
      setSuccessMessage('BoMAsBuilt draft generated and opened in editor. Existing BoMAsBuilt links were preserved.');
    } catch (generationError) {
      const message = generationError instanceof Error ? generationError.message : 'Failed to generate BoMAsBuilt draft.';
      setError(message);
    } finally {
      setGeneratingDraft(false);
    }
  };

  const handleSaveDraftFromEditor = async (submodelData: Record<string, unknown>) => {
    setDraftPayload(submodelData);
    setEditorOpen(false);
    setAttachCompleted(false);
    setSuccessMessage('BoMAsBuilt payload validated and saved to the wizard draft.');
    setActiveStep(3);
  };

  const handleAttachSubmodel = async () => {
    if (!selectedLocalPart?.globalId) {
      setError('Selected local part instance has no registered globalAssetId. Register/share the twin first.');
      return;
    }
    if (!draftPayload) {
      setError('No BoMAsBuilt draft available. Generate and validate it first.');
      return;
    }
    if (!selectedSchema) {
      setError('BoMAsBuilt schema is not available in the schema registry.');
      return;
    }

    setAttachingSubmodel(true);
    setError(null);

    try {
      const rawSemanticCandidates = [
        selectedSchema.metadata.semanticId,
        BOM_AS_BUILT_SEMANTIC_ID,
        BOM_AS_BUILT_SEMANTIC_ID_ALT,
        BOM_AS_BUILT_URN,
      ].filter((semantic): semantic is string => Boolean(semantic));

      const semanticCandidates = Array.from(new Set(
        rawSemanticCandidates.flatMap((semanticId) => {
          const candidates = [semanticId];
          if (semanticId.includes('#')) {
            candidates.push(semanticId.split('#')[0]);
          }
          return candidates;
        })
      ));

      let finalError = 'Twin aspect creation failed.';
      let attached = false;

      for (const semanticIdCandidate of semanticCandidates) {
        const result = await createTwinAspect(
          selectedLocalPart.globalId,
          semanticIdCandidate,
          draftPayload
        );

        if (result.success) {
          attached = true;
          break;
        }

        const message = result.message || 'Twin aspect creation failed.';
        finalError = message;
        if (!message.includes('No agreement found for semantic ID')) {
          break;
        }
      }

      if (!attached) {
        throw new Error(finalError);
      }

      setSuccessMessage(
        `BoMAsBuilt submodel attached successfully to local part instance ${selectedLocalPart.partInstanceId}.`
      );
      setAttachCompleted(true);
    } catch (attachError) {
      const message = attachError instanceof Error ? attachError.message : 'Failed to attach submodel.';
      setError(message);
    } finally {
      setAttachingSubmodel(false);
    }
  };

  const canGoNext = () => {
    if (activeStep === 0) {
      return Boolean(selectedLocalPart);
    }
    if (activeStep === 1) {
      return Boolean(bpnl.trim() && selectedPartnerPart);
    }
    if (activeStep === 2) {
      return Boolean(draftPayload);
    }
    return false;
  };

  const handleNext = () => {
    setError(null);
    setSuccessMessage(null);
    if (activeStep < 3 && canGoNext()) {
      setActiveStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    setError(null);
    setSuccessMessage(null);
    if (activeStep > 0) {
      setActiveStep((prev) => prev - 1);
    }
  };

  const handleFinishAndExit = () => {
    setActiveStep(0);
    setSelectedLocalPart(null);
    setBpnl('');
    setPartnerPartResults([]);
    setSelectedPartnerPart(null);
    setGeneratedPayload(null);
    setDraftPayload(null);
    setEditorOpen(false);
    setError(null);
    setSuccessMessage(null);
    setAttachCompleted(false);
    setActiveWizard('none');
  };

  const localPartLabel = (part: LocalPartOption) => {
    const twinStatus = part.globalId ? 'registered' : 'missing globalAssetId';
    return `${part.manufacturerPartId} | ${part.partInstanceId} | ${part.manufacturerId} (${twinStatus})`;
  };

  const partnerPartLabel = (part: SerializedPartData) => {
    return `${part.manufacturerPartId} | ${part.partInstanceId ?? 'n/a'} | ${part.globalAssetId}`;
  };

  if (activeWizard === 'none') {
    return (
      <Container maxWidth="lg" sx={{ py: 3 }}>
        <Card
          sx={{
            background: 'linear-gradient(135deg, rgba(33, 33, 33, 0.95), rgba(17, 17, 17, 0.95))',
            border: `1px solid ${ORANGE_PRIMARY}66`,
            borderRadius: 3,
            boxShadow: '0 16px 40px rgba(0, 0, 0, 0.45)'
          }}
        >
          <CardContent sx={{ p: { xs: 3, md: 4 } }}>
            <Typography variant="h4" sx={{ mb: 1, color: '#fff', fontWeight: 700 }}>
              Traceability Preparation
            </Typography>
            <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.75)', mb: 4 }}>
              Select the wizard you want to run for traceability preparation.
            </Typography>

            <Grid2 container spacing={2}>
              <Grid2 size={{ xs: 12, md: 6 }}>
                <Card
                  sx={{
                    background: 'linear-gradient(135deg, rgba(255,122,0,0.14), rgba(255,90,0,0.09))',
                    border: `1px solid ${ORANGE_PRIMARY}66`,
                    borderRadius: 2,
                    height: '100%'
                  }}
                >
                  <CardContent>
                    <Typography variant="h6" sx={{ color: '#fff', mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Hub sx={{ color: ORANGE_PRIMARY }} />
                      BoMAsBuilt (TopDown)
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.75)', mb: 3 }}>
                      Create and attach a SingleLevelBoMAsBuilt submodel using partner discovery and schema-based validation.
                    </Typography>
                    <Button
                      fullWidth
                      variant="contained"
                      onClick={() => {
                        setActiveWizard('bom-topdown');
                        setError(null);
                        setSuccessMessage(null);
                      }}
                      sx={orangeButtonSx}
                    >
                      Open BoMAsBuilt Wizard
                    </Button>
                  </CardContent>
                </Card>
              </Grid2>

              <Grid2 size={{ xs: 12, md: 6 }}>
                <Card
                  sx={{
                    background: 'linear-gradient(135deg, rgba(255,122,0,0.08), rgba(255,90,0,0.05))',
                    border: `1px solid ${ORANGE_PRIMARY}44`,
                    borderRadius: 2,
                    height: '100%'
                  }}
                >
                  <CardContent>
                    <Typography variant="h6" sx={{ color: '#fff', mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <VerticalAlignBottom sx={{ color: ORANGE_PRIMARY }} />
                      UsageAsBuilt (BottomUp)
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.75)', mb: 3 }}>
                      This wizard entry is ready. The BottomUp flow will be implemented in a later iteration.
                    </Typography>
                    <Button
                      fullWidth
                      variant="outlined"
                      disabled
                      sx={orangeOutlinedButtonSx}
                    >
                      Coming Soon
                    </Button>
                  </CardContent>
                </Card>
              </Grid2>
            </Grid2>
          </CardContent>
        </Card>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Card
        sx={{
          background: 'linear-gradient(135deg, rgba(30, 30, 30, 0.95) 0%, rgba(20, 20, 20, 0.95) 100%)',
          border: `1px solid ${ORANGE_PRIMARY}66`,
          borderRadius: 3,
          boxShadow: '0 10px 35px rgba(0, 0, 0, 0.4)'
        }}
      >
        <CardContent>
          <Button
            startIcon={<ArrowBack />}
            variant="outlined"
            onClick={() => setActiveWizard('none')}
            sx={{ ...orangeOutlinedButtonSx, mb: 2 }}
          >
            Back To Wizard Selection
          </Button>
          <Typography variant="h4" sx={{ mb: 1 }}>
            Traceability Preparation Wizard
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.72)' }}>
            Create a BoMAsBuilt(TopDown) submodel by linking a local part instance to an offered part instance from a
            partner and then attach it to the selected local twin.
          </Typography>
        </CardContent>
      </Card>

      <Paper
        sx={{
          p: 3,
          mt: 3,
          background: 'linear-gradient(135deg, rgba(30, 30, 30, 0.95) 0%, rgba(15, 15, 15, 0.95) 100%)',
          backdropFilter: 'blur(18px)',
          borderRadius: 3,
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 10px 35px rgba(0, 0, 0, 0.45)'
        }}
      >
        <Stepper
          activeStep={activeStep}
          alternativeLabel
          sx={{
            '& .MuiStepLabel-label': {
              color: 'rgba(255,255,255,0.72)'
            },
            '& .MuiStepLabel-label.Mui-active, & .MuiStepLabel-label.Mui-completed': {
              color: '#fff',
              fontWeight: 600
            },
            '& .MuiStepConnector-line': {
              borderColor: 'rgba(255,255,255,0.18)'
            },
            '& .MuiStepIcon-root': {
              color: 'rgba(255,122,0,0.3)'
            },
            '& .MuiStepIcon-root.Mui-active': {
              color: ORANGE_PRIMARY,
              filter: 'drop-shadow(0 0 10px rgba(255,122,0,0.45))'
            },
            '& .MuiStepIcon-root.Mui-completed': {
              color: ORANGE_DARK
            },
            '& .MuiStepIcon-text': {
              fill: '#fff',
              fontWeight: 700
            }
          }}
        >
          {WIZARD_STEPS.map((step) => (
            <Step key={step}>
              <StepLabel>{step}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {error && (
          <Alert severity="error" sx={{ mt: 3 }}>
            {error}
          </Alert>
        )}
        {successMessage && (
          <Alert severity="success" sx={{ mt: 3 }}>
            {successMessage}
          </Alert>
        )}

        <Box sx={{ mt: 4 }}>
          {activeStep === 0 && (
            <Grid2 container spacing={2}>
              <Grid2 size={12}>
                <Typography variant="h6" sx={{ color: '#fff' }}>Select Local Part Instance</Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.72)', mb: 2 }}>
                  Select a local serialized part instance that should receive the BoMAsBuilt submodel. Only registered twins are selectable.
                </Typography>
              </Grid2>
              <Grid2 size={{ xs: 12, md: 9 }}>
                <Autocomplete
                  options={localParts}
                  value={selectedLocalPart}
                  loading={loadingLocalParts}
                  getOptionLabel={localPartLabel}
                  getOptionDisabled={(option) => !option.globalId}
                  onChange={(_, nextValue) => {
                    setSelectedLocalPart(nextValue);
                    setPartnerPartResults([]);
                    setSelectedPartnerPart(null);
                    setGeneratedPayload(null);
                    setDraftPayload(null);
                    setAttachCompleted(false);
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Local Part Instance"
                      placeholder="Select a local part instance"
                      sx={wizardTextFieldSx}
                    />
                  )}
                  slotProps={wizardAutocompleteSlotProps}
                />
              </Grid2>
            </Grid2>
          )}

          {activeStep === 1 && (
            <Grid2 container spacing={2}>
              <Grid2 size={12}>
                <Typography variant="h6" sx={{ color: '#fff' }}>Partner Discovery</Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.72)', mb: 2 }}>
                  Enter partner BPNL and discover offered part instances in the dataspace.
                </Typography>
              </Grid2>
              <Grid2 size={{ xs: 12, md: 4 }}>
                <Autocomplete
                  freeSolo
                  options={availablePartners}
                  value={bpnl}
                  loading={isLoadingPartners}
                  getOptionLabel={(option) => {
                    if (typeof option === 'string') {
                      return option;
                    }
                    return `${option.name} - ${option.bpnl}`;
                  }}
                  onInputChange={(_, newInputValue) => {
                    setBpnl(newInputValue || '');
                  }}
                  onChange={(_, newValue) => {
                    if (typeof newValue === 'string') {
                      setBpnl(newValue);
                      return;
                    }
                    if (newValue?.bpnl) {
                      setBpnl(newValue.bpnl);
                      return;
                    }
                    setBpnl('');
                  }}
                  renderOption={(props, option) => (
                    <Box component="li" {...props} key={option.bpnl}>
                      <Box>
                        <Typography variant="body2" sx={{ color: '#fff', fontWeight: 600 }}>
                          {option.name}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.65)' }}>
                          {option.bpnl}
                        </Typography>
                      </Box>
                    </Box>
                  )}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Partner BPNL"
                      placeholder="Select a registered partner or enter BPNL"
                      sx={wizardTextFieldSx}
                    />
                  )}
                  slotProps={wizardAutocompleteSlotProps}
                />
                {partnersError && (
                  <Alert severity="warning" sx={{ mt: 1 }}>
                    Could not load registered partners. Manual BPNL input is still available.
                  </Alert>
                )}
              </Grid2>
              <Grid2 size={{ xs: 12, md: 3 }}>
                <Button
                  variant="contained"
                  color="warning"
                  onClick={searchPartnerOfferedParts}
                  disabled={searchingPartnerParts || !bpnl.trim()}
                  startIcon={searchingPartnerParts ? <CircularProgress size={16} /> : <CloudUpload />}
                  fullWidth
                  sx={orangeButtonSx}
                >
                  Discover Offered Parts
                </Button>
              </Grid2>
              <Grid2 size={12}>
                <Autocomplete
                  options={partnerPartResults}
                  value={selectedPartnerPart}
                  getOptionLabel={partnerPartLabel}
                  onChange={(_, nextValue) => {
                    setSelectedPartnerPart(nextValue);
                    setGeneratedPayload(null);
                    setDraftPayload(null);
                    setAttachCompleted(false);
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Partner Offered Part Instance"
                      placeholder="Run discovery and select one offered part instance"
                      sx={wizardTextFieldSx}
                    />
                  )}
                  slotProps={wizardAutocompleteSlotProps}
                />
              </Grid2>
            </Grid2>
          )}

          {activeStep === 2 && (
            <Grid2 container spacing={2}>
              <Grid2 size={12}>
                <Typography variant="h6" sx={{ color: '#fff' }}>Generate and Edit BoMAsBuilt(TopDown)</Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.72)', mb: 2 }}>
                  Open BoMAsBuilt to generate the default payload and validate/edit it in the schema-driven editor.
                </Typography>
              </Grid2>
              <Grid2 size={{ xs: 12, md: 4 }}>
                <Button
                  fullWidth
                  variant="contained"
                  color="warning"
                  onClick={handleOpenBomAsBuilt}
                  disabled={generatingDraft}
                  startIcon={generatingDraft ? <CircularProgress size={16} /> : <CloudUpload />}
                  sx={orangeButtonSx}
                >
                  {generatingDraft ? 'Generating Draft...' : 'Open BoMAsBuilt'}
                </Button>
              </Grid2>
              {draftPayload && (
                <Grid2 size={12}>
                  <Alert severity="success" icon={<CheckCircle fontSize="inherit" />}>
                    Draft is ready and validated in editor.
                  </Alert>
                </Grid2>
              )}
            </Grid2>
          )}

          {activeStep === 3 && (
            <Grid2 container spacing={2}>
              <Grid2 size={12}>
                <Typography variant="h6" sx={{ color: '#fff' }}>Review and Attach</Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.72)', mb: 2 }}>
                  Confirm selected local and partner parts, then attach the BoMAsBuilt submodel.
                </Typography>
              </Grid2>
              <Grid2 size={{ xs: 12, md: 6 }}>
                <Card
                  variant="outlined"
                  sx={{
                    background: 'linear-gradient(135deg, rgba(30, 30, 30, 0.95) 0%, rgba(20, 20, 20, 0.95) 100%)',
                    borderColor: 'rgba(255,255,255,0.12)',
                  }}
                >
                  <CardContent>
                    <Typography variant="subtitle2" sx={{ color: 'rgba(255,255,255,0.72)' }}>
                      Local Part Instance
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#fff' }}>{selectedLocalPart ? localPartLabel(selectedLocalPart) : 'n/a'}</Typography>
                  </CardContent>
                </Card>
              </Grid2>
              <Grid2 size={{ xs: 12, md: 6 }}>
                <Card
                  variant="outlined"
                  sx={{
                    background: 'linear-gradient(135deg, rgba(30, 30, 30, 0.95) 0%, rgba(20, 20, 20, 0.95) 100%)',
                    borderColor: 'rgba(255,255,255,0.12)',
                  }}
                >
                  <CardContent>
                    <Typography variant="subtitle2" sx={{ color: 'rgba(255,255,255,0.72)' }}>
                      Partner Offered Part Instance
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#fff' }}>{selectedPartnerPart ? partnerPartLabel(selectedPartnerPart) : 'n/a'}</Typography>
                  </CardContent>
                </Card>
              </Grid2>
              <Grid2 size={12}>
                <Typography variant="subtitle2" sx={{ color: 'rgba(255,255,255,0.72)', mb: 1 }}>
                  BoMAsBuilt Draft JSON
                </Typography>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2,
                    maxHeight: 260,
                    overflow: 'auto',
                    background: 'rgba(18, 18, 18, 0.92)',
                    borderColor: 'rgba(255,255,255,0.12)',
                  }}
                >
                  <pre style={{ margin: 0, color: '#fff' }}>{JSON.stringify(draftPayload, null, 2)}</pre>
                </Paper>
              </Grid2>
              <Grid2 size={{ xs: 12, md: 4 }}>
                <Button
                  fullWidth
                  variant="contained"
                  color="warning"
                  disabled={attachingSubmodel || !draftPayload}
                  onClick={handleAttachSubmodel}
                  startIcon={attachingSubmodel ? <CircularProgress size={16} /> : <CloudUpload />}
                  sx={orangeButtonSx}
                >
                  Attach BoMAsBuilt Submodel
                </Button>
              </Grid2>
            </Grid2>
          )}
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
          <Button startIcon={<ArrowBack />} onClick={handleBack} disabled={activeStep === 0 || attachingSubmodel} sx={orangeOutlinedButtonSx}>
            Back
          </Button>
          {activeStep < 3 && (
            <Button
              variant="contained"
              color="warning"
              endIcon={<ArrowForward />}
              onClick={handleNext}
              disabled={!canGoNext() || generatingDraft || attachingSubmodel}
              sx={orangeButtonSx}
            >
              Next
            </Button>
          )}
          {activeStep === 3 && (
            <Button
              variant="contained"
              color="warning"
              endIcon={<CheckCircle />}
              onClick={handleFinishAndExit}
              disabled={!attachCompleted || attachingSubmodel}
              sx={orangeButtonSx}
            >
              Finish and Exit
            </Button>
          )}
        </Box>
      </Paper>

      {selectedSchema && generatedPayload && (
        <SubmodelCreator
          open={editorOpen}
          onClose={() => setEditorOpen(false)}
          onBack={() => setEditorOpen(false)}
          onCreateSubmodel={handleSaveDraftFromEditor}
          selectedSchema={selectedSchema}
          schemaKey={selectedSchema.metadata.semanticId}
          initialData={draftPayload || generatedPayload}
          saveButtonLabel="Use BoMAsBuilt Draft"
        />
      )}
    </Container>
  );
};

export default TraceabilityPreparationPage;
