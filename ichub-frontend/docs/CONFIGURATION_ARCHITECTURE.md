# Configuration Architecture

This document outlines the new modular configuration architecture for the Industry Core Hub Frontend.

## Overview

The configuration is now organized based on usage patterns:

- **Shared Configuration**: Used by multiple features or the base application
- **Feature-Specific Configuration**: Used by only one feature

## Configuration Structure

```
src/
├── config/                     # Shared configuration
│   ├── index.ts               # Main config exports
│   ├── types.ts               # Shared types and interfaces
│   └── base.ts                # Base application configuration
└── features/
    ├── part-discovery/
    │   └── config.ts          # Part discovery specific config
    ├── catalog-management/
    │   └── config.ts          # Catalog management specific config
    ├── partner-management/
    │   └── config.ts          # Partner management specific config
    └── serialized-parts/
        └── config.ts          # Serialized parts specific config
```

## Shared Configuration (`src/config/`)

### Base Configuration (`base.ts`)
- Application-wide settings
- API base URL
- Participant ID
- Security configuration
- Common utilities

### Types (`types.ts`)
- Shared interfaces and types
- Re-exports from EnvironmentService
- Base configuration interfaces

## Feature-Specific Configuration

Each feature module now contains its own `config.ts` file with:

### API Configuration
- Feature-specific endpoints
- URL builders
- Request/response configurations

### Validation Rules
- Form validation patterns
- Business rules
- Data constraints

### UI Configuration
- Table settings (page sizes, columns)
- Form configurations
- Component-specific settings

### Feature-Specific Policies
- Governance policies (Part Discovery)
- DTR policies (Part Discovery)
- Feature flags

## Examples

### Using Shared Configuration
```typescript
import { baseConfig, configUtils } from '../../config';

// Get base API URL
const apiUrl = baseConfig.apiUrl;

// Build full URL
const fullUrl = configUtils.buildApiUrl('/my-endpoint');

// Check feature flag
const isEnabled = configUtils.isFeatureEnabled('myFeature');
```

### Using Feature Configuration
```typescript
import { partDiscoveryConfig } from './config';

// Get feature-specific endpoint
const url = partDiscoveryConfig.api.buildUrl('CATALOG_PART_MANAGEMENT');

// Get governance policies
const policies = partDiscoveryConfig.governance.getDtrPoliciesConfig();

// Get pagination settings
const pageSize = partDiscoveryConfig.pagination.defaultPageSize;
```

## Migration Benefits

1. **Modularity**: Each feature owns its configuration
2. **Maintainability**: Easier to find and update feature-specific settings
3. **Reusability**: Shared configuration prevents duplication
4. **Type Safety**: Better TypeScript support with typed configurations
5. **Performance**: Only load configuration needed by active features

## Configuration Guidelines

### When to Use Shared Configuration
- Settings used by 2+ features
- Application-wide defaults
- Core infrastructure configuration
- Common utilities and helpers

### When to Use Feature Configuration
- Settings specific to one feature
- Feature-specific validation rules
- Component-specific configurations
- Feature flags and toggles

### Adding New Configuration

1. **For shared settings**: Add to `src/config/base.ts`
2. **For feature settings**: Add to `src/features/{feature}/config.ts`
3. **Update exports**: Ensure proper exports in index files
4. **Document**: Update this file with new configuration options

## Environment Variables

Environment variables are still centralized in `EnvironmentService.ts` but are now consumed through the configuration modules:

- `VITE_ICHUB_BACKEND_URL` → `baseConfig.apiUrl`
- `VITE_PARTICIPANT_ID` → `baseConfig.participantId`
- `VITE_GOVERNANCE_CONFIG` → `partDiscoveryConfig.governance`
- Feature flags: `VITE_FEATURE_{NAME}_ENABLED`

This approach maintains backward compatibility while providing a cleaner, more organized configuration architecture.
