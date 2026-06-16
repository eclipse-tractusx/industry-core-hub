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
  original: 'Battery is new and has never been repurposed or remanufactured.',
  repurposed: 'Battery has been repurposed for a different application.',
  're-used': 'Battery has been reused in the same or similar application.',
  remanufactured: 'Battery has been remanufactured to restore its performance.',
  waste: 'Battery has reached end-of-life and is classified as waste.',
};

export const BatteryPassDigitalNameplateViewer: React.FC<SubmodelAddonProps<BatteryPassDigitalNameplate>> = ({
  data: rawData,
  semanticId,
}) => {
  const data = unwrapSubmodelData<BatteryPassDigitalNameplate>(rawData);
  if (!data) return null;
  const addr = data.AddressInformation;

  const hasComplianceDocs =
    (data.EUDeclarationOfConformity && data.EUDeclarationOfConformity.length > 0) ||
    (data.ResultsOfTestReportsProvingCompliance && data.ResultsOfTestReportsProvingCompliance.length > 0);

  return (
    <SubmodelAddonWrapper
      title="Battery Pass — Digital Nameplate"
      subtitle={`Semantic ID: ${semanticId}`}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>

        {/* Product Identification */}
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <FingerprintIcon color="primary" />
              Product Identification
            </Typography>
            <Grid2 container spacing={2}>
              <Grid2 size={12}>
                <Typography variant="subtitle2" color="text.secondary">Battery Passport URI</Typography>
                <Link
                  href={data.URIOfTheProduct}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{ fontFamily: 'monospace', fontSize: '0.85rem', wordBreak: 'break-all' }}
                >
                  {data.URIOfTheProduct}
                </Link>
              </Grid2>
              <InfoRow label="Serial Number" value={<Box component="span" sx={{ fontFamily: 'monospace' }}>{data.SerialNumber}</Box>} />
              <InfoRow label="Manufacturer Identifier" value={<Box component="span" sx={{ fontFamily: 'monospace' }}>{data.ManufacturerIdentifier}</Box>} />
              {data.OperatorIdentifier && (
                <InfoRow label="Operator Identifier" value={<Box component="span" sx={{ fontFamily: 'monospace' }}>{data.OperatorIdentifier}</Box>} />
              )}
            </Grid2>
          </CardContent>
        </Card>

        {/* Lifecycle Status */}
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <BatteryChargingFullIcon color="primary" />
              Lifecycle Status
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
              <Chip
                label={data.LifeCycleStage}
                color={LIFECYCLE_COLORS[data.LifeCycleStage] ?? 'default'}
                sx={{ fontWeight: 600, textTransform: 'capitalize' }}
              />
              <Typography variant="body2" color="text.secondary">
                {LIFECYCLE_DESCRIPTIONS[data.LifeCycleStage]}
              </Typography>
            </Box>
          </CardContent>
        </Card>

        {/* Manufacturing Details */}
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <FactoryIcon color="primary" />
              Manufacturing Details
            </Typography>
            <Grid2 container spacing={2}>
              <InfoRow label="Date of Manufacture" value={data.DateOfManufacture} />
              {data.DateOfPuttingIntoService && (
                <InfoRow label="Date of Putting Into Service" value={data.DateOfPuttingIntoService} />
              )}
              <InfoRow label="Unique Facility Identifier" value={<Box component="span" sx={{ fontFamily: 'monospace' }}>{data.UniqueFacilityIdentifier}</Box>} />
            </Grid2>
          </CardContent>
        </Card>

        {/* Manufacturer Information */}
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <BusinessIcon color="primary" />
              Manufacturer Information
            </Typography>
            <Grid2 container spacing={2}>
              <InfoRow
                label="Manufacturer Name"
                value={getMultiLangValue(data.ManufacturerName)}
              />
              {addr.Company && (
                <InfoRow label="Company" value={getMultiLangValue(addr.Company)} />
              )}
              {addr.Department && (
                <InfoRow label="Department" value={getMultiLangValue(addr.Department)} />
              )}
              {addr.RoleOfContactPerson && (
                <InfoRow label="Contact Role" value={addr.RoleOfContactPerson} />
              )}
              {(addr.NameOfContact || addr.FirstName) && (
                <InfoRow
                  label="Contact Person"
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
              Address
            </Typography>
            <Grid2 container spacing={2}>
              <InfoRow label="Street" value={getMultiLangValue(addr.Street)} />
              <InfoRow label="City / Town" value={getMultiLangValue(addr.CityTown)} />
              <InfoRow label="Zip Code" value={getMultiLangValue(addr.ZipCode)} />
              {addr.StateCounty && (
                <InfoRow label="State / County" value={getMultiLangValue(addr.StateCounty)} />
              )}
              <InfoRow label="Country" value={getMultiLangValue(addr.NationalCode)} />
              {addr.TimeZone && <InfoRow label="Time Zone" value={addr.TimeZone} />}
              {addr.POBox && (
                <InfoRow label="P.O. Box" value={`${getMultiLangValue(addr.POBox)}${addr.ZipCodeOfPOBox ? ', ' + getMultiLangValue(addr.ZipCodeOfPOBox) : ''}`} />
              )}
              {addr.AddressOfAdditionalLink && (
                <Grid2 size={12}>
                  <Typography variant="subtitle2" color="text.secondary">Website</Typography>
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
                  Contact
                </Typography>
                <Grid2 container spacing={2}>
                  {addr.Phone && (
                    <InfoRow
                      label={`Phone${addr.Phone.TypeOfTelephone ? ` (${addr.Phone.TypeOfTelephone})` : ''}`}
                      value={getMultiLangValue(addr.Phone.TelephoneNumber)}
                    />
                  )}
                  {addr.Fax && (
                    <InfoRow
                      label={`Fax${addr.Fax.TypeOfFaxNumber ? ` (${addr.Fax.TypeOfFaxNumber})` : ''}`}
                      value={getMultiLangValue(addr.Fax.FaxNumber)}
                    />
                  )}
                  {addr.Email && (
                    <Grid2 size={{ xs: 12, sm: 6, md: 4 }}>
                      <Typography variant="subtitle2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <EmailIcon fontSize="small" />
                        Email{addr.Email.TypeOfEmailAddress ? ` (${addr.Email.TypeOfEmailAddress})` : ''}
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
                <Typography variant="subtitle1" sx={{ mb: 1.5 }}>IP Communication Channels</Typography>
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
                Markings &amp; Certifications
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
                          <InfoRow label="Issue Date" value={marking.IssueDate} />
                        )}
                        {marking.ExpiryDate && (
                          <InfoRow label="Expiry Date" value={marking.ExpiryDate} />
                        )}
                        {marking.MarkingAdditionalText && (
                          <InfoRow label="Additional Info" value={marking.MarkingAdditionalText} />
                        )}
                        <Grid2 size={{ xs: 12, sm: 6 }}>
                          <Typography variant="subtitle2" color="text.secondary">Document</Typography>
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
                Compliance Documents
              </Typography>
              <Grid2 container spacing={2}>
                {data.EUDeclarationOfConformity && data.EUDeclarationOfConformity.length > 0 && (
                  <Grid2 size={12}>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                      EU Declaration of Conformity
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
                      Results of Test Reports Proving Compliance
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
