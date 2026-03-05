<!--
Eclipse Tractus-X - Industry Core Hub

Copyright (c) 2026 LKS Next
Copyright (c) 2026 Contributors to the Eclipse Foundation

See the NOTICE file(s) distributed with this work for additional
information regarding copyright ownership.

This work is made available under the terms of the
Creative Commons Attribution 4.0 International (CC-BY-4.0) license,
which is available at
https://creativecommons.org/licenses/by/4.0/legalcode.

SPDX-License-Identifier: CC-BY-4.0
-->

# Data Seeding Guide

Guide for loading test data into Industry Core Hub database, respecting all constraints.

## Quick Start

```bash
# Run SQL script
psql -h localhost -U ichub -d ichub < seed-test-data.sql

# Or execute directly
psql -h localhost -U ichub -d ichub <<EOF
INSERT INTO public.legal_entity (bpnl) VALUES ('BPNL0000000000XX');
INSERT INTO public.business_partner (name, bpnl) VALUES ('Partner A', 'BPNM0000000000AA');
EOF
```

---

## Insert Order & Constraints

**Understanding the constraint format:**

- **PK: id** = Primary Key (unique identifier for each row)
- **UNIQUE: column** = Column value must be unique across all rows
- **(col1, col2)** = Composite constraint: the combination of these columns must be unique
- **Composite PK** = The entire primary key is made of multiple columns together

**Example:**
- `legal_entity` has `PK: id` (each legal entity gets a unique auto-generated number)
- `business_partner` has `UNIQUE: bpnl, name` (you cannot insert two partners with the same bpnl OR same name)
- `batch` has `UNIQUE: (catalog_part_id, batch_id)` (you can have BATCH-001 for part 1, but not another BATCH-001 for the same part 1)

**Follow this order respecting all UNIQUE and composite PK constraints:**

1. **legal_entity** - PK: id | UNIQUE: bpnl (each bpnl appears once)
2. **business_partner** - PK: id | UNIQUE: bpnl, name (each bpnl and name must be unique)
3. **enablement_service_stack** - PK: id | UNIQUE: name (each stack name is unique)
4. **catalog_part** - PK: id | UNIQUE: (legal_entity_id, manufacturer_part_id), twin_id (combination of entity+part must be unique)
5. **partner_catalog_part** - PK: id | UNIQUE: (business_partner_id, catalog_part_id) (same part cannot be mapped twice to same partner)
6. **batch** - PK: id | UNIQUE: (catalog_part_id, batch_id), twin_id (same batch ID cannot repeat for same part)
7. **batch_business_partner** - PK: (batch_id, business_partner_id) - Composite (the pair must be unique)
8. **twin** - PK: id | UNIQUE: global_id, aas_id (each twin gets unique identifiers)
9. **twin_aspect** - PK: id | UNIQUE: (twin_id, semantic_id), submodel_id (same semantic ID cannot repeat for same twin)
10. **twin_aspect_registration** - PK: (twin_aspect_id, enablement_service_stack_id) - Composite (aspect+stack pair must be unique)
11. **twin_registration** - PK: (twin_id, enablement_service_stack_id) - Composite (twin+stack pair must be unique)
12. **twin_exchange** - PK: (data_exchange_agreement_id, twin_id) - Composite (agreement+twin pair must be unique)
13. **data_exchange_agreement** - PK: id | UNIQUE: (business_partner_id, name) (same agreement name per partner only once)
14. **data_exchange_contract** - PK: (data_exchange_agreement_id, semantic_id) - Composite (semantic ID unique per agreement)
15. **serialized_part** - PK: id | UNIQUE: (part_instance_id, partner_catalog_part_id), twin_id (same serial number per partner mapping only once)
16. **jis_part** - PK: id | UNIQUE: (jis_number, partner_catalog_part_id), twin_id (same JIS number per partner mapping only once)

---

## Sample Data with Constraints

**Why insertion order matters:**
- Tables with foreign keys must insert parent data first (legal_entity before catalog_part)
- Composite PK tables (those combining multiple columns as key) appear later in the sequence
- Don't try to insert into batch_business_partner before creating batches and partners

