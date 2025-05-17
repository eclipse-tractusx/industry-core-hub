/********************************************************************************
* Eclipse Tractus-X - Industry Core Hub                                      
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
* distributed under the License is distributed on an "AS IS" BASIS, WITHOUT   
* WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the    
* License for the specific language governing permissions and limitations     
* under the License.                                                          
*                                                                             
* SPDX-License-Identifier: Apache-2.0                                         
*********************************************************************************/

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


SET default_table_access_method = heap;


DROP TABLE IF EXISTS public.serialized_part;
DROP TABLE IF EXISTS public.jis_part;
DROP TABLE IF EXISTS public.batch_business_partner;
DROP TABLE IF EXISTS public.batch;
DROP TABLE IF EXISTS public.partner_catalog_part;
DROP TABLE IF EXISTS public.catalog_part;
DROP TABLE IF EXISTS public.twin_registration;
DROP TABLE IF EXISTS public.twin_aspect_registration;
DROP TABLE IF EXISTS public.twin_exchange;
DROP TABLE IF EXISTS public.twin_aspect;
DROP TABLE IF EXISTS public.twin;
DROP TABLE IF EXISTS public.data_exchange_contract;
DROP TABLE IF EXISTS public.data_exchange_agreement;
DROP TABLE IF EXISTS public.business_partner;
DROP TABLE IF EXISTS public.enablement_service_stack;
DROP TABLE IF EXISTS public.legal_entity;

CREATE TABLE public.batch (
    id integer NOT NULL,
    batch_id character varying NOT NULL,
    catalog_part_id integer NOT NULL,
    twin_id integer
);

CREATE TABLE public.batch_business_partner (
    batch_id integer NOT NULL,
    business_partner_id integer NOT NULL
);

CREATE TABLE public.business_partner (
    id integer NOT NULL,
    name character varying NOT NULL,
    bpnl character varying NOT NULL
);

CREATE TABLE public.catalog_part (
    id integer NOT NULL,
    manufacturer_part_id character varying NOT NULL,
    legal_entity_id integer NOT NULL,
    twin_id integer,
	name character varying NOT NULL,
	category character varying,
	bpns character varying,
    materials json,
    width json,
    height json,
    length json,
    weight json
);

CREATE TABLE public.data_exchange_agreement (
    id integer NOT NULL,
    name character varying NOT NULL,
    business_partner_id integer NOT NULL
);

CREATE TABLE public.data_exchange_contract (
    data_exchange_agreement_id integer NOT NULL,
    semantic_id character varying NOT NULL,
    edc_usage_policy_id character varying NOT NULL
);

CREATE TABLE public.enablement_service_stack (
    id integer NOT NULL,
    name character varying NOT NULL,
    connection_settings json,
    legal_entity_id integer NOT NULL
);

CREATE TABLE public.legal_entity (
    id integer NOT NULL,
    bpnl character varying NOT NULL
);

CREATE TABLE public.partner_catalog_part (
    id integer NOT NULL,
    business_partner_id integer NOT NULL,
    catalog_part_id integer NOT NULL,
    customer_part_id character varying DEFAULT ''::character varying NOT NULL
);

CREATE TABLE public.twin (
    id integer NOT NULL,
    global_id uuid DEFAULT gen_random_uuid() NOT NULL,
    aas_id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_date timestamp without time zone DEFAULT (now() AT TIME ZONE 'utc'::text) NOT NULL,
    modified_date timestamp without time zone DEFAULT (now() AT TIME ZONE 'utc'::text) NOT NULL,
    asset_class character varying,
    additional_context character varying
);

CREATE TABLE public.twin_aspect (
    id integer NOT NULL,
    submodel_id uuid DEFAULT gen_random_uuid() NOT NULL,
    semantic_id character varying NOT NULL,
    twin_id integer NOT NULL
);

