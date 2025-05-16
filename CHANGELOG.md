# Changelog

All notable changes to this repository will be documented in this file.
Further information can be found on the [README.md](README.md) file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

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