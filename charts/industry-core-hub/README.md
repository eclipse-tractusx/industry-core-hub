# A Helm chart for Eclipse Tractus-X - Industry Core Hub

![Version: 0.1.0](https://img.shields.io/badge/Version-0.1.0-informational?style=flat-square) ![AppVersion: 0.0.1](https://img.shields.io/badge/AppVersion-0.0.1-informational?style=flat-square) ![Type: application](https://img.shields.io/badge/Type-application-informational?style=flat-square)

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

## Values

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| affinity | object | `{}` |  |
| backend | object | `{"additionalVolumeMounts":[],"additionalVolumes":[],"healthChecks":{"liveness":{"enabled":false,"path":"/"},"readiness":{"enabled":false,"path":"/"},"startup":{"enabled":false,"path":"/"}},"image":{"pullPolicy":"IfNotPresent","pullSecrets":[],"repository":"industry-core-hub","tag":""},"ingress":{"className":"nginx","enabled":false,"hosts":[{"host":"","paths":[{"backend":{"port":8000,"service":"backend"},"path":"/","pathType":"ImplementationSpecific"}]}],"tls":[]},"name":"industry-core-hub-backend","persistence":{"data":{"accessMode":"ReadWriteOnce","enabled":true,"size":"1Gi","storageClass":"standard"},"enabled":true,"logs":{"accessMode":"ReadWriteOnce","enabled":true,"size":"1Gi","storageClass":"standard"}},"podAnnotations":{},"podLabels":{},"podSecurityContext":{"fsGroup":3000,"runAsGroup":3000,"runAsUser":1000,"seccompProfile":{"type":"RuntimeDefault"}},"resources":{},"securityContext":{"allowPrivilegeEscalation":false,"capabilities":{"add":[],"drop":["ALL"]},"readOnlyRootFilesystem":true,"runAsGroup":10001,"runAsNonRoot":true,"runAsUser":10000},"service":{"port":80,"targetPort":8000,"type":"ClusterIP"}}` | Backend configuration |
| backend.additionalVolumeMounts | list | `[]` | specifies additional volume mounts for the backend deployment |
| backend.additionalVolumes | list | `[]` | additional volume claims for the containers |
| backend.image.pullSecrets | list | `[]` | Existing image pull secret to use to [obtain the container image from private registries](https://kubernetes.io/docs/concepts/containers/images/#using-a-private-registry) |
| backend.image.tag | string | `""` | Overrides the image tag whose default is the chart appVersion |
| backend.ingress | object | `{"className":"nginx","enabled":false,"hosts":[{"host":"","paths":[{"backend":{"port":8000,"service":"backend"},"path":"/","pathType":"ImplementationSpecific"}]}],"tls":[]}` | ingress declaration to expose the industry-core-hub-backend service |
| backend.ingress.tls | list | `[]` | Ingress TLS configuration |
| backend.persistence | object | `{"data":{"accessMode":"ReadWriteOnce","enabled":true,"size":"1Gi","storageClass":"standard"},"enabled":true,"logs":{"accessMode":"ReadWriteOnce","enabled":true,"size":"1Gi","storageClass":"standard"}}` | Persistance configuration for the backend |
| backend.persistence.data.accessMode | string | `"ReadWriteOnce"` | Access mode for data volume |
| backend.persistence.data.enabled | bool | `true` | Enable data persistence |
| backend.persistence.data.size | string | `"1Gi"` | Storage size for data |
| backend.persistence.data.storageClass | string | `"standard"` | Storage class for data volume |
| backend.persistence.enabled | bool | `true` | Create a PVC to persist storage (if disabled, data and logs will not be persisted) |
| backend.persistence.logs.accessMode | string | `"ReadWriteOnce"` | Access mode for logs volume   |
| backend.persistence.logs.enabled | bool | `true` | Enable logs persistence |
| backend.persistence.logs.size | string | `"1Gi"` | Storage size for logs |
| backend.persistence.logs.storageClass | string | `"standard"` | Storage class for logs volume |
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
| fullnameOverride | string | `""` |  |
| livenessProbe.failureThreshold | int | `3` |  |
| livenessProbe.initialDelaySeconds | int | `10` |  |
| livenessProbe.periodSeconds | int | `10` |  |
| livenessProbe.successThreshold | int | `1` |  |
| livenessProbe.timeoutSeconds | int | `10` |  |
| nameOverride | string | `""` |  |
| nodeSelector | object | `{}` |  |
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