CREATE TABLE public.twin_aspect_registration (
    twin_aspect_id integer NOT NULL,
    enablement_service_stack_id integer NOT NULL,
    status smallint DEFAULT 0 NOT NULL,
    registration_mode smallint DEFAULT 0 NOT NULL,
    created_date timestamp without time zone DEFAULT (now() AT TIME ZONE 'utc'::text) NOT NULL,
    modified_date timestamp without time zone DEFAULT (now() AT TIME ZONE 'utc'::text) NOT NULL
);

CREATE TABLE public.twin_exchange (
    twin_id integer NOT NULL,
    data_exchange_agreement_id integer NOT NULL
);

CREATE TABLE public.twin_registration (
    twin_id integer NOT NULL,
    enablement_service_stack_id integer NOT NULL,
    dtr_registered boolean DEFAULT false NOT NULL
);

CREATE TABLE public.jis_part (
    id integer NOT NULL,
    partner_catalog_part_id integer NOT NULL,
    jis_number character varying NOT NULL,
    parent_order_number character varying,
    jis_call_date timestamp without time zone,
    twin_id integer
);

CREATE TABLE public.serialized_part (
    id integer NOT NULL,
    partner_catalog_part_id integer NOT NULL,
    part_instance_id character varying NOT NULL,
    van character varying,
    twin_id integer
);

ALTER TABLE public.batch ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.batch_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

ALTER TABLE public.business_partner ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.business_partner_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

ALTER TABLE public.catalog_part ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.catalog_part_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


ALTER TABLE public.data_exchange_agreement ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.data_exchange_agreement_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


ALTER TABLE public.enablement_service_stack ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.enablement_service_stack_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


ALTER TABLE public.jis_part ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.jis_part_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


ALTER TABLE public.legal_entity ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.legal_entity_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


ALTER TABLE public.partner_catalog_part ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.part_share_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


ALTER TABLE public.serialized_part ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.serialized_part_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


ALTER TABLE public.twin_aspect ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.twin_aspect_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


ALTER TABLE public.twin ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.twin_twin_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



ALTER TABLE ONLY public.batch
    ADD CONSTRAINT pk_batch PRIMARY KEY (id);

ALTER TABLE ONLY public.batch_business_partner
    ADD CONSTRAINT pk_batch_business_partner PRIMARY KEY (batch_id, business_partner_id);

ALTER TABLE ONLY public.business_partner
    ADD CONSTRAINT pk_business_partner PRIMARY KEY (id);

ALTER TABLE ONLY public.catalog_part
    ADD CONSTRAINT pk_catalog_part PRIMARY KEY (id);

ALTER TABLE ONLY public.data_exchange_agreement
    ADD CONSTRAINT pk_data_exchange_agreement PRIMARY KEY (id);

ALTER TABLE ONLY public.data_exchange_contract
    ADD CONSTRAINT pk_data_exchange_contract PRIMARY KEY (data_exchange_agreement_id, semantic_id);

ALTER TABLE ONLY public.enablement_service_stack
    ADD CONSTRAINT pk_enablement_service_stack PRIMARY KEY (id);

ALTER TABLE ONLY public.jis_part
    ADD CONSTRAINT pk_jis_part PRIMARY KEY (id);

ALTER TABLE ONLY public.legal_entity
    ADD CONSTRAINT pk_legal_entity PRIMARY KEY (id);

ALTER TABLE ONLY public.partner_catalog_part
    ADD CONSTRAINT pk_partner_catalog_part PRIMARY KEY (id);

ALTER TABLE ONLY public.serialized_part
    ADD CONSTRAINT pk_serialized_part PRIMARY KEY (id);

ALTER TABLE ONLY public.twin
    ADD CONSTRAINT pk_twin PRIMARY KEY (id);

ALTER TABLE ONLY public.twin_aspect
    ADD CONSTRAINT pk_twin_aspect PRIMARY KEY (id);

ALTER TABLE ONLY public.twin_aspect_registration
    ADD CONSTRAINT pk_twin_aspect_registration PRIMARY KEY (twin_aspect_id, enablement_service_stack_id);

