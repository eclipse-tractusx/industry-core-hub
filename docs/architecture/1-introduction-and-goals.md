## 1 Introduction and goals
The Industry Core Hub (ICH) provides a high-level business framework aiming to empower data-driven use cases for sustainability, resilience, and quality in the automotive industry. Its vision is to digitally represent and make discoverable physical parts and vehicles within the Catena-X network, forming a foundation for seamless integration of various use cases and enabling sovereign data exchange for supply chain compliance. The mission is to define a physical part, component, or material at type and instance levels, making it identifiable and traversable across levels, thus facilitating the smooth integration of diverse applications. Catalog parts, batches and Just in Sequence (JIS) can also be managed by the Industry Core Hub. 

The Industry Core Hub offers a framework to simplify use case deployment in Catena-X. The framework enables seamless registration and integration of automotive parts in Catena X use cases reducing the effort developers require in registering assets and twins in the Eclipse Data Space Connector (EDC) and the Digital Twin Registry (DTR). The Industry Core Hub offers APIs, logics, and processes for implementation, leveraging Catena-X standards like the Data Space Connector and Asset Administration Shell.

Benefits for OEMs include simplified data provision and consumption, reduced infrastructure costs, and faster onboarding for new use cases. SMEs benefit from reduced complexity and fewer interfaces. Solution providers gain from fast and efficient scalability of new use cases through the reusability of central components.

### Context
The appearance of the Industry Core Hub in Catena-X is the result of an evolution process. This evolution comes in the form of different abstraction phases. As shown in the following figure, in the first phase use cases dealt directly with data space connectors to exchange data with other partners. The implementation of a use case was costly and required high knowledge of the APIs and components provided by the Data Space.
In a second phase, libraries that reduce the workload of registering, discovering, establihing agreements and sharing data with the Data Space appeared.
The Industry Core need appeared in a third fase when the necessity to link automotive parts to digital twins according to Asset Administration Shell (AAS) was requested.

![Abstraction Phases](./media/Abstraction%20Phases.svg)

Following this approach to reduce the burden for use cases, a layered architecture was selected. This architecture translated all Data Space management efforts to the Dataspace Foundation layer and its libraries.
The Industry Foundation was responsible of linking parts to twins according to AAS.

![Layered Architecture](./media/Abstraction%20Levels.drawio.svg)

New abstraction requirements have been set for the Industry Core Hub in this version. All the workload of registering the digital twins related to parts in the DTR needs to be reduced. An interface or frontend to ease the registration of automotive parts is another requirement.
The desired Catena-X component architecture for the Industry Core Hub is shown in the next figure. In this figure, the user interacts with the Industry Core Hub to register parts in CatenaX and this component is in charge of interoperate with the EDC, the DTR and the Submodel Server to register, discover, establish contracts and exchange data.

![Abstract Level Arch](./media/Abstract%20Level%20Arch.svg)

The Industry Core Hub will act as a middleware layer that orchestrates interactions between applications and Tractus-X components, enabling organizations to implement dataspace connectivity without deep expertise in each component.

### High level requirements

Based on the new abstraction requirement described above the following capabilities should be provided for data providers and data consumers in the dataspace.

#### Data Provisioning

- Provide a user interface for automatic and manual upload of data (parts). This can be generic (json) in the beginning
- Create a Digital Twin for a given PartType / PartInstance.
- Read, Update, Delete that Digital Twin
- Display the Digital Twin

- Attach a simple submodel to that Digital Twin. This must be generic. Any submodel can be added.
- Create an EDC asset for that (generic) submodel with policies of choice
- Create a backend service to provide the data for that submodel
- Read, Update, Delete the submodel, EDC asset and backend data
- Display the submodel, EDC asset and backend data (generic, Json is sufficient)

- Attach a BOM submodel by retrieving the supplier's Digital Twin(s) with EDC asset, policies, backend service and CRUD capabilities
- Display the BOM submodel

#### Data Consumption 
- Search, retrieve and display a Digital Twin from a Business Partner with all associated submodels and their data in a generic way.

#### EDC and DTR
An EDC and DTR service should be part of the application, but it should also be possible to use one's own EDC / DTR


### Non functional requirements
- The UI should be simple and hide away the complexity of the data exchange
- It should be really fast and simple to use
- It should be scalable for multiple applications scenarios
- It should be keepen generic for any data retrival

### Quality goals

- Reduce complexity of Eclipse Tractus-X adoption
- Enable a quicker and easier adoption/implementation of the data space for use cases.
- Enable a quicker and easier adoption/implementation of AAS standards for use cases.
- Create stable, scalable backend SDK for use case applications
- Enable 1,000 users goal of Catena-X for 2025 (Scalability)
- Provide simple application for small and medium companies
- Allow new applications to build on stable dataspace foundation
- Create technical foundation for enablement services
- Establish industry core stack
- Enable compatible KIT add-ons that extend functionality  
 
### Standards Implementation

| Standard ID   | Name                                                    | Description                                    |
|---------------|---------------------------------------------------------|------------------------------------------------|
| CX-0001       | EDC Discovery API                                       | Standardized API for discovering EDC endpoints |
| CX-0002       | Digital Twins in Catena-X                               | Implementation of digital twin concepts        |
| CX-0003       | SAMM Aspect Meta Model                                  | Semantic aspect meta model                     |
| CX-0018       | Dataspace Connectivity                                  | Standards for connecting to the dataspace      |
| CX-00126      | Industry Core: Part Type                                | Industry Core part type definitions            |
| CX-00127      | Industry Core: Part Instance                            | Industry Core part instance definitions        |

### Technology Stack

| Component     | Technology                                             | 
|---------------|--------------------------------------------------------|
| Backend       | Python, FAST API                                       | 
| Frontend      | React.js, Material UI, Portal Shared Components        | 
| Database      | PostgreSQL                                             | 
| Deployment      | Helm Charts, Docker containers                       | 

### Stakeholders

| Role          | Description                                                  | Goal, Intention                           |
|---------------|--------------------------------------------------------------|-------------------------------------------|
| Data Consumer | uses its own ICH                                             | to find and negotiate assets              |
| Data Provider | runs its own ICH to register automotive parts and DT         | register and offer parts/DT               |

### NOTICE

This work is licensed under the [CC-BY-4.0](https://creativecommons.org/licenses/by/4.0/legalcode).

- SPDX-License-Identifier: CC-BY-4.0
- SPDX-FileCopyrightText: 2025 Contributors to the Eclipse Foundation
- Source URL: https://github.com/eclipse-tractusx/industry-core-hub
