# Changelog

All notable changes to this repository will be documented in this file.
Further information can be found on the [README.md](README.md) file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [0.2.0] - 2025-09-25

### Added

- Implemented data consumption features, including a user interface for submodel retrieval and filtering.
- Added management and consumption capabilities for serialized parts.
- Introduced part discovery management and shell discovery endpoints.
- Implemented governance policy handling and configuration with a caching mechanism.
- Added `SubmodelViewer` and `SubmodelsGridDialog` components for enhanced submodel display.
- Introduced the `AddSerializedPartDialog` for streamlined creation of serialized parts.
- Added connection and part management endpoints to the backend.
- Implemented API versioning for better maintenance.
- Added functionality to unshare serialized part twins.
- Included a US Tariff Information Viewer component.
- Added comprehensive test coverage for backend services.
- Implemented an `ErrorBoundary` component for more robust error handling in the frontend.
- Enabled lazy loading and code splitting for frontend routes to improve performance.

### Changed

- Refactored the backend architecture to better separate consumer and provider logic.
- Enhanced the frontend configuration system.
- Updated multiple dependencies, including `fastapi`, `urllib3`, and `requests`.
- Improved the user interface and experience with updated layouts and navigation.
- Modularized the routing and configuration in the frontend application.
- Refactored partner management components and removed duplicates.
- Optimized the Docker build process for faster and more reliable builds.
- Updated the Helm chart version and related documentation.
- Centralized and improved exception handling in the backend.
- Refactored API routers to incorporate versioning.

### Fixed

- Corrected service names for frontend and backend in configuration files.
- Resolved various database-related issues and updated the initial schema.
- Corrected the `submodel_dispatcher` path to be an absolute path.
- Fixed CORS (Cross-Origin Resource Sharing) configuration for the frontend service.
- Addressed indentation and configuration issues in various YAML files.
- Fixed broken API calls in part management and twin management services.
- Corrected the notification state initialization in the `PartnersList` component.
- Updated the PostgreSQL dependency to a more recent version.
- Addressed and resolved multiple SonarQube issues.

## [0.1.0] - 2025-05-26

### Added

