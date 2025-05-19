# A Helm chart for Eclipse Tractus-X - Industry Core Hub

![Version: 0.1.5](https://img.shields.io/badge/Version-0.1.5-informational?style=flat-square) ![AppVersion: 0.0.2](https://img.shields.io/badge/AppVersion-0.0.2-informational?style=flat-square) ![Type: application](https://img.shields.io/badge/Type-application-informational?style=flat-square)

A Helm chart for Eclipse Tractus-X - Industry Core Hub

**Homepage:** <https://github.com/eclipse-tractusx/industry-core-hub>

## Prerequisites

- Kubernetes 1.19+
- Helm 3.2.0+
- PV provisioner support in the underlying infrastructure

## TL;DR

```bash
helm repo add tractusx https://eclipse-tractusx.github.io/charts/dev
helm install industry-core-hub tractusx/industry-core-hub
```

## Source Code

* <https://github.com/eclipse-tractusx/industry-core-hub>

## Requirements

| Repository | Name | Version |
|------------|------|---------|
| https://charts.bitnami.com/bitnami | postgresql | 12.x.x |
| https://helm.runix.net | pgadmin4 | 1.25.x |

## Values

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| affinity | object | `{}` |  |
| backend | object | `{"additionalVolumes":[],"configuration":{"authorization":{"apiKey":{"key":"X-Api-Key","value":"<<example>>"},"enabled":true},"database":{"echo":true},"digitalTwinRegistry":{"apiPath":"/api/v3","hostname":"https://dataprovider-dtr.tx.test","lookup":{"uri":"/semantics/registry"},"uri":"/semantics/registry"},"edc":{"controlplane":{"apikey":"<<example>>","apikeyheader":"X-Api-Key","catalogPath":"/catalog","hostname":"https://connector.control.plane","managementpath":"/management","protocolPath":"/api/v1/dsp"},"dataplane":{"hostname":"https://connector.data.plane","publicPath":"/api/public"}}},"enabled":true,"healthChecks":{"liveness":{"enabled":false,"path":"/"},"readiness":{"enabled":false,"path":"/"},"startup":{"enabled":false,"path":"/"}},"image":{"pullPolicy":"IfNotPresent","pullSecrets":[],"repository":"tractusx/industry-core-hub-backend","tag":""},"ingress":{"className":"nginx","enabled":false,"hosts":[{"host":"","paths":[{"backend":{"port":8000,"service":"backend"},"path":"/","pathType":"ImplementationSpecific"}]}],"tls":[]},"name":"industry-core-hub-backend","persistence":{"data":{"accessMode":"ReadWriteOnce","enabled":true,"size":"1Gi","storageClass":"default"},"enabled":true,"logs":{"accessMode":"ReadWriteOnce","enabled":true,"size":"1Gi","storageClass":"default"}},"podAnnotations":{},"podLabels":{},"podSecurityContext":{"fsGroup":3000,"runAsGroup":3000,"runAsUser":1000,"seccompProfile":{"type":"RuntimeDefault"}},"resources":{"limits":{"cpu":"500m","ephemeral-storage":"2Gi","memory":"512Mi"},"requests":{"cpu":"250m","ephemeral-storage":"2Gi","memory":"512Mi"}},"securityContext":{"allowPrivilegeEscalation":false,"capabilities":{"add":[],"drop":["ALL"]},"readOnlyRootFilesystem":true,"runAsGroup":10001,"runAsNonRoot":true,"runAsUser":10000},"service":{"portContainer":8000,"portService":8000,"type":"ClusterIP"},"volumeMounts":[{"mountPath":"/dataspace-sdk/data","name":"data-volume"},{"mountPath":"/dataspace-sdk/logs","name":"logs-volume"},{"mountPath":"/tmp/config/","name":"backend-config-configmap"},{"mountPath":"/tmp","name":"tmp"}]}` | Backend configuration |
| backend.additionalVolumes | list | `[]` | additional volume claims for the containers |
| backend.configuration | object | `{"authorization":{"apiKey":{"key":"X-Api-Key","value":"<<example>>"},"enabled":true},"database":{"echo":true},"digitalTwinRegistry":{"apiPath":"/api/v3","hostname":"https://dataprovider-dtr.tx.test","lookup":{"uri":"/semantics/registry"},"uri":"/semantics/registry"},"edc":{"controlplane":{"apikey":"<<example>>","apikeyheader":"X-Api-Key","catalogPath":"/catalog","hostname":"https://connector.control.plane","managementpath":"/management","protocolPath":"/api/v1/dsp"},"dataplane":{"hostname":"https://connector.data.plane","publicPath":"/api/public"}}}` | Backend configuration, changes to these values will be reflected in the configuration.yml file. |
| backend.configuration.database | object | `{"echo":true}` | Database connection config; database connection settings are inferred from postgresql or externalDatabase sections. |
| backend.configuration.digitalTwinRegistry | object | `{"apiPath":"/api/v3","hostname":"https://dataprovider-dtr.tx.test","lookup":{"uri":"/semantics/registry"},"uri":"/semantics/registry"}` | Digital Twin Registry configuration |
| backend.configuration.digitalTwinRegistry.lookup.uri | string | `"/semantics/registry"` | Same as the uri above |
| backend.configuration.digitalTwinRegistry.uri | string | `"/semantics/registry"` | Set this to the urlPrefix defined in your DTR values. [Default value](https://github.com/eclipse-tractusx/sldt-digital-twin-registry/blob/cc9c63c12d96e48050a1b24eca022277075cf6c7/charts/registry/values.yaml#L86) |
| backend.configuration.edc | object | `{"controlplane":{"apikey":"<<example>>","apikeyheader":"X-Api-Key","catalogPath":"/catalog","hostname":"https://connector.control.plane","managementpath":"/management","protocolPath":"/api/v1/dsp"},"dataplane":{"hostname":"https://connector.data.plane","publicPath":"/api/public"}}` | EDC (Eclipse Dataspace Connector) configuration |
| backend.image.pullSecrets | list | `[]` | Existing image pull secret to use to [obtain the container image from private registries](https://kubernetes.io/docs/concepts/containers/images/#using-a-private-registry) |
| backend.image.tag | string | `""` | Overrides the image tag whose default is the chart appVersion |
| backend.ingress | object | `{"className":"nginx","enabled":false,"hosts":[{"host":"","paths":[{"backend":{"port":8000,"service":"backend"},"path":"/","pathType":"ImplementationSpecific"}]}],"tls":[]}` | ingress declaration to expose the industry-core-hub-backend service |
| backend.ingress.tls | list | `[]` | Ingress TLS configuration |
| backend.persistence | object | `{"data":{"accessMode":"ReadWriteOnce","enabled":true,"size":"1Gi","storageClass":"default"},"enabled":true,"logs":{"accessMode":"ReadWriteOnce","enabled":true,"size":"1Gi","storageClass":"default"}}` | Persistance configuration for the backend |
| backend.persistence.data.accessMode | string | `"ReadWriteOnce"` | Access mode for data volume |
| backend.persistence.data.enabled | bool | `true` | Enable data persistence |
| backend.persistence.data.size | string | `"1Gi"` | Storage size for data |
| backend.persistence.data.storageClass | string | `"default"` | Storage class for data volume |
| backend.persistence.enabled | bool | `true` | Create a PVC to persist storage (if disabled, data and logs will not be persisted) |
| backend.persistence.logs.accessMode | string | `"ReadWriteOnce"` | Access mode for logs volume |
| backend.persistence.logs.enabled | bool | `true` | Enable logs persistence |
| backend.persistence.logs.size | string | `"1Gi"` | Storage size for logs |
| backend.persistence.logs.storageClass | string | `"default"` | Storage class for logs volume |
| backend.podSecurityContext | object | `{"fsGroup":3000,"runAsGroup":3000,"runAsUser":1000,"seccompProfile":{"type":"RuntimeDefault"}}` | The [pod security context](https://kubernetes.io/docs/tasks/configure-pod-container/security-context/#set-the-security-context-for-a-pod) defines privilege and access control settings for a Pod within the deployment |
| backend.podSecurityContext.fsGroup | int | `3000` | The owner for volumes and any files created within volumes will belong to this guid |
| backend.podSecurityContext.runAsGroup | int | `3000` | Processes within a pod will belong to this guid |
| backend.podSecurityContext.runAsUser | int | `1000` | Runs all processes within a pod with a special uid |
| backend.podSecurityContext.seccompProfile.type | string | `"RuntimeDefault"` | Restrict a Container's Syscalls with seccomp |
| backend.securityContext.allowPrivilegeEscalation | bool | `false` | Controls [Privilege Escalation](https://kubernetes.io/docs/concepts/security/pod-security-policy/#privilege-escalation) enabling setuid binaries changing the effective user ID |
| backend.securityContext.capabilities.add | list | `[]` | Specifies which capabilities to add to issue specialized syscalls |
| backend.securityContext.capabilities.drop | list | `["ALL"]` | Specifies which capabilities to drop to reduce syscall attack surface |
| backend.securityContext.readOnlyRootFilesystem | bool | `true` | Whether the root filesystem is mounted in read-only mode |
| backend.securityContext.runAsGroup | int | `10001` | The owner for volumes and any files created within volumes will belong to this guid |
| backend.securityContext.runAsNonRoot | bool | `true` | Requires the container to run without root privileges |
| backend.securityContext.runAsUser | int | `10000` | The container's process will run with the specified uid |
| backend.service.type | string | `"ClusterIP"` | [Service type](https://kubernetes.io/docs/concepts/services-networking/service/#publishing-services-service-types) to expose the running application on a set of Pods as a network service |
| backend.volumeMounts | list | `[{"mountPath":"/dataspace-sdk/data","name":"data-volume"},{"mountPath":"/dataspace-sdk/logs","name":"logs-volume"},{"mountPath":"/tmp/config/","name":"backend-config-configmap"},{"mountPath":"/tmp","name":"tmp"}]` | specifies volume mounts for the backend deployment |
| externalDatabase | object | `{"database":"postgres","existingIchubSecretKey":"ichub-password","existingSecret":"","host":"","ichubPassword":"","ichubUser":"ichub","port":5432,"sslMode":"prefer"}` | External database configuration (used when postgresql.enabled is false) |
| externalDatabase.database | string | `"postgres"` | External PostgreSQL database name |
| externalDatabase.existingIchubSecretKey | string | `"ichub-password"` | Key in the existing secret that contains database password for ichub user |
| externalDatabase.existingSecret | string | `""` | Existing secret containing database password |
| externalDatabase.host | string | `""` | External PostgreSQL host |
| externalDatabase.ichubPassword | string | `""` | External PostgreSQL password for ichub user |
| externalDatabase.ichubUser | string | `"ichub"` | External PostgreSQL username for ichub user |
| externalDatabase.port | int | `5432` | External PostgreSQL port |
| externalDatabase.sslMode | string | `"prefer"` | Determines whether or with what priority a secure SSL TCP/IP connection will be negotiated with the server. There are [six modes](https://www.postgresql.org/docs/current/libpq-connect.html#LIBPQ-CONNECT-SSLMODE) |
| frontend.additionalVolumes | list | `[]` | additional volume claims for the containers |
| frontend.enabled | bool | `true` |  |
| frontend.env.ichubBackendUrl | string | `""` | industry-core-hub backend base URL |
| frontend.healthChecks.liveness.enabled | bool | `true` |  |
| frontend.healthChecks.liveness.path | string | `"/"` |  |
| frontend.healthChecks.readiness.enabled | bool | `true` |  |
| frontend.healthChecks.readiness.path | string | `"/"` |  |
| frontend.healthChecks.startup.enabled | bool | `true` |  |
| frontend.healthChecks.startup.path | string | `"/"` |  |
| frontend.image.pullPolicy | string | `"IfNotPresent"` |  |
| frontend.image.pullSecrets | list | `[]` | Existing image pull secret to use to [obtain the container image from private registries](https://kubernetes.io/docs/concepts/containers/images/#using-a-private-registry) |
| frontend.image.repository | string | `"tractusx/industry-core-hub-frontend"` |  |
| frontend.image.tag | string | `""` | Overrides the image tag whose default is the chart appVersion |
| frontend.ingress | object | `{"className":"nginx","enabled":false,"hosts":[{"host":"","paths":[{"backend":{"port":8080,"service":"frontend"},"path":"/","pathType":"ImplementationSpecific"}]}],"tls":[]}` | ingress declaration to expose the industry-core-hub-backend service |
| frontend.ingress.tls | list | `[]` | Ingress TLS configuration |
| frontend.name | string | `"industry-core-hub-frontend"` |  |
| frontend.podAnnotations | object | `{}` |  |
| frontend.podLabels | object | `{}` |  |
| frontend.podSecurityContext | object | `{"fsGroup":3000,"runAsGroup":3000,"runAsUser":1000,"seccompProfile":{"type":"RuntimeDefault"}}` | The [pod security context](https://kubernetes.io/docs/tasks/configure-pod-container/security-context/#set-the-security-context-for-a-pod) defines privilege and access control settings for a Pod within the deployment |
| frontend.podSecurityContext.fsGroup | int | `3000` | The owner for volumes and any files created within volumes will belong to this guid |
| frontend.podSecurityContext.runAsGroup | int | `3000` | Processes within a pod will belong to this guid |
| frontend.podSecurityContext.runAsUser | int | `1000` | Runs all processes within a pod with a special uid |
| frontend.podSecurityContext.seccompProfile.type | string | `"RuntimeDefault"` | Restrict a Container's Syscalls with seccomp |
| frontend.resources | object | `{"limits":{"cpu":"500m","ephemeral-storage":"1Gi","memory":"256Mi"},"requests":{"cpu":"100m","ephemeral-storage":"128Mi","memory":"256Mi"}}` | Review the default resource limits as this should a conscious choice. |
| frontend.securityContext.allowPrivilegeEscalation | bool | `false` | Controls [Privilege Escalation](https://kubernetes.io/docs/concepts/security/pod-security-policy/#privilege-escalation) enabling setuid binaries changing the effective user ID |
| frontend.securityContext.capabilities.add | list | `[]` | Specifies which capabilities to add to issue specialized syscalls |
| frontend.securityContext.capabilities.drop | list | `["ALL"]` | Specifies which capabilities to drop to reduce syscall attack surface |
| frontend.securityContext.readOnlyRootFilesystem | bool | `true` | Whether the root filesystem is mounted in read-only mode |
| frontend.securityContext.runAsGroup | int | `10001` | The owner for volumes and any files created within volumes will belong to this guid |
| frontend.securityContext.runAsNonRoot | bool | `true` | Requires the container to run without root privileges |
| frontend.securityContext.runAsUser | int | `10000` | The container's process will run with the specified uid |
| frontend.service.portContainer | int | `8080` |  |
| frontend.service.portService | int | `8080` |  |
| frontend.service.type | string | `"ClusterIP"` | [Service type](https://kubernetes.io/docs/concepts/services-networking/service/#publishing-services-service-types) to expose the running application on a set of Pods as a network service |
| frontend.volumeMounts | list | `[{"mountPath":"/tmp","name":"tmp"}]` | specifies volume mounts for the frontend deployment |
| fullnameOverride | string | `""` |  |
| livenessProbe.failureThreshold | int | `3` |  |
| livenessProbe.initialDelaySeconds | int | `10` |  |
| livenessProbe.periodSeconds | int | `10` |  |
| livenessProbe.successThreshold | int | `1` |  |
| livenessProbe.timeoutSeconds | int | `10` |  |
| nameOverride | string | `""` |  |
| nodeSelector | object | `{}` |  |
| pgadmin4 | object | `{"enabled":false,"env":{"email":"pgadmin4@txtest.org","password":"tractusxpgadmin4"},"ingress":{"enabled":false},"persistentVolume":{"enabled":false}}` | pgAdmin4 configuration |
| postgresql | object | `{"audit":{"logLinePrefix":"%m %u %d ","pgAuditLog":"write, ddl"},"auth":{"database":"ichub-postgres","existingSecret":"ichub-postgres-secret","ichubPassword":"","ichubUser":"ichub","password":"","port":5432,"sslMode":"prefer"},"enabled":true,"fullnameOverride":"","nameOverride":"","primary":{"extendedConfiguration":"","extraEnvVars":[{"name":"ICHUB_PASSWORD","valueFrom":{"secretKeyRef":{"key":"ichub-password","name":"{{ .Values.auth.existingSecret }}"}}}],"initdb":{"scriptsConfigMap":"{{ .Release.Name }}-cm-postgres"},"persistence":{"enabled":true,"size":"10Gi","storageClass":""}}}` | PostgreSQL chart configuration |
| postgresql.auth.database | string | `"ichub-postgres"` | Database name |
| postgresql.auth.existingSecret | string | `"ichub-postgres-secret"` | Secret containing the passwords for root usernames postgres and non-root usernames repl_user and ichub. |
| postgresql.auth.ichubPassword | string | `""` | Password for the non-root username 'ichub'. Secret-key 'ichub-password'. |
| postgresql.auth.ichubUser | string | `"ichub"` | Non-root username for ichub. |
| postgresql.auth.password | string | `""` | Password for the root username 'postgres' (will be stored in a secret if existingSecret is not provided) |
| postgresql.auth.port | int | `5432` | Database port number |
| postgresql.auth.sslMode | string | `"prefer"` | Determines whether or with what priority a secure SSL TCP/IP connection will be negotiated with the server. There are [six modes](https://www.postgresql.org/docs/current/libpq-connect.html#LIBPQ-CONNECT-SSLMODE) |
| postgresql.enabled | bool | `true` | Switch to enable or disable the PostgreSQL helm chart |
| postgresql.primary.extendedConfiguration | string | `""` | Extended PostgreSQL Primary configuration (increase of max_connections recommended - default is 100) |
| postgresql.primary.persistence.enabled | bool | `true` | Enable persistent storage |
| postgresql.primary.persistence.size | string | `"10Gi"` | Size of persistent volume |
| postgresql.primary.persistence.storageClass | string | `""` | StorageClass name (use default if not specified) |
| readinessProbe.failureThreshold | int | `3` |  |
| readinessProbe.initialDelaySeconds | int | `10` |  |
| readinessProbe.periodSeconds | int | `10` |  |
| readinessProbe.successThreshold | int | `1` |  |
| readinessProbe.timeoutSeconds | int | `1` |  |
| replicaCount | int | `1` |  |
| startupProbe | object | `{"failureThreshold":30,"initialDelaySeconds":10,"periodSeconds":10,"successThreshold":1,"timeoutSeconds":1}` | Following Catena-X Helm Best Practices [reference](https://github.com/eclipse-tractusx/portal/blob/main/charts/portal/values.yaml#L1103). |
| tolerations | list | `[]` |  |
| updateStrategy.rollingUpdate.maxSurge | int | `1` |  |
| updateStrategy.rollingUpdate.maxUnavailable | int | `0` |  |
| updateStrategy.type | string | `"RollingUpdate"` | Update strategy type, rolling update configuration parameters, [reference](https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/#update-strategies). |

Autogenerated with [helm docs](https://github.com/norwoodj/helm-docs)

## NOTICE

This work is licensed under the [CC-BY-4.0](https://creativecommons.org/licenses/by/4.0/legalcode).

- SPDX-License-Identifier: CC-BY-4.0
- SPDX-FileCopyrightText: 2025 Contributors to the Eclipse Foundation
- Source URL: https://github.com/eclipse-tractusx/industry-core-hub
