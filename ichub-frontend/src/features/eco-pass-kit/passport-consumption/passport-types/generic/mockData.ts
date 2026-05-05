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
      },
      {
        value: 3,
        unit: 'unit:year',
        key: 'technical lifetime'
      },
    ]
  },
  commercial: {
    placedOnMarket: '2000-01-01',
    purchaseOrder: 'eOMtThyhVNLWUZNRcBaQKxI',
    purpose: ['automotive'],
    recallInformation: {
      recallInformationDocumentation: [
        {
          contentType: 'URL',
          header: 'Example Document XYZ',
          content: 'https://dummy.link'
        }
      ],
      applicable: true
    }
  },
  identification: {
    batch: [
      { value: 'BID12345678', key: 'batchId' }
    ],
    codes: [
      { value: '8703 24 10 00', key: 'TARIC' }
    ],
    type: {
      manufacturerPartId: '123-0.740-3434-A',
      nameAtManufacturer: 'Mirror left'
    },
    classification: [
      {
        classificationStandard: 'GIN 20510-21513',
        classificationID: '1004712',
        classificationDescription:
          'Generic standard for classification of parts in the automotive industry.'
      },
      {
        classificationStandard: 'ECLASS 12.0',
        classificationID: '21-11-01-02',
        classificationDescription: 'Exterior mirror for motor vehicles.'
      }
    ],
    serial: [
      { value: 'SN12345678', key: 'partInstanceId' }
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
    substancesOfConcern: {
      applicable: true,
      content: [
        {
          unit: 'unit:partPerMillion',
          hazardClassification: {
            category: 'category 1A',
            statement: 'Causes severe skin burns and eye damage.',
            class: 'Skin corrosion'
          },
          documentation: [
            { contentType: 'URL', header: 'Example Document XYZ', content: 'https://dummy.link' }
          ],
          concentrationRange: [ { max: 2.6, min: 2.1 } ],
          location: 'Housing',
          concentration: 5.3,
          exemption: 'shall not apply to product x containing not more than 1,5 ml of liquid',
          id: [ { type: 'CAS', name: 'phenolphthalein', id: '201-004-7' } ]
        },
        {
          unit: 'unit:partPerMillion',
          hazardClassification: {
            category: 'category 2',
            statement: 'May cause respiratory irritation.',
            class: 'Specific target organ toxicity'
          },
          documentation: [
            { contentType: 'URL', header: 'Example Material A Doc', content: 'https://dummy.link/materialA' }
          ],
          concentrationRange: [ { max: 1.5, min: 0.5 } ],
          location: 'Frame',
          concentration: 1.1,
          exemption: 'not applicable',
          id: [ { type: 'CAS', name: 'Material A', id: '100-000-0' } ]
        },
        {
          unit: 'unit:partPerMillion',
          hazardClassification: {
            category: 'category 3',
            statement: 'Harmful if swallowed.',
            class: 'Acute toxicity'
          },
          documentation: [
            { contentType: 'URL', header: 'Example Material B Doc', content: 'https://dummy.link/materialB' }
          ],
          concentrationRange: [ { max: 3.0, min: 2.0 } ],
          location: 'Coating',
          concentration: 2.4,
          exemption: 'allowed under threshold limits',
          id: [ { type: 'CAS', name: 'Material B', id: '200-111-3' } ]
        },
        {
          unit: 'unit:percent',
          hazardClassification: {
            category: 'category 1B',
            statement: 'May cause cancer.',
            class: 'Carcinogenicity'
          },
          documentation: [
            { contentType: 'URL', header: 'Lead compound warning', content: 'https://dummy.link/lead-warning' }
          ],
          concentrationRange: [ { max: 0.5, min: 0.1 } ],
          location: 'Solder joints',
          concentration: 0.3,
          exemption: 'RoHS exemption 7(c)-I',
          id: [ { type: 'CAS', name: 'Lead', id: '7439-92-1' } ]
        },
        {
          unit: 'unit:milligramPerKilogram',
          hazardClassification: {
            category: 'category 2',
            statement: 'Suspected of damaging fertility.',
            class: 'Reproductive toxicity'
          },
          documentation: [
            { contentType: 'URL', header: 'Phthalate documentation', content: 'https://dummy.link/phthalate' }
          ],
          concentrationRange: [ { max: 1500, min: 800 } ],
          location: 'Plastic components',
          concentration: 1200,
          exemption: 'below regulatory threshold',
          id: [ { type: 'CAS', name: 'DEHP', id: '117-81-7' } ]
        },
      ]
    },
    materialComposition: {
      applicable: true,
      content: [
        {
          unit: 'unit:partPerMillion',
          recycled: 30.0,
          critical: false,
          renewable: 0.0,
          documentation: [
            { contentType: 'URL', header: 'Mirror glass datasheet', content: 'https://dummy.link/mirror-glass' }
          ],
          concentration: 320000,
          id: [ { type: 'CAS', name: 'Soda-lime glass (mirror glass)', id: '65997-17-3' } ]
        },
        {
          unit: 'unit:partPerMillion',
          recycled: 20.0,
          critical: false,
          renewable: 0.0,
          documentation: [
            { contentType: 'URL', header: 'ABS housing material', content: 'https://dummy.link/abs-housing' }
          ],
          concentration: 280000,
          id: [ { type: 'CAS', name: 'ABS (mirror housing)', id: '9003-56-9' } ]
        },
        {
          unit: 'unit:partPerMillion',
          recycled: 40.0,
          critical: false,
          renewable: 0.0,
          documentation: [
            { contentType: 'URL', header: 'Aluminium bracket alloy', content: 'https://dummy.link/aluminium-bracket' },
            { contentType: 'URL', header: 'Reciclation information', content: 'https://dummy.link/aluminium-bracket' }
          ],
          concentration: 180000,
          id: [ 
            { type: 'CAS', name: 'Aluminium alloy (mounting bracket)', id: '7429-90-5' },
            { type: 'EC', name: 'Aluminium', id: '231-072-3' },
            { type: 'IUPAC', name: 'Aluminum', id: 'Al' }
          ]
        },
        {
          unit: 'unit:partPerMillion',
          recycled: 35.0,
          critical: false,
          renewable: 0.0,
          documentation: [
            { contentType: 'URL', header: 'Steel fasteners & mechanism', content: 'https://dummy.link/steel-mechanism' }
          ],
          concentration: 120000,
          id: [ { type: 'CAS', name: 'Steel (fasteners, adjustment mechanism)', id: '7439-89-6' } ]
        },
        {
          unit: 'unit:partPerMillion',
          recycled: 15.0,
          critical: true,
          renewable: 0.0,
          documentation: [
            { contentType: 'URL', header: 'Copper wiring & motor', content: 'https://dummy.link/copper-wiring' }
          ],
          concentration: 60000,
          id: [ { type: 'CAS', name: 'Copper (wiring, motor windings)', id: '7440-50-8' } ]
        },
        {
          unit: 'unit:partPerMillion',
          recycled: 0.0,
          critical: false,
          renewable: 0.0,
          documentation: [
            { contentType: 'URL', header: 'Polyurethane backing foam', content: 'https://dummy.link/pu-foam' }
          ],
          concentration: 40000,
          id: [ { type: 'CAS', name: 'Polyurethane foam (backing, vibration damping)', id: '9009-54-5' } ]
        },
        {
          unit: 'unit:percent',
          recycled: 5.0,
          critical: false,
          renewable: 0.0,
          documentation: [
            { contentType: 'URL', header: 'Rubber gasket material', content: 'https://dummy.link/rubber-gasket' }
          ],
          concentration: 1.5,
          id: [ { type: 'CAS', name: 'EPDM rubber (sealing gaskets)', id: '25038-36-2' } ]
        },
        {
          unit: 'unit:gram',
          recycled: 0.0,
          critical: false,
          renewable: 0.0,
          documentation: [
            { contentType: 'URL', header: 'Adhesive specifications', content: 'https://dummy.link/adhesive' }
          ],
          concentration: 15,
          id: [ { type: 'CAS', name: 'Epoxy adhesive', id: '25068-38-6' } ]
        }
      ]
    }
  },
  handling: {
    applicable: true,
    content: {
      producer: [ { id: 'BPNL0123456789ZZ' } ],
      sparePart: [ { manufacturerPartId: '123-0.740-3434-A', nameAtManufacturer: 'Mirror left' } ]
    }
  },
  additionalData: [
    {
      description: 'Mirror adjustment specifications with nested configuration',
      label: 'Mirror Adjustment System',
      type: { dataType: 'object' },
      children: [{
        description: 'Adjustment range in degrees',
        label: 'Adjustment Range',
        type: { typeUnit: 'unit:degree', dataType: 'array' },
        data: ['45', '60', '75', '90'],
      }]
    },
    {
      description: 'Heating element technical specifications',
      label: 'Mirror Heating System',
      type: { dataType: 'object' },
      children: [{
        description: 'Heating performance data',
        label: 'Heating Performance',
        type: { dataType: 'object' },
        children: [{
          description: 'Operating voltage',
          label: 'Voltage',
          type: { dataType: 'string', typeUnit: 'unit:volt' },
          data: '12'
        },
        {
          description: 'Power consumption',
          label: 'Power',
          type: { dataType: 'string', typeUnit: 'unit:watt' },
          data: '45'
        }]
      }]
    },
    {
      description: 'Mirror coating layers with detailed composition',
      label: 'Coating Layers',
      type: { dataType: 'array' },
      children: [
        {
          description: 'Layer stack information',
          label: 'Layer 1 - Reflective',
          type: { dataType: 'object' },
          children: [
            {
              description: 'Material properties',
              label: 'Properties',
              type: { dataType: 'array' },
              children: [
                {
                  description: 'Individual property data',
                  label: 'Property 1',
                  type: { dataType: 'object' },
                  children: [
                    {
                      description: 'Reflectivity percentage',
                      label: 'Reflectivity',
                      type: { dataType: 'string', typeUnit: 'unit:percent' },
                      data: '95'
                    },
                    {
                      description: 'Material durability rating',
                      label: 'Durability',
                      type: { dataType: 'string' },
                      data: 'HIGH'
                    }
                  ]
                },
                {
                  description: 'Individual property data',
                  label: 'Property 2',
                  type: { dataType: 'object' },
                  children: [
                    {
                      description: 'Layer thickness',
                      label: 'Thickness',
                      type: { dataType: 'string', typeUnit: 'unit:micrometre' },
                      data: '2.5'
                    },
                    {
                      description: 'Application method',
                      label: 'Method',
                      type: { dataType: 'string' },
                      data: 'SPUTTERING'
                    }
                  ]
                }
              ]
            },
            {
              description: 'Manufacturing metadata',
              label: 'Manufacturing Info',
              type: { dataType: 'object' },
              children: [
                {
                  description: 'Production line identifier',
                  label: 'Line ID',
                  type: { dataType: 'string' },
                  data: 'COAT-LINE-03'
                },
                {
                  description: 'Quality control batch',
                  label: 'QC Batch',
                  type: { dataType: 'string' },
                  data: 'QC-2024-11-001'
                }
              ]
            }
          ]
        }
      ]
    },
    {
      description: 'Supply chain traceability for mirror components',
      label: 'Component Traceability',
      type: { dataType: 'object' },
      children: [
        {
          description: 'Glass supplier information',
          label: 'Glass Suppliers',
          type: { dataType: 'array' },
          children: [
            {
              description: 'Primary glass supplier',
              label: 'Supplier - Glass Corp',
              type: { dataType: 'object' },
              children: [
                {
                  description: 'Manufacturing facilities',
                  label: 'Production Sites',
                  type: { dataType: 'array' },
                  children: [
                    {
                      description: 'Main production facility',
                      label: 'Plant Munich',
                      type: { dataType: 'object' },
                      children: [
                        {
                          description: 'ISO country code',
                          label: 'Country',
                          type: { dataType: 'string' },
                          data: 'DE'
                        },
                        {
                          description: 'City location',
                          label: 'City',
                          type: { dataType: 'string' },
                          data: 'Munich'
                        }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        },
        {
          description: 'Quality certifications',
          label: 'Certifications',
          type: { dataType: 'array' },
          children: [
            {
              description: 'Certification identifiers',
              label: 'Cert IDs',
              type: { dataType: 'array' },
              data: ['ISO-9001-2024', 'IATF-16949-2024']
            }
          ]
        }
      ]
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
          value: 44.56,
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
        },
        {
          lifecycle: 'energy use',
          rulebook: [ { contentType: 'URL', header: 'Example Document XYZ', content: 'https://dummy.link' } ],
          unit: 'kg CO2 / kWh',
          performanceClass: 'A',
          manufacturingPlant: [ { facility: 'BPNA1234567890AA' } ],
          type: 'Climate Change Total',
          value: 46.56,
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

