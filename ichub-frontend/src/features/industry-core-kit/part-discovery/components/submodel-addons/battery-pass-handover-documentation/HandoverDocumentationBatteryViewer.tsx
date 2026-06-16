/********************************************************************************
 * Eclipse Tractus-X - Industry Core Hub Frontend
 *
 * Copyright (c) 2026 Capgemini Deutschland GmbH
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

import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  Grid2,
  Link,
  Divider,
} from '@mui/material';
import FolderIcon from '@mui/icons-material/Folder';
import ArticleIcon from '@mui/icons-material/Article';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import { SubmodelAddonProps } from '../shared/types';
import { unwrapSubmodelData } from '../shared/utils';
import { SubmodelAddonWrapper } from '../BaseAddon';
import { HandoverDocumentation, getMultiLangValue } from './types';

export const HandoverDocumentationBatteryViewer: React.FC<SubmodelAddonProps<HandoverDocumentation>> = ({
  data: rawData,
  semanticId,
}) => {
  const data = unwrapSubmodelData<HandoverDocumentation>(rawData);
  if (!data) return null;

  return (
    <SubmodelAddonWrapper
      title="Battery Pass — Handover Documentation"
      subtitle={`Semantic ID: ${semanticId}`}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>

        <Typography variant="body2" color="text.secondary">
          {data.Documents.length} document{data.Documents.length !== 1 ? 's' : ''} available for handover
        </Typography>

        {data.Documents.map((doc, i) => (
          <Card key={doc.DocumentIds?.[0]?.DocumentIdentifier ?? i}>
            <CardContent>
              <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <FolderIcon color="primary" />
                Document {i + 1}
              </Typography>

              {/* Document IDs */}
              {doc.DocumentIds && doc.DocumentIds.length > 0 && (
                <>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>Document Identifiers</Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mb: 2 }}>
                    {doc.DocumentIds.map((docId) => (
                      <Box key={docId.DocumentDomainId + docId.DocumentIdentifier} sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                        <Chip
                          label={docId.DocumentIdentifier}
                          size="small"
                          variant="outlined"
                          sx={{ fontFamily: 'monospace' }}
                        />
                        <Typography variant="caption" color="text.secondary">
                          Domain: {docId.DocumentDomainId}
                        </Typography>
                        {docId.DocumentIsPrimary && (
                          <Chip label="Primary" size="small" color="primary" />
                        )}
                      </Box>
                    ))}
                  </Box>
                </>
              )}

              {/* Classifications */}
              {doc.DocumentClassifications && doc.DocumentClassifications.length > 0 && (
                <>
                  <Divider sx={{ my: 1.5 }} />
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>Classifications</Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                    {doc.DocumentClassifications.map((cls) => (
                      <Chip
                        key={cls.ClassId}
                        label={`${getMultiLangValue(cls.ClassName)} (${cls.ClassId})`}
                        size="small"
                        color="info"
                        variant="outlined"
                        title={`System: ${cls.ClassificationSystem}`}
                      />
                    ))}
                  </Box>
                </>
              )}

              {/* Document Versions */}
              {doc.DocumentVersions && doc.DocumentVersions.length > 0 && (
                <>
                  <Divider sx={{ my: 1.5 }} />
                  <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1.5 }}>
                    <ArticleIcon fontSize="small" color="action" />
                    Versions
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {doc.DocumentVersions.map((ver, j) => (
                      <Card key={ver.Version ?? j} variant="outlined">
                        <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1, mb: 1 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                              {getMultiLangValue(ver.Title)}
                            </Typography>
                            {ver.Version && <Chip label={`v${ver.Version}`} size="small" />}
                          </Box>

                          <Grid2 container spacing={1}>
                            {ver.Subtitle && (
                              <Grid2 size={12}>
                                <Typography variant="body2" color="text.secondary">
                                  {getMultiLangValue(ver.Subtitle)}
                                </Typography>
                              </Grid2>
                            )}
                            {ver.Description && (
                              <Grid2 size={12}>
                                <Typography variant="body2">{getMultiLangValue(ver.Description)}</Typography>
                              </Grid2>
                            )}
                          </Grid2>

                          {ver.Language && ver.Language.length > 0 && (
                            <Box sx={{ display: 'flex', gap: 0.5, mt: 1, flexWrap: 'wrap' }}>
                              {ver.Language.map((lang) => (
                                <Chip key={lang} label={lang.toUpperCase()} size="small" variant="outlined" sx={{ fontSize: '0.7rem' }} />
                              ))}
                            </Box>
                          )}

                          {ver.DigitalFiles && ver.DigitalFiles.length > 0 && (
                            <>
                              <Divider sx={{ my: 1 }} />
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                                <AttachFileIcon sx={{ fontSize: 14 }} />
                                Digital Files
                              </Typography>
                              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                {ver.DigitalFiles.map((file) => (
                                  <Box key={file.value} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Link
                                      href={file.value}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      sx={{ fontSize: '0.8rem', fontFamily: 'monospace', wordBreak: 'break-all' }}
                                    >
                                      {file.value}
                                    </Link>
                                    <Chip label={file.contentType} size="small" variant="outlined" sx={{ fontSize: '0.7rem' }} />
                                  </Box>
                                ))}
                              </Box>
                            </>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </Box>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </Box>
    </SubmodelAddonWrapper>
  );
};
