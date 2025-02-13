# Industry Core Hub

<p align="center">
  <img src="./docs/media/IndustryCoreHubLogo.png" alt="Industry Core Logo" width="250"/>
</p>


A decentral lightweight, **plug and play data provision & consumption orchestrator** of the:

- [Tractus-X Eclipse Dataspace Connector (EDC)](https://github.com/eclipse-tractusx/tractusx-edc)
- [Tractus-X Digital Twin Registry](https://github.com/eclipse-tractusx/sldt-digital-twin-registry)
- [Simple Data Backend](https://github.com/eclipse-tractusx/tractus-x-umbrella/tree/main/simple-data-backend)

It gives you the **DATASPACE KICKSTART** you need to adopt the Tractus-X Technology Stack, once you are onboarded to the operative data space.

**Additional Services**:

- Discovery Services:
  - [Discovery Finder](https://github.com/eclipse-tractusx/sldt-discovery-finder)  
  - [BPN Discovery](https://github.com/eclipse-tractusx/sldt-bpn-discovery)
  - [EDC Discovery](https://github.com/eclipse-tractusx/portal-backend)
  
- [Portal IAM/IDP](https://github.com/eclipse-tractusx/portal-iam)

It also will allow you to extend the "frontend", "backend" and a [Tractus-X SDK](https://github.com/eclipse-tractusx/tractusx-sdk) to support different use cases. Allowing you to create "ready to use" KIT toolboxes with personalized visualization for every Standard Catena-X Data Model. 

This application is a reference implementation from the Industry Core and aims to offer a implementation for integrating this Catena-X Standards: 

- [CX-0001 EDC Discovery API](https://catenax-ev.github.io/docs/standards/CX-0001-EDCDiscoveryAPI)
- [CX-0002 Digital Twins in Catena-X](https://catenax-ev.github.io/docs/standards/CX-0002-DigitalTwinsInCatenaX)
- [CX-0003 SAMM Aspect Meta Model](https://catenax-ev.github.io/docs/standards/CX-0003-SAMMSemanticAspectMetaModel)
- [CX-0005 Item Relationship Service](https://catenax-ev.github.io/docs/standards/CX-0005-ItemRelationshipServiceAPI) (with IRS)
- [CX-0007 Minimal Data Provider Service](https://catenax-ev.github.io/docs/standards/CX-0007-MinimalDataProviderServicesOffering)
- [CX-0018 Dataspace Connectivity](https://catenax-ev.github.io/docs/standards/CX-0018-DataspaceConnectivity)
- [CX-0030 Aspect Model BoM As Specified](https://catenax-ev.github.io/docs/standards/CX-0030-DataModelBoMAsSpecified)
- [CX-0032 Data Model: Part as Specified](https://catenax-ev.github.io/docs/standards/CX-0032-DataModelPartAsSpecified)
- [CX-0053 Discovery Finder & BPN Discovery Service](https://catenax-ev.github.io/docs/standards/CX-0053-BPNDiscoveryServiceAPIs)
- [CX-0126 Industry Core: Part Type](https://catenax-ev.github.io/docs/standards/CX-0126-IndustryCorePartType)
- [CX-0127 Industry Core: Part Instance](https://catenax-ev.github.io/docs/standards/CX-0127-IndustryCorePartInstance)

## Overview

The Industry Core Hub is an plug-and-play application that allows use cases to build their logic without needing to understand in detail how the basic dataspace components (EDC, AAS/Digital Twin Registry, Submodel Server/Any Data Source) work.

This application is built taking into consideration the best practices and standards of Catena-X Industry Core and Dataspace experts. It aims to create a real speedway for use cases. Allowing applications to be developed in less than two weeks.

An application that allows you to provide and consumer data from your partners using the Catena-X Dataspace. This open source solution can be integrated into your business applications, open source applications and many other components. 

Building on a strong, scalable and fundamented foundation by Experts, and with the aim of reducing the complexity of a dataspace for the external constumer, like SMEs that want to be compatible with Catena-X, Factory-X, and many other dataspaces.

## Roadmap
```
February 3 2025     R25.06             R25.09          R25.12
Kickoff              MVP                Stable          NEXT            2026 -> Beyond
| ------------------> | ----------------> | -----------> |  ----------------> | 
                Data Provision     Data Consumption    IC-HUB             + KIT Use Cases
                 Orchestrator        Orchestrator        + Integrate First
                                                           Use Case (e.g. DPP)
```

## Objectives

- reduce the complexity of the Eclipse Tractus-X Adoption.
- create an stable, scalable and easy to use backend SDK for the use case applications.
- enable the 1.000 users goal of Catena-X for 2025.
- give a simple and re-usable application for Small and Medium Companies that want to adopt the dataspace with data provision and consumption.
- allow new applications to be build over a stable foundation of a dataspace.
- create a technical foundation for technical enablement services to be used in a easy way.
- create a industry core stack
- have the posibility to create compatible "Use Case  or KIT Add-on" which can be extended as needed, and could be "selled" in the cx-marketplace as a "ready to use box".

## Building Blocks (with stack)

![building blocks](./docs/media/BuildingBlocks.png)

## Technologies

- **Backend**: Python, FAST API
- **Frontend**: React.js, Portal Shared Components, Material UI


## Component Organization

```mermaid
flowchart TD
    subgraph Tractus-X Backend Libraries
    B[/tx_industry_sdk/]-- Uses -->  A[/tx_dataspace_sdk/]
    end
    subgraph Tractus-X Frontend Library
    portal-shared-components
    end
    subgraph Industry Core Hub
    ic-backend -- Uses --> B[/tx_industry_sdk/]
    ic-frontend -- Uses --> portal-shared-components
    ic-frontend -- Consumes APIs --> ic-backend
    end
```

Designed for scalability and fast adoption

## Possible Adoption Ways

Here is an example of how this application can be adopted from various use cases

```mermaid

flowchart TD
    subgraph Tractus-X Backend Libraries
    B[/tx_industry_sdk/]-- Uses -->  A[/tx_dataspace_sdk/]
    end
    subgraph Tractus-X Frontend Library
    portal-shared-components
    end
    subgraph Industry Core Hub
    ic-backend -- Uses --> B[/tx_industry_sdk/]
    ic-frontend -- Uses --> portal-shared-components
    ic-frontend -- Consumes APIs --> ic-backend
    end
    subgraph Use Case App A
    appa-backend -- Consumer APIs --> A[/tx_dataspace_sdk/]
    end
    subgraph Use Case App B
    aapb-backend -- Consumer APIs --> B[/tx_industry_sdk/]
    end
    subgraph Use Case App C
    aapc-frontend -- Consumer APIs --> ic-backend 
    end
    subgraph Use Case App D
    appd-backend -- Uses Code --> A[/tx_dataspace_sdk/]
    end
    subgraph Use Case App F
    appf-backend -- Uses Code --> B[/tx_industry_sdk/]
    end
    subgraph Use Case App G
    appg-backend -- Uses Code --> ic-backend
    end

```

## Tractus-X Microservices for Dataspace, Industry & Industry Core Use Case

```mermaid

flowchart TD
    subgraph Tractus-X Backend Libraries
    B[/tx_industry_sdk/]-- Uses -->  A[/tx_dataspace_sdk/]
    A[/tx_dataspace_sdk/] -- HAS --> DFM{{Dataspace Foundation Microservices}}
    B[/tx_industry_sdk/] -- HAS --> IFM{{Industry Foundation Microservices}}
    IFM{{Industry Foundation Microservices}} -- Uses --> B[/tx_industry_sdk/]
    DFM{{Dataspace Foundation Microservices}} -- Uses --> A[/tx_dataspace_sdk/]
    end
    subgraph Industry Core Hub
    ic-backend -- Uses --> B[/tx_industry_sdk/]
    ic-frontend -- Consumes APIs --> ic-backend
    ICM{{Industry Core Use Case Microservices}} -- Uses --> ic-backend
    ic-backend -- HAS --> ICM{{Industry Core Use Case Microservices}}
    end
    subgraph Use Case App A
    appa-backend -- Consumer APIs --> DFM{{Dataspace Foundation Microservices}}
    end
    subgraph Use Case App B
    aapb-backend -- Consumer APIs --> IFM{{Industry Foundation Microservices}}
    end
    subgraph Use Case App C
    aapc-frontend -- Consumer APIs --> ICM{{Industry Core Use Case Microservices}}
    end
    subgraph Use Case App D
    appd-backend -- Uses Code --> A[/tx_dataspace_sdk/]
    end
    subgraph Use Case App F
    appf-backend -- Uses Code --> B[/tx_industry_sdk/]
    end
    subgraph Use Case App G
    appg-backend -- Uses Code --> ic-backend
    end
```

## Frontend

![frontend mock](./docs/architecture/media/Frontend_Mock_Industry_Core.png)

## Infinite Add-ons Extensions

Proving the same "motor" of implementation for infinite add-ons of use cases that can build over the industry core standards. We provide the "technology" enablement, so you can orchestrate your use case in the best way, providing personalized views for your "Data Models" and also features for your use cases which were not originally included in the "open source" development, allowing you to sell specific extention views and features in the Catena-X marketplace.

![frontend-add-ons](./docs/media/FrontendArchitecture.png)

## High Level Architecture

![High Level Architecture](./docs/architecture/media/Abstraction%20Levels.drawio.svg)

## The Catena-X Speedway

![Tractus-X Speedway](./docs/architecture/media/catena-x-speedway.svg)

## How to Get Involved

- **Get onboarded**: [Getting started](https://eclipse-tractusx.github.io/docs/oss/getting-started/). Join the Eclipse Tractus-X open source community as a contributor!
- Attend the [official community office hours](https://eclipse-tractusx.github.io/community/open-meetings/#Community%20Office%20Hour) and raise your issue!


### Found a bug?

👀 If you have identified a bug or want to fix an existing documentation, feel free to create a new issue at our project's corresponding [GitHub Issues page](https://github.com/eclipse-tractusx/industry-core-hub/issues/new/choose)

 ⁉️ Before doing so, please consider searching for potentially suitable [existing issues](https://github.com/eclipse-tractusx/industry-core-hub/issues).

🙋 **Assign to yourself** - Show others that you are working on this issue by assigning it to yourself.
<br> To do so, click the cog wheel next to the Assignees section just to the right of this issue.

### Discuss

📣 If you want to share an idea to further enhance the project, please feel free to contribute to the [discussions](https://github.com/eclipse-tractusx/industry-core-hub/discussions),
otherwise [create a new discussion](https://github.com/eclipse-tractusx/industry-core-hub/discussions/new/choose)

## Reporting a Security Issue

Please follow the [Security Issue Reporting Guidelines](https://eclipse-tractusx.github.io/docs/release/trg-7/trg-7-01#security-file) if you come across any security vulnerabilities or concerns.