ALTER TABLE ONLY public.twin_exchange
    ADD CONSTRAINT pk_twin_exchange PRIMARY KEY (data_exchange_agreement_id, twin_id);

ALTER TABLE ONLY public.twin_registration
    ADD CONSTRAINT pk_twin_registration PRIMARY KEY (twin_id, enablement_service_stack_id);


ALTER TABLE ONLY public.batch
    ADD CONSTRAINT uk_batch_catalog_part_id_batch_id UNIQUE (catalog_part_id, batch_id);
ALTER TABLE ONLY public.batch
    ADD CONSTRAINT uk_batch_twin_id UNIQUE (twin_id);

ALTER TABLE ONLY public.business_partner
    ADD CONSTRAINT uk_business_partner_bpnl UNIQUE (bpnl);
ALTER TABLE ONLY public.business_partner
    ADD CONSTRAINT uk_business_partner_name UNIQUE (name);

ALTER TABLE ONLY public.catalog_part
    ADD CONSTRAINT uk_catalog_part_legal_entity_id_manufacturer_part_id UNIQUE (legal_entity_id, manufacturer_part_id);
ALTER TABLE ONLY public.catalog_part
    ADD CONSTRAINT uk_catalog_part_twin_id UNIQUE (twin_id);

ALTER TABLE ONLY public.data_exchange_agreement
    ADD CONSTRAINT uk_data_exchange_agreement_name_business_partner_id UNIQUE (business_partner_id, name);

ALTER TABLE ONLY public.enablement_service_stack
    ADD CONSTRAINT uk_enablement_service_stack_name UNIQUE (name);

ALTER TABLE ONLY public.jis_part
    ADD CONSTRAINT uk_jis_part_partner_catalog_part_id_jis_number UNIQUE (jis_number, partner_catalog_part_id);
ALTER TABLE ONLY public.jis_part
    ADD CONSTRAINT uk_jis_part_twin_id UNIQUE (twin_id);

ALTER TABLE ONLY public.legal_entity
    ADD CONSTRAINT uk_legal_entity_bpnl UNIQUE (bpnl);

ALTER TABLE ONLY public.partner_catalog_part
    ADD CONSTRAINT uk_partner_catalog_part_business_partner_id_catalog_part_id UNIQUE (business_partner_id, catalog_part_id);

ALTER TABLE ONLY public.serialized_part
    ADD CONSTRAINT uk_serialized_part_partner_catalog_part_id_part_instance_id UNIQUE (part_instance_id, partner_catalog_part_id);
ALTER TABLE ONLY public.serialized_part
    ADD CONSTRAINT uk_serialized_part_twin_id UNIQUE (twin_id);

ALTER TABLE ONLY public.twin
    ADD CONSTRAINT uk_twin_global_id UNIQUE (global_id);
ALTER TABLE ONLY public.twin
    ADD CONSTRAINT uk_twin_aas_id UNIQUE (aas_id);

ALTER TABLE ONLY public.twin_aspect
    ADD CONSTRAINT uk_twin_aspect_submodel_id UNIQUE (submodel_id);
ALTER TABLE ONLY public.twin_aspect
    ADD CONSTRAINT uk_twin_aspect_twin_id_semantic_id UNIQUE (twin_id, semantic_id);


CREATE INDEX idx_batch_batch_id ON public.batch USING btree (batch_id) WITH (deduplicate_items='true');
CREATE INDEX idx_batch_catalog_part_id ON public.batch USING btree (catalog_part_id);

CREATE INDEX idx_business_partner_bpnl ON public.business_partner USING btree (bpnl);
CREATE INDEX idx_business_partner_name ON public.business_partner USING btree (name);

CREATE INDEX idx_catalog_part_legal_entitiy_id ON public.catalog_part USING btree (legal_entity_id);
CREATE INDEX idx_catalog_part_manufacturer_part_id ON public.catalog_part USING btree (manufacturer_part_id) WITH (deduplicate_items='true');

