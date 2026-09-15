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
import { useTranslation } from 'react-i18next';
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
import BatteryChargingFullIcon from '@mui/icons-material/BatteryChargingFull';
import BusinessIcon from '@mui/icons-material/Business';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import PhoneIcon from '@mui/icons-material/Phone';
import EmailIcon from '@mui/icons-material/Email';
import FingerprintIcon from '@mui/icons-material/Fingerprint';
import FactoryIcon from '@mui/icons-material/Factory';
import VerifiedIcon from '@mui/icons-material/Verified';
import GppGoodIcon from '@mui/icons-material/GppGood';
import { SubmodelAddonProps } from '../shared/types';
import { unwrapSubmodelData } from '../shared/utils';
import { SubmodelAddonWrapper } from '../BaseAddon';
import { InfoRow } from '../battery-pass-shared/InfoRow';
import {
  BatteryPassDigitalNameplate,
  BatteryLifeCycleStage,
  getMultiLangValue,
} from './types';

const LIFECYCLE_COLORS: Record<BatteryLifeCycleStage, 'success' | 'info' | 'warning' | 'error' | 'default'> = {
  original: 'success',
  repurposed: 'info',
  're-used': 'info',
  remanufactured: 'warning',
  waste: 'error',
};

const LIFECYCLE_DESCRIPTIONS: Record<BatteryLifeCycleStage, string> = {
  original: 'digitalNameplate.lifecycle.original',
  repurposed: 'digitalNameplate.lifecycle.repurposed',
  're-used': 'digitalNameplate.lifecycle.re-used',
  remanufactured: 'digitalNameplate.lifecycle.remanufactured',
  waste: 'digitalNameplate.lifecycle.waste',
};

