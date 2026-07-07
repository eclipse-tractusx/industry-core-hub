<!--

Eclipse Tractus-X - Industry Core Hub Hub

Copyright (c) 2025 Contributors to the Eclipse Foundation

See the NOTICE file(s) distributed with this work for additional
information regarding copyright ownership.

This work is made available under the terms of the
Creative Commons Attribution 4.0 International (CC-BY-4.0) license,
which is available at
https://creativecommons.org/licenses/by/4.0/legalcode.

SPDX-License-Identifier: CC-BY-4.0

-->

<div align="center"> 
  <img alt="Version:  v0.1" src="https://img.shields.io/badge/Version-v0.1-blue?style=for-the-badge">
  <br>
  <h1> Industry Core Hub Architecture </h1>
</div>

# Metadata

|**Version**| **Created at** | **Last Reviewed at** |
|-|-|-|
| v0.1 | Jan, 14th 2025 | Jan, 14th 2025 |

## Authors & Reviewers

<!--Add yourself to the list if you review/contribute to this document-->

| Name                  | Company | GitHub                                     | Role                                    |
| --------------------- | ------- | ------------------------------------------ | --------------------------------------- |
| Mathias Brunkow Moser | Catena-X e.V. | [@matbmoser](https://github.com/matbmoser) | Chief Software Architect & Eclipse Tractus-X Project Lead |

---

> **📘 Getting Started**  
> New to Industry Core Hub? Try our **[Quickstart Guide](../QUICKSTART.md)** to get hands-on experience before diving into the architecture details.

---

# Index

- [Metadata](#metadata)
  - [Authors \& Reviewers](#authors--reviewers)
- [Index](#index)
- [ICH Services](#ich-services)
- [Requirements](#requirements)
  - [Functional Requirements, Prio 1](#functional-requirements-prio-1)
    - [Data Provisioning](#data-provisioning)
    - [Data Consumption](#data-consumption)
    - [EDC and DTR](#edc-and-dtr)
  - [Functional requirements, Prio 2](#functional-requirements-prio-2)
  - [Non functional requirements](#non-functional-requirements)
- [Context](#context)
  - [Scope](#scope)
  - [Name](#name)
  - [Objectives](#objectives)
- [High Level Architecture](#high-level-architecture)
  - [Abstraction Phases](#abstraction-phases)
- [MVP Definition](#mvp-definition)
- [Architecture View](#architecture-view)
  - [Logical View](#logical-view)
  - [Process View](#process-view)
  - [Development View](#development-view)
  - [Interfaces](#interfaces)
  - [NOTICE](#notice)


# ICH Services

- Provide Digital Twin Registry as EDC Asset
- Consume Digital Twin Registry as EDC Asset
- Digital Twin Provisioning (CRUD)
- Digital Twin Consumption
- Submodel Provisioning (CRUD)
- Submodel Consumption
- EDC Asset Provisioning (CRUD)
- EDC Asset Consumption
- EDC Policy Offering
- EDC Policy Acceptance
- Notification Send
- Notification Receive

# Requirements

## Functional Requirements, Prio 1

Based on the services described above the following capabilities should be provided for data providers and data consumers in the dataspace.

### Data Provisioning

- Provide a user interface for excel upload and manual data input. This can be generic (json) in the beginning
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

### Data Consumption 
- Search, retrieve and display a Digital Twin from a Business Partner with all associated submodels and their data in a generic way.

### EDC and DTR
An EDC and DTR service should be part of the application, but it should also be possible to use one's own EDC / DTR


## Functional requirements, Prio 2
- Send and receive notifications with standardized header and generic notification content
- Attach a Usage submodel upon receiving the corresponding notification with EDC asset, policies, backend service and CRUD capabilities
- Read, Update, Delete the Usage submodel

## Non functional requirements
- The UI should be simple and hide away the complexity of the data exchange
- It should be really fast and simple to use
- It should be scalable for multiple applications scenarios
- It should be keepen generic for any data retrival

# Context

![Abstract Level Arch](./media/Abstract%20Level%20Arch.svg)

## Scope

## Name

Industry Core Hub - A plug and play application that allows you to manage your data and infrastructure. Provide and consume data according to the industry core standards, and build your open source and business use cases as fast as possible, with a powerful motor.

## Objectives

- 1000 Users using Catena-X
- Quicker & Easier adoption of the dataspace for use cases

# High Level Architecture

Following the structure that will be defined for the KITs a layered Architecture was selected:

![Layered Architecture](./media/Abstraction%20Levels.drawio.svg)

## Abstraction Phases

![Abstraction Phases](./media/Abstraction%20Phases.svg)

# MVP Definition

# Architecture View

![Context View Level Arch](./media/Complete%20Context%20Diagram.svg)

## Logical View

![Logical View Level Arch](./media/Context%20Diagram.drawio.svg)

## Process View

## Development View

![Software Components](./media/Software%20Compontents%20Diagram.drawio.svg)

## Interfaces

![Interfaces](./media/Interfaces.drawio.svg)

## NOTICE

This work is licensed under the [CC-BY-4.0](https://creativecommons.org/licenses/by/4.0/legalcode).

- SPDX-License-Identifier: CC-BY-4.0
- SPDX-FileCopyrightText: 2025 Contributors to the Eclipse Foundation
- Source URL: https://github.com/eclipse-tractusx/industry-core-hub
