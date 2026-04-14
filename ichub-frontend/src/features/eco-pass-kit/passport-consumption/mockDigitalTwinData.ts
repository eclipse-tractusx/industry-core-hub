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

/**
 * Mock digital twin data for testing the passport visualization
 * This data matches the structure expected by SingleTwinResult component
 */
export const mockDigitalTwinData = {
  shell_descriptor: {
    description: [
      {
        language: "en",
        text: "Digital Product Passport for sample product"
      }
    ],
    displayName: [
      {
        language: "en",
        text: "Sample Digital Product Passport"
      }
    ],
    assetKind: "Instance",
    assetType: "Electronic Sensor",
    globalAssetId: "urn:uuid:eae04505-cf76-42c1-886b-823c04b7ca2a",
    idShort: "This_is_a_new_part",
    id: "urn:uuid:b1d4217b-8511-408f-88c6-7ad7f12a3df9",
    specificAssetIds: [
      {
        name: "digitalTwinType",
        value: "PartInstance"
      },
      {
        name: "manufacturerPartId",
        value: "TestPart1"
      },
      {
        name: "manufacturerId",
        value: "BPNL0000000093Q7"
      }
    ],
    submodelDescriptors: [
      {
        endpoints: [
          {
            interface: "SUBMODEL-3.0",
            protocolInformation: {
              href: "https://edc-provider-ichub-dataplane.int.catena-x.net/api/public/urn:uuid:f5acb2fb-501b-46f9-92c3-6f4f3b4ba260/submodel",
              endpointProtocol: "HTTP",
              endpointProtocolVersion: ["1.1"],
              subprotocol: "DSP",
              subprotocolBody: "id=ichub:asset:4VLgzjfHHgJPWXIkwlyMKg;dspEndpoint=https://edc-provider-ichub-control.int.catena-x.net/api/v1/dsp",
              subprotocolBodyEncoding: "plain",
              securityAttributes: [
                {
                  type: "NONE",
                  key: "NONE",
                  value: "NONE"
                }
              ]
            }
          }
        ],
        idShort: "digitalProductPassport",
        id: "urn:uuid:f5acb2fb-501b-46f9-92c3-6f4f3b4ba260",
        semanticId: {
          type: "ExternalReference",
          keys: [
            {
              type: "GlobalReference",
              value: "urn:samm:io.catenax.generic.digital_product_passport:6.1.0#DigitalProductPassport"
            }
          ]
        },
        supplementalSemanticId: [],
        description: [
          {
            language: "en",
            text: "Digital Product Passport containing comprehensive product information"
          }
        ],
        displayName: [
          {
            language: "en",
            text: "Digital Product Passport"
          }
        ]
      },
      {
        endpoints: [
          {
            interface: "SUBMODEL-3.0",
            protocolInformation: {
              href: "https://edc-provider-ichub-dataplane.int.catena-x.net/api/public/urn:uuid:38853577-fed3-4241-bf0d-507fba271775/submodel",
              endpointProtocol: "HTTP",
              endpointProtocolVersion: ["1.1"],
              subprotocol: "DSP",
              subprotocolBody: "id=ichub:asset:1qgpKiRoLcs_PC6oOYsHHQ;dspEndpoint=https://edc-provider-ichub-control.int.catena-x.net/api/v1/dsp",
              subprotocolBodyEncoding: "plain",
              securityAttributes: [
                {
                  type: "NONE",
                  key: "NONE",
                  value: "NONE"
                }
              ]
            }
          }
        ],
        idShort: "partTypeInformation",
        id: "urn:uuid:38853577-fed3-4241-bf0d-507fba271775",
        semanticId: {
          type: "ExternalReference",
          keys: [
            {
              type: "GlobalReference",
              value: "urn:samm:io.catenax.part_type_information:1.0.0#PartTypeInformation"
            }
          ]
        },
        supplementalSemanticId: [],
        description: [
          {
            language: "en",
            text: "Part type classification and information"
          }
        ],
        displayName: [
          {
            language: "en",
            text: "Part Type Information"
          }
        ]
      }
    ]
  },
  dtr: {
    connectorUrl: "https://edc-provider-ichub-control.int.catena-x.net/api/v1/dsp",
    assetId: "dtr-registry-asset-001"
  }
};

/**
 * Mock counter party ID for testing
 */
export const mockCounterPartyId = "BPNL0000000093Q7";
