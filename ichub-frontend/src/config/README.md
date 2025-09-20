# Enhanced Configuration System

This document describes the enhanced configuration system implemented for the Industry Core Hub frontend.

## Overview

The new configuration system provides:

- **Type Safety**: Full TypeScript support with comprehensive type definitions
- **Environment-Specific Configurations**: Easy deployment across development, staging, and production
- **Runtime Configuration**: Environment variables injected at runtime via Helm charts
- **Authentication Support**: Configurable Keycloak integration
- **Feature Flags**: Granular control over application features
- **API Key Management**: Support for backend API authentication
- **Validation**: Schema validation with helpful error messages
- **Performance**: Configuration caching and optimized loading
- **Backward Compatibility**: Maintains existing API while adding new features

## Architecture

### ConfigFactory

Central configuration factory that:

- Loads configuration from multiple sources (window.ENV → import.meta.env → defaults)
- Validates configuration against schema
- Caches configuration for performance
- Provides reload functionality

### EnvironmentService

Enhanced service that provides:

- Type-safe configuration access
- Authentication management
- Feature flag helpers
- Environment utilities
- Backward compatibility methods

### AuthService

Authentication service for Keycloak integration:

- Token management and refresh
- User profile handling
- Role-based access control
- Session management

## Usage

### Basic Configuration Access

```typescript
import environmentService from '@/services/EnvironmentService';

// Get typed configuration
const config = environmentService.getConfig();
console.log(config.app.environment); // 'development' | 'staging' | 'production'

// Get specific sections
const apiConfig = environmentService.getApiConfig();
const authConfig = environmentService.getAuthConfig();
const features = environmentService.getFeatureFlags();

// Check environment
if (environmentService.isDevelopment()) {
  console.log('Running in development mode');
}

// Check feature flags
if (environmentService.isFeatureEnabled('enableAdvancedLogging')) {
  console.log('Advanced logging is enabled');
}
```

### Authentication Usage

```typescript
import authService from '@/services/AuthService';

// Initialize authentication
await authService.initialize();

// Check authentication status
if (authService.isAuthenticated()) {
  const user = authService.getUser();
  console.log(`Welcome ${user.username}`);
}

// Login/logout
await authService.login();
await authService.logout();

// Role-based access
if (authService.hasRole('admin')) {
  // Show admin features
}

// Get headers for API requests
const headers = authService.getCombinedApiHeaders();
```

### API Integration

```typescript
import environmentService from '@/services/EnvironmentService';
import authService from '@/services/AuthService';

const apiService = {
  async request(endpoint: string, options: RequestInit = {}) {
    const url = `${environmentService.getApiConfig().ichubBackendUrl}${endpoint}`;
    
    const headers = {
      ...environmentService.getApiHeaders(),
      ...authService.getAuthHeaders(),
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }
};
```

## Configuration Schema

### Environment Variables

The system supports comprehensive environment variable configuration:

#### Core Application

- `APP_ENVIRONMENT`: Application environment (development/staging/production)
- `APP_VERSION`: Application version

#### API Configuration

- `ICHUB_BACKEND_URL`: Backend API URL
- `API_TIMEOUT`: Request timeout in milliseconds
- `API_RETRY_ATTEMPTS`: Number of retry attempts
- `REQUIRE_HTTPS_URL_PATTERN`: Enforce HTTPS URLs

#### API Key Configuration

- `API_KEY`: Backend API key
- `API_KEY_HEADER`: Header name for API key
- `ENABLE_API_KEY_ROTATION`: Enable API key rotation
- `API_KEY_EXPIRY_WARNING_DAYS`: Days before warning about expiry

#### Authentication Configuration

- `AUTH_ENABLED`: Enable/disable authentication
- `AUTH_PROVIDER`: Authentication provider (keycloak/none)

#### Keycloak Configuration

- `KEYCLOAK_URL`: Keycloak server URL
- `KEYCLOAK_REALM`: Keycloak realm
- `KEYCLOAK_CLIENT_ID`: Keycloak client ID
- `KEYCLOAK_ON_LOAD`: Loading behavior (check-sso/login-required)
- `KEYCLOAK_PKCE_METHOD`: PKCE method (S256/plain)
- `KEYCLOAK_ENABLE_LOGGING`: Enable Keycloak logging