**Auto-generated values:**
- `id` columns are automatic (don't specify them)
- `global_id` and `aas_id` in twin are auto-generated UUIDs (don't specify them)
- `created_date` and `modified_date` default to current timestamp (don't specify them)

**Practical tips:**
- You can insert 5 different "BATCH-001" values but only ONE per catalog_part_id
- Two partners can have the same BPNL number → violation! Each BPNL must be unique across all partners
- Composite keys let you reuse values across different partner/part combinations (Partner A can have part-1, Partner B can also have part-1, but Partner A cannot have part-1 twice)

**Legal Entity (UNIQUE bpnl):**
```sql
INSERT INTO public.legal_entity (bpnl) 
VALUES ('BPNL0000000000XX');
```

**Business Partner (UNIQUE bpnl, name):**
```sql
INSERT INTO public.business_partner (name, bpnl) 
VALUES 
  ('Partner A', 'BPNM0000000000AA'),
  ('Partner B', 'BPNM0000000001BB');
```

**Enablement Service Stack (UNIQUE name):**
```sql
INSERT INTO public.enablement_service_stack (name, legal_entity_id) 
VALUES ('Stack-1', 1);
```

**Catalog Part (UNIQUE manufacturer_part_id + legal_entity_id):**
```sql
INSERT INTO public.catalog_part (manufacturer_part_id, legal_entity_id, name) 
VALUES 
  ('PART-001', 1, 'Component A'),
  ('PART-002', 1, 'Component B');
```

**Partner Catalog Part (UNIQUE business_partner_id + catalog_part_id):**
```sql
INSERT INTO public.partner_catalog_part (business_partner_id, catalog_part_id, customer_part_id) 
VALUES 
  (1, 1, 'CUST-001'),
  (2, 2, 'CUST-002');
```

**Batch (UNIQUE catalog_part_id + batch_id, twin_id):**
```sql
INSERT INTO public.batch (batch_id, catalog_part_id) 
VALUES 
  ('BATCH-001', 1),
  ('BATCH-002', 2);
```

**Batch Business Partner (composite PK):**
```sql
INSERT INTO public.batch_business_partner (batch_id, business_partner_id) 
VALUES 
  (1, 1),
  (2, 2);
```

**Twin (UNIQUE global_id, aas_id - auto-generated):**
```sql
INSERT INTO public.twin (asset_class) 
VALUES 
  ('Component'),
  ('Module');
```

**Twin Aspect (UNIQUE twin_id + semantic_id, submodel_id):**
```sql
INSERT INTO public.twin_aspect (semantic_id, twin_id) 
VALUES 
  ('urn:bamm:io.catenax.serial_part:3.0.0', 1),
  ('urn:bamm:io.catenax.batch:2.0.0', 2);
```

**Twin Aspect Registration (composite PK: twin_aspect_id, enablement_service_stack_id):**
```sql
INSERT INTO public.twin_aspect_registration (twin_aspect_id, enablement_service_stack_id) 
VALUES (1, 1);
```

**Twin Registration (composite PK: twin_id, enablement_service_stack_id):**
```sql
INSERT INTO public.twin_registration (twin_id, enablement_service_stack_id) 
VALUES (1, 1);
```

**Twin Exchange (composite PK: data_exchange_agreement_id, twin_id):**
```sql
INSERT INTO public.twin_exchange (twin_id, data_exchange_agreement_id) 
VALUES (1, 1);
```

**Data Exchange Agreement (UNIQUE business_partner_id + name):**
```sql
INSERT INTO public.data_exchange_agreement (name, business_partner_id) 
VALUES 
  ('Agreement-1', 1),
  ('Agreement-2', 2);
```

**Data Exchange Contract (composite PK: data_exchange_agreement_id, semantic_id):**
```sql
INSERT INTO public.data_exchange_contract (data_exchange_agreement_id, semantic_id, edc_usage_policy_id) 
VALUES 
  (1, 'urn:bamm:io.catenax.serial_part:3.0.0', 'policy-001'),
  (2, 'urn:bamm:io.catenax.batch:2.0.0', 'policy-002');
```

**Serialized Part (UNIQUE part_instance_id + partner_catalog_part_id, twin_id):**
```sql
INSERT INTO public.serialized_part (partner_catalog_part_id, part_instance_id) 
VALUES 
  (1, 'SN-0001'),
  (1, 'SN-0002');
```

**JIS Part (UNIQUE jis_number + partner_catalog_part_id, twin_id):**
```sql
INSERT INTO public.jis_part (partner_catalog_part_id, jis_number) 
VALUES 
  (1, 'JIS-001'),
  (2, 'JIS-002');
```

---

## EDR Connector Cache

```sql
-- Known connector (PRIMARY KEY: bpnl)
INSERT INTO ichub.known_connectors (bpnl, connectors, expires_at) 
VALUES ('BPNL0000000000XX', '["https://connector.example.com"]'::json, now() + interval '24 hours');

-- Known DTR (PRIMARY KEY: bpnl)
INSERT INTO ichub.known_dtrs (bpnl, edc_url, asset_id, policies, expires_at) 
VALUES ('BPNL0000000000XX', 'https://dtr.example.com', 'urn:uuid:123e456f789a', '[]'::json, now() + interval '24 hours');

-- EDR Connection (PRIMARY KEY: transfer_id)
INSERT INTO ichub.edr_connections (transfer_id, counter_party_id, counter_party_address, query_checksum, policy_checksum) 
VALUES ('transfer-001', 'BPNM0000000000AA', 'https://connector.example.com', 'cksum1', 'cksum2');
```

---

## Verify Data

```sql
-- Check inserts
SELECT count(*) as total FROM public.business_partner;

-- Check relationships
SELECT b.batch_id, cp.manufacturer_part_id, bp.name
FROM public.batch b 
JOIN public.catalog_part cp ON b.catalog_part_id = cp.id
JOIN public.business_partner bp ON cp.legal_entity_id = 1;

-- Verify unique constraints
SELECT business_partner_id, catalog_part_id, count(*) 
FROM public.partner_catalog_part 
GROUP BY business_partner_id, catalog_part_id 
HAVING count(*) > 1;
```

---

## Handle Duplicates

**If you get unique constraint violations:**

PostgreSQL will reject inserts that violate UNIQUE or composite PK constraints. Examples:

- `ERROR: duplicate key value violates unique constraint "uk_business_partner_bpnl"` → You're inserting a partner with bpnl that already exists
- `ERROR: duplicate key value violates unique constraint "uk_batch_catalog_part_id_batch_id"` → You're inserting the same batch_id for the same catalog_part_id
- `ERROR: duplicate key value violates unique constraint "uk_partner_catalog_part_business_partner_id_catalog_part_id"` → Same partner cannot map to same part twice

**Solution: Use ON CONFLICT clause:**

```sql
-- Insert only if not exists (skip if already there)
INSERT INTO public.business_partner (name, bpnl) 
VALUES ('Partner A', 'BPNM0000000000AA')
ON CONFLICT (bpnl) DO NOTHING;

-- Or update if exists (replace old values)
INSERT INTO public.business_partner (name, bpnl) 
VALUES ('Partner A Updated', 'BPNM0000000000AA')
ON CONFLICT (bpnl) DO UPDATE SET name = EXCLUDED.name;

-- For composite constraints, reference all columns:
INSERT INTO public.batch (batch_id, catalog_part_id) 
VALUES ('BATCH-001', 1)
ON CONFLICT (catalog_part_id, batch_id) DO NOTHING;
```

---

## Reset Data

```bash
# Delete all data (keep schema)
psql -h localhost -U ichub -d ichub <<EOF
TRUNCATE TABLE public.serialized_part CASCADE;
TRUNCATE TABLE public.jis_part CASCADE;
TRUNCATE TABLE public.batch CASCADE;
TRUNCATE TABLE public.batch_business_partner CASCADE;
TRUNCATE TABLE public.twin_exchange CASCADE;
TRUNCATE TABLE public.twin_aspect_registration CASCADE;
TRUNCATE TABLE public.twin_registration CASCADE;
TRUNCATE TABLE public.twin_aspect CASCADE;
TRUNCATE TABLE public.twin CASCADE;
TRUNCATE TABLE public.partner_catalog_part CASCADE;
TRUNCATE TABLE public.data_exchange_contract CASCADE;
TRUNCATE TABLE public.data_exchange_agreement CASCADE;
TRUNCATE TABLE public.catalog_part CASCADE;
TRUNCATE TABLE public.business_partner CASCADE;
TRUNCATE TABLE public.enablement_service_stack CASCADE;
TRUNCATE TABLE public.legal_entity CASCADE;
TRUNCATE TABLE ichub.edr_connections CASCADE;
EOF
```

---

See [Schema Documentation](./SCHEMA_DOCUMENTATION.md) for complete constraint details.

## NOTICE

This work is licensed under the [CC-BY-4.0](https://creativecommons.org/licenses/by/4.0/legalcode).

- SPDX-License-Identifier: CC-BY-4.0
- SPDX-FileCopyrightText: 2026 LKS Next
- SPDX-FileCopyrightText: 2026 Contributors to the Eclipse Foundation
- Source URL: https://github.com/eclipse-tractusx/industry-core-hub
