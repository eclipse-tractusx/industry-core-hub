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

# Code Architecture Guide

Understanding how the codebase is organized and structured.

## Quick Overview

Industry Core Hub is built as a Python FastAPI backend with a React/TypeScript frontend. The system integrates with Eclipse Dataspace Connector (EDC) for data sharing, Digital Twin Registry (DTR) for managing digital twins of parts and products, and Keycloak for user authentication and authorization.

**Key Technologies:**
- Backend: Python 3.12+ with FastAPI
- Frontend: React 18+ with TypeScript and Vite
- Database: PostgreSQL 16+
- Authentication: Keycloak for user and role management

## Project Structure

```
industry-core-hub/
├── ichub-backend/          # Python FastAPI application
│   ├── config/            # Configuration management
│   ├── controllers/        # API endpoint handlers
│   ├── services/          # Business logic
│   ├── models/            # Database models (SQLAlchemy)
│   ├── managers/          # Complex domain logic
│   ├── utils/             # Helper functions
│   ├── jobs/              # Scheduled tasks
│   ├── tests/             # Unit and integration tests
│   ├── main.py            # Application entry point
│   └── requirements.txt    # Python dependencies
│
├── ichub-frontend/         # React TypeScript application
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── features/      # Feature modules (Part Mgmt, etc)
│   │   ├── pages/         # Page-level components
│   │   ├── services/      # API client functions
│   │   ├── hooks/         # Custom React hooks
│   │   ├── context/       # React Context providers
│   │   ├── types/         # TypeScript type definitions
│   │   ├── utils/         # Helper utilities
│   │   └── styles/        # Global styles
│   ├── public/            # Static assets
│   └── vite.config.ts     # Vite configuration
│
├── charts/                 # Helm charts for Kubernetes
├── deployment/            # Deployment configurations
└── tests/                 # Integration and E2E tests
```

## Backend Architecture

### Layered Structure

The backend follows a clean, layered architecture:

1. **Controllers** (`controllers/`)
   - Handle HTTP requests and responses
   - Request validation and error handling
   - Route incoming requests to services

2. **Services** (`services/`)
   - Core business logic
   - Orchestrate domain operations
   - Coordinate with managers and repositories

3. **Managers** (`managers/`)
   - Complex domain-specific logic
   - EDC connector operations
   - DTR integration
   - Data transformation workflows

4. **Models** (`models/`)
   - SQLAlchemy ORM models
   - Database schema definitions
   - Relationships and constraints

5. **Utilities** (`utils/`)
   - Helper functions (validation, formatting, etc)
   - Constants and enums
   - Common operations

### Key Modules

**EDC Connector Management** (`managers/connector_manager.py`)
- Creates and manages EDC assets
- Handles contract policy creation
- Manages data transfer negotiations
- Token generation for secure endpoints

**Digital Twin Registry Integration** (`managers/dtr_manager.py`)
- Registers digital twins in DTR
- Manages AAS (Asset Administration Shells)
- Handles submodel creation and linking
- DTR search and discovery

**Part Management** (`services/part_service.py`)
- Catalog part lifecycle (create, update, delete)
- Serialized part tracking
- Part type information (SAMM compliant)
- Bulk operations

**Data Sharing** (`services/sharing_service.py`)
- Manages sharing agreements with partners
- Visibility and access control
- Contract negotiation tracking
- Audit logging

**User Management & Authentication** (`services/user_service.py`, `managers/keycloak_manager.py`)
- Keycloak realm and user management
- Role-based access control (RBAC)
- User provisioning and deprovisioning
- Token validation and refresh handling

### Entity Relationships

```
Partner
  ├─ Digital Twin (DTR)
  │  └─ Submodel (SAMM data)
  │
  └─ Sharing Agreement
     └─ EDC Asset
        └─ Policy & Contract

Part (Catalog)
  ├─ Serialized Parts (instances)
  ├─ Submodels (data)
  └─ Digital Twin
```

See [Schema Documentation](../database/SCHEMA_DOCUMENTATION.md) for detailed field definitions.

## Frontend Architecture

### Component Organization

**Feature-Based Structure:**
```
src/features/
├── parts/
│   ├── components/        # Part-specific components
│   ├── pages/            # Part management pages
│   ├── services/         # Part API calls
│   └── types/            # Part-related types
├── partners/
├── sharing/
├── discovery/
└── consumption/
```

**Shared Components** (`src/components/`)
- Layout components (header, sidebar, footer)
- Common forms and inputs
- Data tables and lists
- Modals and dialogs
- Navigation

### State Management

Uses React Context API for:
- Authentication state
- User permissions
- Current organization context
- UI state (theme, sidebar, etc)

### API Client

`src/services/api.ts` provides:
- Centralized API base URL
- Request interceptors (auth, error handling)
- Response normalization
- Type-safe fetch wrapper

### Styling

Uses Tailwind CSS with:
- Custom color scheme in `tailwind.config.ts`
- Shared utility classes in `src/styles/`
- Component-scoped styles when needed

## Design Patterns

**Service Layer Pattern**
- Controllers delegate to Services
- Services contain business logic
- Easy to test and maintain

**Dependency Injection**
- Services are injected into controllers
- Loose coupling between components
- Testable with mocks

**Repository Pattern**
- Database access via models
- Abstraction layer for data
- Easy to swap implementations

**Async/Await**
- Python `async`/`await` for concurrent operations
- Frontend promises for API calls
- Non-blocking I/O operations

**Factory Pattern**
- Asset creation with templates
- Policy generation from patterns
- Submodel instantiation

## NOTICE

This work is licensed under the [CC-BY-4.0](https://creativecommons.org/licenses/by/4.0/legalcode).

- SPDX-License-Identifier: CC-BY-4.0
- SPDX-FileCopyrightText: 2026 LKS Next
- SPDX-FileCopyrightText: 2026 Contributors to the Eclipse Foundation
- Source URL: https://github.com/eclipse-tractusx/industry-core-hub