export const BatteryPassDigitalNameplateViewer: React.FC<SubmodelAddonProps<BatteryPassDigitalNameplate>> = ({
  data: rawData,
  semanticId,
}) => {
  const { t } = useTranslation('batteryPass');
  const data = unwrapSubmodelData<BatteryPassDigitalNameplate>(rawData);
  if (!data) return null;
  const addr = data.AddressInformation;

  const hasComplianceDocs =
    (data.EUDeclarationOfConformity && data.EUDeclarationOfConformity.length > 0) ||
    (data.ResultsOfTestReportsProvingCompliance && data.ResultsOfTestReportsProvingCompliance.length > 0);

  return (
    <SubmodelAddonWrapper
      title={t('digitalNameplate.title')}
      subtitle={`Semantic ID: ${semanticId}`}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>

        {/* Product Identification */}
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <FingerprintIcon color="primary" />
              {t('digitalNameplate.sections.productIdentification')}
            </Typography>
            <Grid2 container spacing={2}>
              <Grid2 size={12}>
                <Typography variant="subtitle2" color="text.secondary">{t('digitalNameplate.fields.batteryPassportUri')}</Typography>
                <Link
                  href={data.URIOfTheProduct}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{ fontFamily: 'monospace', fontSize: '0.85rem', wordBreak: 'break-all' }}
                >
                  {data.URIOfTheProduct}
                </Link>
              </Grid2>
              <InfoRow label={t('digitalNameplate.fields.serialNumber')} value={<Box component="span" sx={{ fontFamily: 'monospace' }}>{data.SerialNumber}</Box>} />
              <InfoRow label={t('digitalNameplate.fields.manufacturerIdentifier')} value={<Box component="span" sx={{ fontFamily: 'monospace' }}>{data.ManufacturerIdentifier}</Box>} />
              {data.OperatorIdentifier && (
                <InfoRow label={t('digitalNameplate.fields.operatorIdentifier')} value={<Box component="span" sx={{ fontFamily: 'monospace' }}>{data.OperatorIdentifier}</Box>} />
              )}
            </Grid2>
          </CardContent>
        </Card>

        {/* Lifecycle Status */}
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <BatteryChargingFullIcon color="primary" />
              {t('digitalNameplate.sections.lifecycleStatus')}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
              <Chip
                label={data.LifeCycleStage}
                color={LIFECYCLE_COLORS[data.LifeCycleStage] ?? 'default'}
                sx={{ fontWeight: 600, textTransform: 'capitalize' }}
              />
              <Typography variant="body2" color="text.secondary">
                {t(LIFECYCLE_DESCRIPTIONS[data.LifeCycleStage])}
              </Typography>
            </Box>
          </CardContent>
        </Card>

        {/* Manufacturing Details */}
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <FactoryIcon color="primary" />
              {t('digitalNameplate.sections.manufacturingDetails')}
            </Typography>
            <Grid2 container spacing={2}>
              <InfoRow label={t('digitalNameplate.fields.dateOfManufacture')} value={data.DateOfManufacture} />
              {data.DateOfPuttingIntoService && (
                <InfoRow label={t('digitalNameplate.fields.dateOfPuttingIntoService')} value={data.DateOfPuttingIntoService} />
              )}
              <InfoRow label={t('digitalNameplate.fields.uniqueFacilityIdentifier')} value={<Box component="span" sx={{ fontFamily: 'monospace' }}>{data.UniqueFacilityIdentifier}</Box>} />
            </Grid2>
          </CardContent>
        </Card>

        {/* Manufacturer Information */}
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <BusinessIcon color="primary" />
              {t('digitalNameplate.sections.manufacturerInformation')}
            </Typography>
            <Grid2 container spacing={2}>
              <InfoRow
                label={t('digitalNameplate.fields.manufacturerName')}
                value={getMultiLangValue(data.ManufacturerName)}
              />
              {addr.Company && (
                <InfoRow label={t('digitalNameplate.fields.company')} value={getMultiLangValue(addr.Company)} />
              )}
              {addr.Department && (
                <InfoRow label={t('digitalNameplate.fields.department')} value={getMultiLangValue(addr.Department)} />
              )}
              {addr.RoleOfContactPerson && (
                <InfoRow label={t('digitalNameplate.fields.contactRole')} value={addr.RoleOfContactPerson} />
              )}
              {(addr.NameOfContact || addr.FirstName) && (
                <InfoRow
                  label={t('digitalNameplate.fields.contactPerson')}
                  value={[
                    addr.Title && getMultiLangValue(addr.Title),
                    addr.AcademicTitle && getMultiLangValue(addr.AcademicTitle),
                    addr.FirstName && getMultiLangValue(addr.FirstName),
                    addr.MiddleNames && getMultiLangValue(addr.MiddleNames),
                    addr.NameOfContact && getMultiLangValue(addr.NameOfContact),
                  ].filter(Boolean).join(' ')}
                />
              )}
            </Grid2>

            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle1" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <LocationOnIcon fontSize="small" color="action" />
              {t('digitalNameplate.sections.address')}
            </Typography>
            <Grid2 container spacing={2}>
              <InfoRow label={t('digitalNameplate.fields.street')} value={getMultiLangValue(addr.Street)} />
              <InfoRow label={t('digitalNameplate.fields.cityTown')} value={getMultiLangValue(addr.CityTown)} />
              <InfoRow label={t('digitalNameplate.fields.zipCode')} value={getMultiLangValue(addr.ZipCode)} />
              {addr.StateCounty && (
                <InfoRow label={t('digitalNameplate.fields.stateCounty')} value={getMultiLangValue(addr.StateCounty)} />
              )}
              <InfoRow label={t('digitalNameplate.fields.country')} value={getMultiLangValue(addr.NationalCode)} />
              {addr.TimeZone && <InfoRow label={t('digitalNameplate.fields.timeZone')} value={addr.TimeZone} />}
              {addr.POBox && (
                <InfoRow label={t('digitalNameplate.fields.poBox')} value={`${getMultiLangValue(addr.POBox)}${addr.ZipCodeOfPOBox ? ', ' + getMultiLangValue(addr.ZipCodeOfPOBox) : ''}`} />
              )}
              {addr.AddressOfAdditionalLink && (
                <Grid2 size={12}>
                  <Typography variant="subtitle2" color="text.secondary">{t('digitalNameplate.fields.website')}</Typography>
                  <Link href={addr.AddressOfAdditionalLink} target="_blank" rel="noopener noreferrer" sx={{ fontSize: '0.875rem' }}>
                    {addr.AddressOfAdditionalLink}
                  </Link>
                </Grid2>
              )}
            </Grid2>

            {(addr.Phone || addr.Fax || addr.Email) && (
              <>
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle1" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                  <PhoneIcon fontSize="small" color="action" />
                  {t('digitalNameplate.sections.contact')}
                </Typography>
                <Grid2 container spacing={2}>
                  {addr.Phone && (
                    <InfoRow
                      label={`${t('digitalNameplate.fields.phone')}${addr.Phone.TypeOfTelephone ? ` (${addr.Phone.TypeOfTelephone})` : ''}`}
                      value={getMultiLangValue(addr.Phone.TelephoneNumber)}
                    />
                  )}
                  {addr.Fax && (
                    <InfoRow
                      label={`${t('digitalNameplate.fields.fax')}${addr.Fax.TypeOfFaxNumber ? ` (${addr.Fax.TypeOfFaxNumber})` : ''}`}
                      value={getMultiLangValue(addr.Fax.FaxNumber)}
                    />
                  )}
                  {addr.Email && (
                    <Grid2 size={{ xs: 12, sm: 6, md: 4 }}>
                      <Typography variant="subtitle2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <EmailIcon fontSize="small" />
                        {t('digitalNameplate.fields.email')}{addr.Email.TypeOfEmailAddress ? ` (${addr.Email.TypeOfEmailAddress})` : ''}
                      </Typography>
                      <Link href={`mailto:${addr.Email.EmailAddress}`} sx={{ fontSize: '0.875rem' }}>
                        {addr.Email.EmailAddress}
                      </Link>
                    </Grid2>
                  )}
                </Grid2>
              </>
            )}

            {addr.IPCommunicationChannels && addr.IPCommunicationChannels.length > 0 && (
              <>
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle1" sx={{ mb: 1.5 }}>{t('digitalNameplate.sections.ipCommunicationChannels')}</Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {addr.IPCommunicationChannels.map((ch) => (
                    <Chip
                      key={ch.AddressOfAdditionalLink}
                      label={`${ch.TypeOfCommunication ?? 'Link'}: ${ch.AddressOfAdditionalLink}`}
                      variant="outlined"
                      size="small"
                      component="a"
                      href={ch.AddressOfAdditionalLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      clickable
                    />
                  ))}
                </Box>
              </>
            )}
          </CardContent>
        </Card>

        {/* Markings & Certifications */}
        {data.Markings && data.Markings.length > 0 && (
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <VerifiedIcon color="primary" />
                {t('digitalNameplate.sections.markingsAndCertifications')}
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {data.Markings.map((marking) => (
                  <Card key={marking.MarkingName} variant="outlined">
                    <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1, mb: 1 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                          {marking.MarkingName}
                        </Typography>
                        {marking.DesignationOfCertificateOrApproval && (
                          <Chip
                            label={marking.DesignationOfCertificateOrApproval}
                            size="small"
                            color="primary"
                            variant="outlined"
                          />
                        )}
                      </Box>
                      <Grid2 container spacing={1}>
                        {marking.IssueDate && (
                          <InfoRow label={t('digitalNameplate.fields.issueDate')} value={marking.IssueDate} />
                        )}
                        {marking.ExpiryDate && (
                          <InfoRow label={t('digitalNameplate.fields.expiryDate')} value={marking.ExpiryDate} />
                        )}
                        {marking.MarkingAdditionalText && (
                          <InfoRow label={t('digitalNameplate.fields.additionalInfo')} value={marking.MarkingAdditionalText} />
                        )}
                        <Grid2 size={{ xs: 12, sm: 6 }}>
                          <Typography variant="subtitle2" color="text.secondary">{t('digitalNameplate.fields.document')}</Typography>
                          <Link
                            href={marking.MarkingFile.value}
                            target="_blank"
                            rel="noopener noreferrer"
                            sx={{ fontSize: '0.8rem', fontFamily: 'monospace' }}
                          >
                            {marking.MarkingFile.value}
                          </Link>
                          <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
                            ({marking.MarkingFile.contentType})
                          </Typography>
                        </Grid2>
                      </Grid2>
                    </CardContent>
                  </Card>
                ))}
              </Box>
            </CardContent>
          </Card>
        )}

        {/* Compliance Documents */}
        {hasComplianceDocs && (
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <GppGoodIcon color="primary" />
                {t('digitalNameplate.sections.complianceDocuments')}
              </Typography>
              <Grid2 container spacing={2}>
                {data.EUDeclarationOfConformity && data.EUDeclarationOfConformity.length > 0 && (
                  <Grid2 size={12}>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                      {t('digitalNameplate.fields.euDeclarationOfConformity')}
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {data.EUDeclarationOfConformity.map((docId) => (
                        <Chip
                          key={docId}
                          label={docId}
                          variant="outlined"
                          size="small"
                          sx={{ fontFamily: 'monospace' }}
                        />
                      ))}
                    </Box>
                  </Grid2>
                )}
                {data.ResultsOfTestReportsProvingCompliance && data.ResultsOfTestReportsProvingCompliance.length > 0 && (
                  <Grid2 size={12}>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                      {t('digitalNameplate.fields.resultsOfTestReportsProvingCompliance')}
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {data.ResultsOfTestReportsProvingCompliance.map((docId) => (
                        <Chip
                          key={docId}
                          label={docId}
                          variant="outlined"
                          size="small"
                          sx={{ fontFamily: 'monospace' }}
                        />
                      ))}
                    </Box>
                  </Grid2>
                )}
              </Grid2>
            </CardContent>
          </Card>
        )}

      </Box>
    </SubmodelAddonWrapper>
  );
};
