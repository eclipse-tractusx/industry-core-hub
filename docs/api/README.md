# Industry Core Hub Api Collection
Different API Collection for the Industry Core Hub Project.

All the API Collection have been develop with the [Bruno](https://www.usebruno.com/) open source tool.

## Backend API
The Backend API is divided in seven different folders.
* **Part Management**: Management of part metadata - including catalog parts, serialized parts, JIS parts and batches.
* **Partner Management**: Management of master data around business partners - including business partners, data exchange agreements and contracts.
* **Twin Management**: Management of how product information can be managed and shared.
* **Submodel Dispatcher**: Internal API called by EDC Data Planes or Admins in order the deliver data of of the internal used Submodel Service.
* **Sharing Functionality**: Sharing functionality for catalog part twins - including sharing of parts with business partners and automatic generation of digital twins and submodels.
* **Open Connection Management**: Handles the connections from the consumer modules, for specific services like digital twin registry and data endpoints.
* **Part Discovery Management**: Management of the discovery of parts, searching for digital twins and digital twins registries.

> **Note**
>
> The baseUrl is set to "_http://localhost:8000/_", you can change it if you have a different one in the variable on the root folder.

## Licenses

- [Apache-2.0](https://raw.githubusercontent.com/eclipse-tractusx/industry-core-hub/main/LICENSE) for code
- [CC-BY-4.0](https://spdx.org/licenses/CC-BY-4.0.html) for non-code

## NOTICE

This work is licensed under the [CC-BY-4.0](https://creativecommons.org/licenses/by/4.0/legalcode).

- SPDX-License-Identifier: CC-BY-4.0
- SPDX-FileCopyrightText: 2025 Contributors to the Eclipse Foundation
- Source URL: https://github.com/eclipse-tractusx/industry-core-hub
