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

# Documentation

Everything you need to get started with Industry Core Hub.

## Start Here

**New to the project?** Try the [Quickstart Guide](./QUICKSTART.md) - it'll get you up and running in 30 minutes.

**Want to dive deeper?** Find what you need below.

## Quick Links

- **[Quickstart](./QUICKSTART.md)** - Get running in 30 minutes
- **[Installation](../INSTALL.md)** - Detailed setup instructions  
- **[Umbrella Deployment](./umbrella/umbrella-deployment-guide.md)** - Deploy EDC, DTR, and Keycloak
- **[API Docs](./api/README.md)** - Full API reference and Bruno collections

## For Users

- **[Submodel Creator Guide](./user/SUBMODEL_CREATOR_GUIDE.md)** - Create and validate submodels
- **[User Manual](./user/USER_MANUAL.md)** - Complete UI and feature guide
- **[Part Management Guide](./user/PART_MANAGEMENT_GUIDE.md)** - Creating and managing parts
- **[Partner Management Guide](./user/PARTNER_MANAGEMENT_GUIDE.md)** - Partner connections and agreements
- **[Data Sharing Guide](./user/DATA_SHARING_GUIDE.md)** - Sharing data with partners

## For Developers

- **[Backend README](../ichub-backend/README.md)** - Backend setup and structure
- **[Frontend README](../ichub-frontend/README.md)** - Frontend development
- **[Development Setup](./developer/DEVELOPMENT_SETUP.md)** - Local environment setup
- **[Code Architecture](./developer/CODE_ARCHITECTURE.md)** - Codebase structure
- **[API Development Guidelines](./developer/API_DEVELOPMENT_GUIDELINES.md)** - API standards
- **[Testing Guide](./developer/TESTING_GUIDE.md)** - Writing and running tests
- **[Debugging Guide](./developer/DEBUGGING_GUIDE.md)** - Debugging tools and techniques
- **[Reset Keycloak Password](./developer/reset-keycloak-password.md)** - Admin utility

## API Reference

- **[API Overview](./api/README.md)** - Documentation and Bruno collections
- **[OpenAPI Spec](./api/openAPI.yaml)** - Full schema
- **[Bruno Collection](./api/bruno/)** - Try the API interactively

## Architecture

- **[Overview](./architecture/README.md)** - How it all works
- **[Introduction & Goals](./architecture/1-introduction-and-goals.md)** - What we're building and why
- **[Constraints](./architecture/2-architecture-constraints.md)** - Technical and organizational constraints
- **[System Scope & Context](./architecture/3-system-scope-and-context.md)** - Boundaries and interfaces
- **[Runtime View](./architecture/4-runtime-view.md)** - How it runs
- **[Glossary](./architecture/glossary.md)** - Terms explained
- **[Decision Records](./architecture/decision-records/)** - Architectural decisions and reasoning
- **[Production Deployment](./admin/PRODUCTION_DEPLOYMENT.md)** - Production best practices
- **[Monitoring and Observability](./admin/MONITORING_AND_OBSERVABILITY.md)** - Metrics and logging
- **[Backup and Disaster Recovery](./admin/BACKUP_AND_DISASTER_RECOVERY.md)** - Backup and recovery procedures

## For Operators

- **[User Management](./admin/user-management-guide.md)** - Managing users in Keycloak
- **[Migration Guide](./admin/migration-guide.md)** - Version upgrades
- **[Bitnami to CloudPirates](./migration-guides/BITNAMI_TO_CLOUDPIRATES_MIGRATION_GUIDE.md)** - PostgreSQL chart migration

## Deployment

- **[Helm Chart](../charts/industry-core-hub/README.md)** - Complete chart reference and values
- **[Provider Deployment](../deployment/data-provider/)**
- **[Consumer Deployment](../deployment/data-consumer/)**
- **[Manufacturer Deployment](../deployment/data-manufacturer/)**
- **[Local Docker Compose](../deployment/local/docker-compose/)** - Local PostgreSQL

## Database

- **[Database Management](./database/DATABASE_MANAGEMENT.md)** - Database tools and maintenance
- **[Schema Documentation](./database/SCHEMA_DOCUMENTATION.md)** - Database structure and ERD
- **[Data Seeding Guide](./database/DATA_SEEDING_GUIDE.md)** - Loading test and initial data
- **[Schema DDL](./database/Metadata-DDL-public.sql)** - Raw SQL definition

## Configuration

- **[Frontend Config](../ichub-frontend/docs/CONFIGURATION_ARCHITECTURE.md)** - Frontend configuration
- **[Governance Config](../ichub-frontend/docs/GOVERNANCE_CONFIGURATION.md)** - Governance settings
- **[Backend Config](../ichub-backend/config/)** - Backend configuration

## Contributing

- **[Contributing Guidelines](../CONTRIBUTING.md)** - How to contribute
- **[Code of Conduct](../CODE_OF_CONDUCT.md)** - Community standards
- **[Security Policy](../SECURITY.md)** - Reporting vulnerabilities

## Project Info

- **[README](../README.md)** - Overview and roadmap
- **[Changelog](../CHANGELOG.md)** - What's new
- **[Licenses](../LICENSE)** - Apache 2.0 (code), CC-BY-4.0 (docs)
- **[Authors](../AUTHORS.md)** - Contributors

## External Resources

- [Eclipse Tractus-X Docs](https://eclipse-tractusx.github.io/)
- [Catena-X Standards](https://catenax-ev.github.io/docs/standards/overview)
- [Tractus-X EDC](https://github.com/eclipse-tractusx/tractusx-edc)
- [Digital Twin Registry](https://github.com/eclipse-tractusx/sldt-digital-twin-registry)

## Support & Community

- **[Issues](https://github.com/eclipse-tractusx/industry-core-hub/issues)** - Report bugs or request features
- **[Discussions](https://github.com/eclipse-tractusx/industry-core-hub/discussions)** - Ask questions and share ideas
- **[Community Office Hours](https://eclipse-tractusx.github.io/community/open-meetings/)** - Weekly meetings

## Additional Guides

- **[Performance Tuning](./PERFORMANCE_TUNING.md)** - Optimization strategies
- **[Security Hardening](./SECURITY_HARDENING.md)** - Security best practices
- **[Troubleshooting](./TROUBLESHOOTING.md)** - Common issues and solutions

## Improve These Docs

Found a mistake or want to add something?

1. Check the [Contributing Guidelines](../CONTRIBUTING.md)
2. Create a PR on [GitHub](https://github.com/eclipse-tractusx/industry-core-hub)
3. Docs are licensed [CC-BY-4.0](https://creativecommons.org/licenses/by/4.0/legalcode)

---

## License

This documentation is licensed under the [CC-BY-4.0](https://creativecommons.org/licenses/by/4.0/legalcode).

- SPDX-License-Identifier: CC-BY-4.0
- SPDX-FileCopyrightText: 2026 LKS Next
- SPDX-FileCopyrightText: 2026 Contributors to the Eclipse Foundation
- Source URL: https://github.com/eclipse-tractusx/industry-core-hub
