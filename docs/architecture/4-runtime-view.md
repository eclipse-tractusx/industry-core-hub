## 4 Runtime-view
This document presents the runtime view of the Industrial Core Hub. For this version, the process documented in this section is mainly based in the procedure followed in the ICH backend component. 
The document presents sequence diagram and the steps followed to retrieve a catalog, the enablement services, the business partner, the agreement and the twin. It also shows the step to generate and upload the submodel document related to a part type. 

### Actors 
For this version, We have simplify the actors involved considering only the User. The user is the actor that interacts with the ICH through the FastAPI offered by the ICH backend component.
In future versions this user will be the ICH frontend or any component of a use case that consumes the FastAPI.

| Actor         | 	Description                                                                                              | Examples                                                                 |
|---------------|------------------------------------------------------------------------------------------------------------|--------------------------------------------------------------------------|
| User          | The user is any actor that interacts with the ICH through the FastAPI offered by the ICH backend component.| The ICH Frontend or any application consuming the FastAPI.               |
| AI Client (MCP) | An LLM-based client that invokes IC-Hub tools via the Model Context Protocol.                            | Claude Desktop, Microsoft Copilot Studio, custom LLM agents.            |


The interactions are shown in the diagrams below.
For the purpose of simplifying, the interactions via ICH Frontend are not shown completely.

### Backend Interaction diagrams
The following figure presents the process followed at ICH Backend level.

![ICHBackendSequenceDiagram](./media/BackendSequenceDiagram/BackendSequenceDiagram.svg)

The process consists of 8 steps:
- Step 1: Retrieves the catalog part entity according to the catalog part data (manufacturer_id, manufacturer_part_id)
- Step 2: Retrieves the enablement service stack entity from the DB according to the given name. If it does not exist, the application creates it with the default name
- Step 3: Retrieves the business partner entity according to the business_partner_name. If it is not there, the application creates it
- Step 4: Retrieves the first data exchange agreement entity for the business partner. If it is not there, it creates one with the default name
- Step 5: Gets the partner's catalog part entity from the DB according to the catalog part and business partner. If it is not there, it creates one with a generated customer part id
- Step 6: Lets the Twin Management Service create the catalog part twin. Then retrieves the twin from the DB
- Step 7: Checks if there is already a twin exchange entity for the twin and data exchange agreement and creates it otherwise
- Step 8: If specified, the step generates and uploads the part type information submodel document

The following diagrams present a closer view of Steps1-3, Step4-6 and Step7-8

#### Steps1-3

![ICHBackendSequenceDiagram(Steps1-3)](./media/BackendSequenceDiagram/BackendSequenceDiagram(Steps1-3).svg)

#### Steps4-6

![ICHBackendSequenceDiagram(Steps4-6)](./media/BackendSequenceDiagram/BackendSequenceDiagram(Steps4-6).svg)

#### Steps7-8

![ICHBackendSequenceDiagram(Steps7-8)](./media/BackendSequenceDiagram/BackendSequenceDiagram(Steps7-8).svg)

### Frontend Interaction diagrams
The following figure presents the process followed at ICH Frontend level. The following images present the sequence followed in the two main pages of the component (ProductLists and ProductDetails)

![ICHFrontendSequenceDiagramProductLists](./media/FrontendSequenceDiagram/ProductListSequenceDiagram.svg)

![ICHFrontendSequenceDiagramProductDetails](./media/FrontendSequenceDiagram/ProducDetailsSequenceDiagram.svg)

### Frontend-Backend Integration diagrams
TBC

### MCP Addon Interaction Diagrams

The MCP Addon introduces new runtime flows for AI clients interacting with the dataspace via natural language. The following diagrams describe the key interaction patterns. The flows are represented as sequence diagrams below.

#### MCP Read Flow (e.g. `list_known_partners`)

```mermaid
sequenceDiagram
    participant C as MCP Client (Claude Desktop)
    box IC-Hub
        participant M as MCP Addon (/addons/mcp-addon/mcp)
        participant S as PartnerManagementService
    end

    C->>M: MCP call: list_known_partners
    M->>M: auth.py: validate bearer token (Keycloak JWT or API key)
    M->>M: session.py: resolve or create MCP session
    M->>S: adapter (industry_core.py): call PartnerManagementService
    S-->>M: partner list
    M->>M: formatters.py: flatten result to LLM-friendly shape
    M->>M: session.py: store returned BPNLs in session
    M->>M: audit.py: log tool call with user identity
    M-->>C: partner list response
```

#### MCP Consumer Read Flow (e.g. `list_partner_twins` → `fetch_submodel`)

```mermaid
sequenceDiagram
    participant C as MCP Client
    box IC-Hub
        participant M as MCP Addon
        participant CC as ConsumerConnectorManager
        participant DC as DtrConsumerManager
        participant SC as SubmodelConsumer
    end
    participant D as Dataspace (EDC/DTR)

    C->>M: list_partner_twins(bpnl=…)
    M->>M: auth + session resolution
    M->>CC: adapter (discovery.py): discover twins
    CC->>D: EDC catalog + negotiation
    D-->>CC: EDR token
    CC->>DC: DTR lookup
    DC->>D: fetch shell descriptors
    D-->>DC: shell descriptors
    DC-->>CC: shell descriptors
    CC-->>M: shell descriptors
    M->>M: formatters.py: flatten shell descriptors
    M->>M: session.py: store twin IDs
    M-->>C: twin list response

    C->>M: fetch_submodel(twin_id=…)
    M->>M: adapter reuses EDR token from SDK cache
    M->>SC: fetch submodel payload
    SC->>D: SubmodelConsumer: fetch submodel payload
    D-->>SC: submodel payload
    SC-->>M: submodel payload
    M-->>C: submodel payload
```

#### MCP Write Flow with Confirmation (e.g. `share_catalog_part`)

```mermaid
sequenceDiagram
    participant C as MCP Client
    box IC-Hub
        participant M as MCP Addon
        participant SS as SharingService
    end

    C->>M: share_catalog_part(part_id=…, partner_bpn=…)
    M->>M: auth + session resolution
    M->>M: confirmation.py: no staged action found
    M->>M: build preview, stage {tool, args} in session
    M-->>C: preview response

    C->>C: user confirms via chat

    C->>M: share_catalog_part(same args)
    M->>M: confirmation.py: matching staged action → clear stage
    M->>SS: adapter (industry_core.py): call SharingService
    SS->>SS: submodel store + DTR shell + EDC asset + policy + contract
    SS-->>M: sharing result
    M->>M: audit.py: log with downstream IDs
    M-->>C: success response
```
  
### NOTICE

This work is licensed under the [CC-BY-4.0](https://creativecommons.org/licenses/by/4.0/legalcode).

- SPDX-License-Identifier: CC-BY-4.0
- SPDX-FileCopyrightText: 2025 Contributors to the Eclipse Foundation
- Source URL: https://github.com/eclipse-tractusx/industry-core-hub