CREATE INDEX idx_enablement_service_stack_legal_entity_id ON public.enablement_service_stack USING btree (legal_entity_id);

CREATE INDEX idx_jis_part_jis_number ON public.jis_part USING btree (jis_number) WITH (deduplicate_items='true');
CREATE INDEX idx_jis_part_parent_order_number ON public.jis_part USING btree (parent_order_number) WITH (deduplicate_items='true');
CREATE INDEX idx_jis_part_jis_call_date ON public.jis_part USING btree (jis_call_date);
CREATE INDEX idx_jis_part_partner_catalog_part_id ON public.jis_part USING btree (partner_catalog_part_id);

CREATE INDEX idx_legal_entity_bpnl ON public.legal_entity USING btree (bpnl) WITH (deduplicate_items='true');

CREATE INDEX idx_partner_catalog_part_business_partner_id ON public.partner_catalog_part USING btree (business_partner_id);
CREATE INDEX idx_partner_catalog_part_catalog_part_id ON public.partner_catalog_part USING btree (catalog_part_id);
CREATE INDEX idx_partner_catalog_part_customer_part_id ON public.partner_catalog_part USING btree (customer_part_id) WITH (deduplicate_items='true');

CREATE INDEX idx_serialized_part_part_instance_id ON public.serialized_part USING btree (part_instance_id) WITH (deduplicate_items='true');
CREATE INDEX idx_serialized_part_partner_catalog_part_id ON public.serialized_part USING btree (partner_catalog_part_id);
CREATE INDEX idx_serialized_part_van ON public.serialized_part USING btree (van) WITH (deduplicate_items='true');

CREATE INDEX idx_twin_aspect_registration_created_date ON public.twin_aspect_registration USING btree (created_date) WITH (deduplicate_items='true');
CREATE INDEX idx_twin_aspect_registration_modified_date ON public.twin_aspect_registration USING btree (modified_date) WITH (deduplicate_items='true');
CREATE INDEX idx_twin_aspect_registration_status ON public.twin_aspect_registration USING btree (status);
CREATE INDEX idx_twin_aspect_registration_registration_mode ON public.twin_aspect_registration USING btree (registration_mode);

CREATE INDEX idx_twin_aspect_semantic_id ON public.twin_aspect USING btree (semantic_id) WITH (deduplicate_items='true');
CREATE INDEX idx_twin_aspect_twin_id ON public.twin_aspect USING btree (twin_id);

CREATE INDEX idx_twin_created_date ON public.twin USING btree (created_date) WITH (deduplicate_items='true');
CREATE INDEX idx_twin_modified_date ON public.twin USING btree (modified_date) WITH (deduplicate_items='true');

CREATE INDEX idx_twin_exchange_data_exchange_agreement_id ON public.twin_exchange USING btree (data_exchange_agreement_id);
CREATE INDEX idx_twin_exchange_twin_id ON public.twin_exchange USING btree (twin_id);

CREATE INDEX idx_twin_registration_dtr_registered ON public.twin_registration USING btree (dtr_registered);


