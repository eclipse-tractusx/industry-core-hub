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

/**
 * Type definitions for IDTA BatteryPass Digital Nameplate submodel
 * Semantic Model: urn:samm:io.admin-shell.idta.batterypass.digital_nameplate:1.0.0#BatteryNameplate
 */

export const BATTERY_PASS_DIGITAL_NAMEPLATE_NAMESPACE =
  'io.admin-shell.idta.batterypass.digital_nameplate';
export const BATTERY_PASS_DIGITAL_NAMEPLATE_MODEL_NAME = 'BatteryNameplate';

export const BATTERY_PASS_DIGITAL_NAMEPLATE_SEMANTIC_ID =
  `urn:samm:${BATTERY_PASS_DIGITAL_NAMEPLATE_NAMESPACE}:1.0.0#${BATTERY_PASS_DIGITAL_NAMEPLATE_MODEL_NAME}`;

import type { MultiLangEntry } from '../battery-pass-shared/types';
export type { MultiLangEntry };
export { getMultiLangValue } from '../battery-pass-shared/types';

export interface PhoneEntity {
  TelephoneNumber: MultiLangEntry | MultiLangEntry[];
  TypeOfTelephone?: string;
  AvailableTime?: MultiLangEntry | MultiLangEntry[];
}

export interface FaxEntity {
  FaxNumber: MultiLangEntry | MultiLangEntry[];
  TypeOfFaxNumber?: string;
}

export interface EmailEntity {
  EmailAddress: string;
  PublicKey?: MultiLangEntry | MultiLangEntry[];
  TypeOfEmailAddress?: string;
  TypeOfPublicKey?: MultiLangEntry | MultiLangEntry[];
}

export interface IpCommunicationChannel {
  AddressOfAdditionalLink: string;
  TypeOfCommunication?: string;
  availableTime?: MultiLangEntry[];
}

export interface AddressInformation {
  RoleOfContactPerson?: string;
  NationalCode: MultiLangEntry[];
  Languages?: string[];
  TimeZone?: string;
  CityTown: MultiLangEntry[];
  Company?: MultiLangEntry[];
  Department?: MultiLangEntry[];
  Phone?: PhoneEntity;
  Fax?: FaxEntity;
  Email?: EmailEntity;
  IPCommunicationChannels?: IpCommunicationChannel[];
  Street: MultiLangEntry[];
  ZipCode: MultiLangEntry[];
  POBox?: MultiLangEntry[];
  ZipCodeOfPOBox?: MultiLangEntry[];
  StateCounty?: MultiLangEntry[];
  NameOfContact?: MultiLangEntry[];
  FirstName?: MultiLangEntry[];
  MiddleNames?: MultiLangEntry[];
  Title?: MultiLangEntry[];
  AcademicTitle?: MultiLangEntry[];
  FurtherDetailsOfContact?: MultiLangEntry[];
  AddressOfAdditionalLink?: string;
}

export interface MarkingFile {
  value: string;
  contentType: string;
}

export interface Marking {
  MarkingName: string;
  DesignationOfCertificateOrApproval?: string;
  IssueDate?: string;
  ExpiryDate?: string;
  MarkingFile: MarkingFile;
  MarkingAdditionalText?: string;
}

export type BatteryLifeCycleStage =
  | 'original'
  | 'repurposed'
  | 're-used'
  | 'remanufactured'
  | 'waste';

export interface BatteryPassDigitalNameplate {
  URIOfTheProduct: string;
  ManufacturerName: MultiLangEntry[];
  AddressInformation: AddressInformation;
  SerialNumber: string;
  DateOfManufacture: string;
  DateOfPuttingIntoService?: string;
  UniqueFacilityIdentifier: string;
  LifeCycleStage: BatteryLifeCycleStage;
  OperatorIdentifier?: string;
  ManufacturerIdentifier: string;
  Markings: Marking[];
  EUDeclarationOfConformity: string[];
  ResultsOfTestReportsProvingCompliance: string[];
}

export function isBatteryPassDigitalNameplate(
  _semanticId: string,
  data: unknown
): data is BatteryPassDigitalNameplate {
  const obj = Array.isArray(data) ? data[0] : data;
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'URIOfTheProduct' in obj &&
    'ManufacturerName' in obj &&
    'SerialNumber' in obj &&
    'LifeCycleStage' in obj
  );
}