- Improve layout stability, restructure UI, and add full partners view with CRUD operations ([#214](https://github.com/eclipse-tractusx/industry-core-hub/pull/214))
- Add "name" attribute to Catalog Part to support frontend rendering ([#224](https://github.com/eclipse-tractusx/industry-core-hub/pull/224))
- Add status, materials, and dimensions to CatalogPart; refactor model construction and indexing ([#226](https://github.com/eclipse-tractusx/industry-core-hub/pull/226))
- Add dynamic volume configuration and clean up Helm chart dependencies for E2E stability ([#231](https://github.com/eclipse-tractusx/industry-core-hub/pull/231))
- Refactor microservices FastAPI structure with routers and add health API; fix semantic ID startup bug ([#235](https://github.com/eclipse-tractusx/industry-core-hub/pull/235))
- Integrate backend endpoints with frontend for catalog parts and business partners ([#238](https://github.com/eclipse-tractusx/industry-core-hub/pull/238))
- Refactor sharing functionality with improved requests, digital twin registry, and submodel dispatching ([#239](https://github.com/eclipse-tractusx/industry-core-hub/pull/239))
- Add structured product view with materials pie chart and physical characteristics ([#242](https://github.com/eclipse-tractusx/industry-core-hub/pull/242))
- Add register button for catalog parts with response snackbar and tooltip enhancements ([#244](https://github.com/eclipse-tractusx/industry-core-hub/pull/244))
- Added new EDC 0.10.0 compatibility and DTR 0.8.0 ([#218](https://github.com/eclipse-tractusx/industry-core-hub/pull/218))

### Fixed

- Enable local Kubernetes deployment by setting `storageClass` to "standard" ([#215](https://github.com/eclipse-tractusx/industry-core-hub/pull/215))
- Sync Python models with SQL schema and add missing constraints/indexes ([#223](https://github.com/eclipse-tractusx/industry-core-hub/pull/223))
- Fix metadata DB bugs, and improve Submodel Service Manager ([#228](https://github.com/eclipse-tractusx/industry-core-hub/pull/228))
- Add delete method and fix upload logic for submodels; update Helm charts ([#229](https://github.com/eclipse-tractusx/industry-core-hub/pull/229))
- Fixed Dockerfile image generation ([#230](https://github.com/eclipse-tractusx/industry-core-hub/pull/230))
- Correct volume name resolution issues for consistency in deployment ([#232](https://github.com/eclipse-tractusx/industry-core-hub/pull/232))
- Fix config map and improve configuration injection mechanism for backend charts ([#233](https://github.com/eclipse-tractusx/industry-core-hub/pull/233))
- Update database schemas and stabilize database secret resolution ([#234](https://github.com/eclipse-tractusx/industry-core-hub/pull/234))
- Fix `libxml2` vulnerabilities ([#236](https://github.com/eclipse-tractusx/industry-core-hub/pull/236))
- Fix catalog part relationships, add description field, and update APIs for filtering ([#237](https://github.com/eclipse-tractusx/industry-core-hub/pull/237))
- Add loading spinner in catalog parts to prevent premature error message display ([#243](https://github.com/eclipse-tractusx/industry-core-hub/pull/243))
- Improve catalog pagination, disable partner edit/delete buttons, add success messages, and enhance share dropdown and table ([#245](https://github.com/eclipse-tractusx/industry-core-hub/pull/245))
- Fixed bug regarding registration and then sharing ([#251](https://github.com/eclipse-tractusx/industry-core-hub/pull/251)


### Changed

- Set CORS headers in INT values.yaml to enable frontend requests and local testing ([#240](https://github.com/eclipse-tractusx/industry-core-hub/pull/240))
- Add `*` in CORS origin for testing in `values-int.yaml` ([#241](https://github.com/eclipse-tractusx/industry-core-hub/pull/241))

### Documentation

- Add installation guide for Industry Core Hub (TRG 1.02) ([#220](https://github.com/eclipse-tractusx/industry-core-hub/pull/220))
- Complete initial architecture documentation with images and explanations ([#222](https://github.com/eclipse-tractusx/industry-core-hub/pull/222))

## [0.0.2] - 2025-05-14

### Added

- Added int environment helm chart configuration ([#209](https://github.com/eclipse-tractusx/industry-core-hub/pull/209))
- Added services for APIs ([#158](https://github.com/eclipse-tractusx/industry-core-hub/pull/158))
- Added Twin Management services: create twins, aspects, and enable sharing ([#175](https://github.com/eclipse-tractusx/industry-core-hub/pull/175))
- Introduced Submodel Dispatcher Service ([#183](https://github.com/eclipse-tractusx/industry-core-hub/pull/183))
- Added shortcut API for sharing parts with business partners ([#185](https://github.com/eclipse-tractusx/industry-core-hub/pull/185))
- First version of sharing functionality ([#178](https://github.com/eclipse-tractusx/industry-core-hub/pull/178))
- Moved start method to `runtimes` module ([#180](https://github.com/eclipse-tractusx/industry-core-hub/pull/180))

### Fixed

- Updated UI skeleton in frontend ([#168](https://github.com/eclipse-tractusx/industry-core-hub/pull/168))
- Set DockerHub as Helm chart repository ([#173](https://github.com/eclipse-tractusx/industry-core-hub/pull/173))
- Added database connection config and refactored logging/config management ([#154](https://github.com/eclipse-tractusx/industry-core-hub/pull/154))
- Improved controller security and readability ([#176](https://github.com/eclipse-tractusx/industry-core-hub/pull/176))
- Refactored Submodel Dispatcher APIs ([#202](https://github.com/eclipse-tractusx/industry-core-hub/pull/202))
- Bumped dependency versions for security/compatibility ([#198](https://github.com/eclipse-tractusx/industry-core-hub/pull/198))

### Changed

- Fixed inability to deploy frontend Helm chart with ingress enabled ([#190](https://github.com/eclipse-tractusx/industry-core-hub/pull/190))
- Excluded `.github` folder from MD license checks ([#177](https://github.com/eclipse-tractusx/industry-core-hub/pull/177))
- Fixed indentation and import errors ([#199](https://github.com/eclipse-tractusx/industry-core-hub/pull/199))
- Resolved structure merge issues ([#182](https://github.com/eclipse-tractusx/industry-core-hub/pull/182))

### Documentation

- Added IC HUB documentation ([#192](https://github.com/eclipse-tractusx/industry-core-hub/pull/192))
- Updated `models.py` and `authors.md` ([#191](https://github.com/eclipse-tractusx/industry-core-hub/pull/191))

## [0.0.1] - 2025-05-02

### Added

- Initial commit with architecture documentation.
- Added templates for Industry Core SDK and Dataspace SDK.
- Added new Catena-X Speedway diagrams.
- Added unified SDK and abstracted the manager folder.
- Added industry core backend component and template.
- Added dependency scans and Tractus-X SDK.
- Added roadmap and objectives for the project.
- Added meeting minutes and detailed descriptions for the project.
- Added JSON viewer dialog and share UUID functionality.
- Added pgAdmin4 configuration and PostgreSQL as chart dependency.
- Added Helm chart for Industry Core Hub.
- Added workflows for dependency checks, Trivy, KICS, and CodeQL.
- Added boilerplate for React frontend with SCSS structure.

### Fixed

- Fixed backend port and folder structure.
- Fixed navigation issues and responsive design problems.
- Fixed license headers and ensured consistency in variable naming.

### Changed

- Refactored code to modularize add-ons/features on the frontend.
- Updated README with installation instructions and architecture diagrams.
- Updated Helm chart templates and workflows for better CI/CD integration.

### Removed

- Removed unused dependencies and cleaned up files.