ALTER TABLE ONLY public.batch
    ADD CONSTRAINT fk_batch_twin_id FOREIGN KEY (twin_id) REFERENCES public.twin(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE ONLY public.batch
    ADD CONSTRAINT fk_batch_catalog_part_id FOREIGN KEY (catalog_part_id) REFERENCES public.catalog_part(id) ON UPDATE RESTRICT ON DELETE RESTRICT;

ALTER TABLE ONLY public.catalog_part
    ADD CONSTRAINT fk_catalog_part_legal_entitiy_id FOREIGN KEY (legal_entity_id) REFERENCES public.legal_entity(id);
ALTER TABLE ONLY public.catalog_part
    ADD CONSTRAINT fk_catalog_part_twin_id FOREIGN KEY (twin_id) REFERENCES public.twin(id) ON UPDATE RESTRICT ON DELETE RESTRICT;

ALTER TABLE ONLY public.data_exchange_agreement
    ADD CONSTRAINT fk_data_exchange_agreement_business_partner_id FOREIGN KEY (business_partner_id) REFERENCES public.business_partner(id) ON UPDATE RESTRICT ON DELETE RESTRICT;

ALTER TABLE ONLY public.data_exchange_contract
    ADD CONSTRAINT fk_data_exchange_contract_data_exchange_agreement_id FOREIGN KEY (data_exchange_agreement_id) REFERENCES public.data_exchange_agreement(id) ON UPDATE RESTRICT ON DELETE RESTRICT;

ALTER TABLE ONLY public.enablement_service_stack
    ADD CONSTRAINT fk_enablement_service_stack_legal_entity_id FOREIGN KEY (legal_entity_id) REFERENCES public.legal_entity(id) ON UPDATE RESTRICT ON DELETE RESTRICT;

ALTER TABLE ONLY public.jis_part
    ADD CONSTRAINT fk_jis_part_partner_catalog_part_id FOREIGN KEY (partner_catalog_part_id) REFERENCES public.partner_catalog_part(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE ONLY public.jis_part
    ADD CONSTRAINT fk_jis_part_twin_id FOREIGN KEY (twin_id) REFERENCES public.twin(id) ON UPDATE RESTRICT ON DELETE RESTRICT;

ALTER TABLE ONLY public.partner_catalog_part
    ADD CONSTRAINT fk_partner_catalog_part_business_partner_id FOREIGN KEY (business_partner_id) REFERENCES public.business_partner(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE ONLY public.partner_catalog_part
    ADD CONSTRAINT fk_partner_catalog_part_catalog_part_id FOREIGN KEY (catalog_part_id) REFERENCES public.catalog_part(id) ON UPDATE RESTRICT ON DELETE RESTRICT;

ALTER TABLE ONLY public.serialized_part
    ADD CONSTRAINT fk_serialized_part_partner_catalog_part_id FOREIGN KEY (partner_catalog_part_id) REFERENCES public.partner_catalog_part(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE ONLY public.serialized_part
    ADD CONSTRAINT fk_serialized_part_twin_id FOREIGN KEY (twin_id) REFERENCES public.twin(id) ON UPDATE RESTRICT ON DELETE RESTRICT;

ALTER TABLE ONLY public.twin_aspect
    ADD CONSTRAINT fk_twin_aspect_twin_id FOREIGN KEY (twin_id) REFERENCES public.twin(id) ON UPDATE RESTRICT ON DELETE RESTRICT;

ALTER TABLE ONLY public.twin_aspect_registration
    ADD CONSTRAINT fk_twin_aspect_registration_twin_aspect_id FOREIGN KEY (twin_aspect_id) REFERENCES public.twin_aspect(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE ONLY public.twin_aspect_registration
    ADD CONSTRAINT fk_twin_aspect_registration_enablement_service_stack_id FOREIGN KEY (enablement_service_stack_id) REFERENCES public.enablement_service_stack(id) ON UPDATE RESTRICT ON DELETE RESTRICT;

ALTER TABLE ONLY public.twin_exchange
    ADD CONSTRAINT fk_twin_exchange_data_exchange_agreement_id FOREIGN KEY (data_exchange_agreement_id) REFERENCES public.data_exchange_agreement(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE ONLY public.twin_exchange
    ADD CONSTRAINT fk_twin_exchange_twin_id FOREIGN KEY (twin_id) REFERENCES public.twin(id) ON UPDATE RESTRICT ON DELETE RESTRICT;

ALTER TABLE ONLY public.twin_registration
    ADD CONSTRAINT fk_twin_registration_twin_id FOREIGN KEY (twin_id) REFERENCES public.twin(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
ALTER TABLE ONLY public.twin_registration
    ADD CONSTRAINT fk_twin_registration_enablement_service_stack_id FOREIGN KEY (enablement_service_stack_id) REFERENCES public.enablement_service_stack(id) ON UPDATE RESTRICT ON DELETE RESTRICT;
