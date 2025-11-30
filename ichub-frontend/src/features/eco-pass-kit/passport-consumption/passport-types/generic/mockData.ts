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
 * Mock data for generic digital product passport
 */
export const mockGenericPassport = {
  metadata: {
    backupReference: 'https://dummy.link',
    specVersion: 'urn:io.catenax.generic.digital_product_passport:6.1.0',
    registrationIdentifier: 'https://dummy.link/ID8283746239078',
    economicOperatorId: 'BPNL0123456789ZZ',
    lastModification: '2000-01-01',
    language: 'EN',
    predecessor: 'urn:uuid:00000000-0000-0000-0000-000000000000',
    issueDate: '2000-01-01',
    version: '1.0.0',
    passportIdentifier: 'urn:uuid:550e8400-e29b-41d4-a716-446655440000',
    status: 'draft',
    expirationDate: '2030-01-01'
  },
  characteristics: {
    generalPerformanceClass: 'A',
    physicalState: 'solid',
    physicalDimension: {
      volume: { value: 20.0, unit: 'unit:cubicMetre' },
      grossWeight: { value: 20.0, unit: 'unit:gram' },
      diameter: { value: 20.0, unit: 'unit:millimetre' },
      grossVolume: { value: 20.0, unit: 'unit:cubicMetre' },
      width: { value: 20.0, unit: 'unit:millimetre' },
      length: { value: 20.0, unit: 'unit:millimetre' },
      weight: { value: 20.0, unit: 'unit:gram' },
      height: { value: 20.0, unit: 'unit:millimetre' }
    },
    lifespan: [
      {
        value: 36,
        unit: 'unit:day',
        key: 'guaranteed lifetime'
      }
    ]
  },
  commercial: {
    placedOnMarket: '2000-01-01',
    purpose: ['automotive']
  },
  identification: {
    batch: [
      {
        value: 'BID12345678',
        key: 'batchId'
      }
    ],
    codes: [
      {
        value: '8703 24 10 00',
        key: 'TARIC'
      }
    ],
    type: {
      manufacturerPartId: 'Batt-Part-1234',
      nameAtManufacturer: 'Sample Battery Passport'
    },
    classification: [
      {
        classificationStandard: 'IEC',
        classificationID: 'IEC 61234',
        classificationDescription: 'Rechargeable lithium-ion battery'
      }
    ],
    serial: [
      {
        value: 'BAT123456789',
        key: 'partInstanceId'
      }
    ],
    dataCarrier: {
      carrierType: 'QR',
      carrierLayout: 'upper-left side'
    }
  },
  sources: [
    {
      header: 'Example Document XYZ',
      category: 'Product Specifications',
      type: 'URL',
      content: 'https://dummy.link'
    }
  ],
  materials: {
    materialComposition: {
      applicable: true,
      content: [
        {
          unit: 'unit:partPerMillion',
          recycled: 12.5,
          critical: true,
          renewable: 23.5,
          documentation: [ { contentType: 'URL', header: 'Example Document XYZ', content: 'https://dummy.link' } ],
          concentration: 5.3,
          id: [ { type: 'CAS', name: 'phenolphthalein', id: '201-004-7' } ]
        }
      ]
    },
    criticalRawMaterials: [
      {
        name: 'Cobalt',
        percentage: 8.5,
        origin: 'Democratic Republic of Congo',
        certified: true
      },
      {
        name: 'Lithium',
        percentage: 4.2,
        origin: 'Australia',
        certified: true
      },
      {
        name: 'Nickel',
        percentage: 25.5,
        origin: 'Indonesia',
        certified: true
      }
    ],
    hazardousMaterials: [
      {
        name: 'Lithium Hexafluorophosphate',
        casNumber: '21324-40-3',
        concentration: 1.2
      }
    ]
  },
  handling: {
    applicable: true,
    content: {
      producer: [ { id: 'BPNL0123456789ZZ' } ],
      sparePart: [
        {
          manufacturerPartId: 'Batt-Part-1234',
          nameAtManufacturer: 'Lithium Battery Pack'
        }
      ]
    }
  },
  additionalData: [
    {
      description: 'Description of an attribute',
      label: 'Maximum permitted battery power',
      type: { typeUnit: 'unit:volume', dataType: 'array' },
      data: '23',
      children: []
    }
  ],
  operation: {
    import: {
      applicable: true,
      content: { eori: 'GB123456789000', id: 'BPNL0123456789ZZ' }
    },
    other: { id: 'BPNL0123456789XX', role: 'distributor' },
    manufacturer: {
      facility: [ { facility: 'BPNA1234567890AA' } ],
      manufacturingDate: '2000-01-31',
      manufacturer: 'BPNL1bVQKsz1Ci8l'
    }
  },
  sustainability: {
    reparabilityScore: 'B',
    productFootprint: {
      material: [
        {
          lifecycle: 'main product production',
          rulebook: [ { contentType: 'URL', header: 'Example Document XYZ', content: 'https://dummy.link' } ],
          unit: 'kg CO2 / kWh',
          performanceClass: 'A',
          manufacturingPlant: [ { facility: 'BPNA1234567890AA' } ],
          type: 'Climate Change Total',
          value: 12.678,
          declaration: [ { contentType: 'URL', header: 'Example Document XYZ', content: 'https://dummy.link' } ]
        }
      ],
      carbon: [
        {
          lifecycle: 'main product production',
          rulebook: [ { contentType: 'URL', header: 'Example Document XYZ', content: 'https://dummy.link' } ],
          unit: 'kg CO2 / kWh',
          performanceClass: 'A',
          manufacturingPlant: [ { facility: 'BPNA1234567890AA' } ],
          type: 'Climate Change Total',
          value: 12.678,
          declaration: [ { contentType: 'URL', header: 'Example Document XYZ', content: 'https://dummy.link' } ]
        }
      ],
      environmental: [
        {
          lifecycle: 'main product production',
          rulebook: [ { contentType: 'URL', header: 'Example Document XYZ', content: 'https://dummy.link' } ],
          unit: 'kg CO2 / kWh',
          performanceClass: 'A',
          manufacturingPlant: [ { facility: 'BPNA1234567890AA' } ],
          type: 'Climate Change Total',
          value: 12.678,
          declaration: [ { contentType: 'URL', header: 'Example Document XYZ', content: 'https://dummy.link' } ]
        }
      ]
    },
    status: 'original',
    durabilityScore: 'A'
  }
};