#### Feature Flags

- `ENABLE_ADVANCED_LOGGING`: Advanced logging features
- `ENABLE_PERFORMANCE_MONITORING`: Performance monitoring
- `ENABLE_DEV_TOOLS`: Development tools

#### UI Configuration

- `UI_THEME`: UI theme (light/dark/auto)
- `UI_LOCALE`: Language locale
- `UI_COMPACT_MODE`: Compact UI mode

## Helm Chart Integration

### Values Structure

```yaml
frontend:
  config:
    # Core application
    environment: "development"
    version: "1.0.0"
    
    # API configuration
    ichubBackendUrl: "http://localhost:9000/v1"
    apiTimeout: 30000
    requireHttpsUrlPattern: false
    
    # Authentication
    authEnabled: false
    authProvider: "none"
    keycloak:
      url: ""
      realm: ""
      clientId: ""
    
    # Feature flags
    enableAdvancedLogging: true
    enableDevTools: true
    
    # UI settings
    uiTheme: "auto"
    uiLocale: "en"
```

### Environment-Specific Deployments

```bash
# Development
helm upgrade --install industry-core-hub ./charts/industry-core-hub \
  -f ./charts/industry-core-hub/values.yaml \
  -f ./charts/industry-core-hub/values-dev.yaml

# Staging
helm upgrade --install industry-core-hub ./charts/industry-core-hub \
  -f ./charts/industry-core-hub/values.yaml \
  -f ./charts/industry-core-hub/values-staging.yaml

# Production
helm upgrade --install industry-core-hub ./charts/industry-core-hub \
  -f ./charts/industry-core-hub/values.yaml \
  -f ./charts/industry-core-hub/values-prod.yaml
```

## Migration Guide

### From Legacy EnvironmentService

The new system maintains backward compatibility:

```typescript
// Legacy (still works)
import { getIchubBackendUrl, getParticipantId } from '@/services/EnvironmentService';

// New (recommended)
import environmentService from '@/services/EnvironmentService';

const backendUrl = environmentService.getApiConfig().ichubBackendUrl;
const participantId = environmentService.getParticipantConfig().id;
```

### From Direct Environment Variable Access

```typescript
// Old
const backendUrl = import.meta.env.VITE_ICHUB_BACKEND_URL;

// New
const backendUrl = environmentService.getApiConfig().ichubBackendUrl;
```

## Development

### Adding New Configuration

1. Update `src/config/schema.ts` with new configuration types
2. Update `src/config/ConfigFactory.ts` to parse new environment variables
3. Add validation in `ConfigFactory.validateConfig()`
4. Update Helm chart values and templates
5. Update this documentation

### Testing Configuration

```typescript
// Validate current configuration
const validation = environmentService.validateConfiguration();
if (!validation.isValid) {
  console.error('Configuration errors:', validation.errors);
}

// Get configuration summary
const summary = environmentService.getConfigurationSummary();
console.log('Current configuration:', summary);
```

## Security Considerations

- API keys are never logged or exposed in configuration summaries
- Sensitive configuration is stored in Kubernetes secrets
- Environment variables are validated for format and security
- Authentication tokens are handled securely by AuthService
- HTTPS enforcement can be configured per environment

## Performance

- Configuration is cached in localStorage for fast subsequent loads
- Build-time optimizations remove unused code in production
- Environment-specific chunking optimizes loading
- Lazy loading of authentication components when not needed

## Troubleshooting

### Configuration Issues

1. Check Helm chart values are correctly applied
2. Verify environment variables in pod logs
3. Use `environmentService.validateConfiguration()` to check for errors
4. Check browser console for configuration warnings

### Authentication Issues

1. Verify Keycloak configuration in values
2. Check network connectivity to Keycloak server
3. Verify client configuration in Keycloak admin console
4. Check browser console for authentication errors

### API Issues

1. Verify backend URL configuration
2. Check API key configuration if required
3. Verify CORS settings in backend
4. Check network connectivity and DNS resolution