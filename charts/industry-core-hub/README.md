# A Helm chart for Eclipse Tractus-X - Industry Core Hub

![Version: 0.4.1](https://img.shields.io/badge/Version-0.4.1-informational?style=flat-square) ![AppVersion: v0.4.0](https://img.shields.io/badge/AppVersion-v0.4.0-informational?style=flat-square) ![Type: application](https://img.shields.io/badge/Type-application-informational?style=flat-square)

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
| https://helm.runix.net | pgadmin4 | 1.25.x |
| https://raw.githubusercontent.com/bitnami/charts/archive-full-index/bitnami | keycloak | 23.0.0 |
| oci://registry-1.docker.io/cloudpirates | postgresql(postgres) | 0.11.0 |

## Values

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| affinity | object | `{}` |  |
| backend | object | `{"apiVersion":"v1","configuration":{"agreements":[{"access":{"context":{"cx-policy":"https://w3id.org/catenax/policy/","odrl":"http://www.w3.org/ns/odrl/2/"},"obligation":[],"permission":[{"action":"odrl:use","constraints":[{"leftOperand":"cx-policy:Membership","operator":"odrl:eq","rightOperand":"active"}]}],"prohibition":[]},"semanticid":"urn:samm:io.catenax.generic.digital_product_passport:6.1.0#DigitalProductPassport","usage":{"context":{"cx-policy":"https://w3id.org/catenax/policy/","odrl":"http://www.w3.org/ns/odrl/2/"},"obligation":[],"permission":[{"action":"odrl:use","constraints":[{"leftOperand":"cx-policy:UsagePurpose","operator":"odrl:eq","rightOperand":"cx.circular.dpp:1"}]}],"prohibition":[]}},{"access":{"context":{"cx-policy":"https://w3id.org/catenax/policy/","odrl":"http://www.w3.org/ns/odrl/2/"},"obligation":[],"permission":[{"action":"odrl:use","constraints":[{"leftOperand":"cx-policy:Membership","operator":"odrl:eq","rightOperand":"active"}]}],"prohibition":[]},"semanticid":"urn:samm:io.catenax.serial_part:3.0.0#SerialPart","usage":{"context":{"cx-policy":"https://w3id.org/catenax/policy/","odrl":"http://www.w3.org/ns/odrl/2/"},"obligation":[],"permission":[{"LogicalConstraint":"odrl:and","action":"odrl:use","constraints":[{"leftOperand":"cx-policy:FrameworkAgreement","operator":"odrl:eq","rightOperand":"DataExchangeGovernance:1.0"},{"leftOperand":"cx-policy:Membership","operator":"odrl:eq","rightOperand":"active"},{"leftOperand":"cx-policy:UsagePurpose","operator":"odrl:eq","rightOperand":"cx.core.industrycore:1"}]}],"prohibition":[]}},{"access":{"context":{"cx-policy":"https://w3id.org/catenax/policy/","odrl":"http://www.w3.org/ns/odrl/2/"},"obligation":[],"permission":[{"action":"odrl:use","constraints":[{"leftOperand":"cx-policy:Membership","operator":"odrl:eq","rightOperand":"active"}]}],"prohibition":[]},"semanticid":"urn:samm:io.catenax.part_type_information:1.0.0#PartTypeInformation","usage":{"context":{"cx-policy":"https://w3id.org/catenax/policy/","odrl":"http://www.w3.org/ns/odrl/2/"},"obligation":[],"permission":[{"LogicalConstraint":"odrl:and","action":"odrl:use","constraints":[{"leftOperand":"cx-policy:FrameworkAgreement","operator":"odrl:eq","rightOperand":"DataExchangeGovernance:1.0"},{"leftOperand":"cx-policy:Membership","operator":"odrl:eq","rightOperand":"active"},{"leftOperand":"cx-policy:UsagePurpose","operator":"odrl:eq","rightOperand":"cx.core.industrycore:1"}]}],"prohibition":[]}},{"access":{"context":{"cx-policy":"https://w3id.org/catenax/policy/","odrl":"http://www.w3.org/ns/odrl/2/"},"obligation":[],"permission":[{"action":"odrl:use","constraints":[{"leftOperand":"cx-policy:Membership","operator":"odrl:eq","rightOperand":"active"}]}],"prohibition":[]},"semanticid":"urn:samm:io.catenax.us_tariff_information:1.0.0#UsTariffInformation","usage":{"context":{"cx-policy":"https://w3id.org/catenax/policy/","odrl":"http://www.w3.org/ns/odrl/2/"},"obligation":[],"permission":[{"action":"odrl:use","constraints":[{"leftOperand":"cx-policy:UsagePurpose","operator":"odrl:eq","rightOperand":"cx.core.industrycore:1"}]}],"prohibition":[]}}],"authorization":{"apiKey":{"key":"X-Api-Key","value":["<example>"]},"enabled":true,"keycloak":{"authUrl":"https://<ichub-idp-url>/auth/","clientId":"<client-id>","clientSecret":"<client-secret>","enabled":false,"realm":"<realm>","retry":{"backgroundRetryInterval":60,"maxRetries":5,"retryDelay":10}}},"consumer":{"connector":{"controlplane":{"apiKey":"<consumer-edc-api-key>","apiKeyHeader":"X-Api-Key","catalogPath":"/catalog","hostname":"https://<edc-consumer-control-hostname>","managementPath":"/management","protocolPath":"/api/v1/dsp"},"dataspace":{"version":"jupiter"}},"discovery":{"connector_discovery":{"key":"bpn"},"digitalTwinRegistry":{"dct_type_filter":{"operandLeft":"'http://purl.org/dc/terms/type'.'@id'","operandRight":"https://w3id.org/catenax/taxonomy#DigitalTwinRegistry","operator":"="},"dct_type_key":"dct:type"},"discovery_finder":{"url":"https://<discovery-finder-url>/api/v1.0/administration/connectors/discovery/search"},"oauth":{"client_id":"<client-id>","client_secret":"<client-secret>","realm":"<realm>","url":"https://<central-idp-url>/auth/"}}},"database":{"echo":false,"retry_interval":5,"timeout":8},"logger":{"level":"INFO"},"provider":{"connector":{"controlplane":{"apiKey":"<provider-edc-api-key>","apiKeyHeader":"X-Api-Key","hostname":"https://<edc-provider-control-hostname>","managementPath":"/management","protocolPath":"/api/v1/dsp"},"dataplane":{"hostname":"https://<edc-provider-dataplane-hostname>","publicPath":"/api/public"},"dataspace":{"version":"jupiter"}},"digitalTwinRegistry":{"apiPath":"/api/v3","asset_config":{"dct_type":"https://w3id.org/catenax/taxonomy#DigitalTwinRegistry"},"hostname":"https://<dtr-hostname>","lookup":{"uri":""},"policy":{"access":{"context":{"cx-policy":"https://w3id.org/catenax/policy/","odrl":"http://www.w3.org/ns/odrl/2/"},"obligation":[],"permission":[{"action":"odrl:use","constraints":[{"leftOperand":"cx-policy:Membership","operator":"odrl:eq","rightOperand":"active"}]}],"prohibition":[]},"usage":{"context":{"cx-policy":"https://w3id.org/catenax/policy/","odrl":"http://www.w3.org/ns/odrl/2/"},"obligation":[],"permission":[{"LogicalConstraint":"odrl:and","action":"odrl:use","constraints":[{"leftOperand":"cx-policy:FrameworkAgreement","operator":"odrl:eq","rightOperand":"DataExchangeGovernance:1.0"},{"leftOperand":"cx-policy:Membership","operator":"odrl:eq","rightOperand":"active"},{"leftOperand":"cx-policy:UsagePurpose","operator":"odrl:eq","rightOperand":"cx.core.digitalTwinRegistry:1"}]}],"prohibition":[]}},"uri":""}},"submodel_dispatcher":{"apiPath":"/submodel-dispatcher","path":"/industry-core-hub/data/submodels"}},"cors":{"allow_credentials":true,"allow_headers":["*"],"allow_methods":["GET","POST","PUT","DELETE","OPTIONS","PATCH"],"allow_origins":["https://<frontend-hostname>"],"enabled":true},"enabled":true,"healthChecks":{"liveness":{"enabled":false,"path":"/"},"readiness":{"enabled":false,"path":"/"},"startup":{"enabled":false,"path":"/"}},"image":{"pullPolicy":"IfNotPresent","pullSecrets":[],"repository":"tractusx/industry-core-hub-backend","tag":""},"ingress":{"className":"nginx","enabled":false,"hosts":[{"host":"","paths":[{"backend":{"port":8000,"service":"backend"},"path":"/","pathType":"ImplementationSpecific"}]}],"tls":[]},"jobs":{"assetSync":{"backoffLimit":3,"concurrencyPolicy":"Forbid","enabled":true,"failedJobsHistoryLimit":3,"resources":{"limits":{"cpu":"500m","ephemeral-storage":"1Gi","memory":"512Mi"},"requests":{"cpu":"100m","ephemeral-storage":"128Mi","memory":"256Mi"}},"restartPolicy":"OnFailure","schedule":"0 2 * * *","startingDeadlineSeconds":200,"successfulJobsHistoryLimit":3,"type":"cronjob"}},"name":"industry-core-hub-backend","persistence":{"data":{"accessMode":"ReadWriteOnce","enabled":true,"size":"1Gi","storageClass":"standard"},"enabled":true,"logs":{"accessMode":"ReadWriteOnce","enabled":true,"size":"1Gi","storageClass":"standard"}},"podAnnotations":{},"podLabels":{},"podSecurityContext":{"fsGroup":10001,"runAsGroup":10001,"runAsUser":10000,"seccompProfile":{"type":"RuntimeDefault"}},"resources":{"limits":{"cpu":"500m","ephemeral-storage":"2Gi","memory":"512Mi"},"requests":{"cpu":"250m","ephemeral-storage":"2Gi","memory":"512Mi"}},"securityContext":{"allowPrivilegeEscalation":false,"capabilities":{"add":[],"drop":["ALL"]},"readOnlyRootFilesystem":true,"runAsGroup":10001,"runAsNonRoot":true,"runAsUser":10000},"server":{"timeouts":{"graceful_shutdown":30,"keep_alive":300},"workers":{"max_workers":1,"worker_threads":200}},"service":{"portContainer":8000,"portService":8000,"type":"ClusterIP"},"volumeMounts":[{"mountPath":"/industry-core-hub/data","name":"data-volume","subPath":"data"},{"mountPath":"/industry-core-hub/logs","name":"logs-volume","subPath":"logs"},{"mountPath":"/industry-core-hub/config","name":"backend-config-configmap"},{"mountPath":"/industry-core-hub/tmp","name":"tmpfs"}],"volumes":[{"configMap":{"name":"{{ .Release.Name }}-config"},"name":"backend-config-configmap"},{"name":"logs-volume","persistentVolumeClaim":{"claimName":"{{ .Release.Name }}-pvc-logs-backend"}},{"name":"data-volume","persistentVolumeClaim":{"claimName":"{{ .Release.Name }}-pvc-data-backend"}},{"emptyDir":{},"name":"tmpfs"}]}` | Backend configuration |
| backend.configuration | object | `{"agreements":[{"access":{"context":{"cx-policy":"https://w3id.org/catenax/policy/","odrl":"http://www.w3.org/ns/odrl/2/"},"obligation":[],"permission":[{"action":"odrl:use","constraints":[{"leftOperand":"cx-policy:Membership","operator":"odrl:eq","rightOperand":"active"}]}],"prohibition":[]},"semanticid":"urn:samm:io.catenax.generic.digital_product_passport:6.1.0#DigitalProductPassport","usage":{"context":{"cx-policy":"https://w3id.org/catenax/policy/","odrl":"http://www.w3.org/ns/odrl/2/"},"obligation":[],"permission":[{"action":"odrl:use","constraints":[{"leftOperand":"cx-policy:UsagePurpose","operator":"odrl:eq","rightOperand":"cx.circular.dpp:1"}]}],"prohibition":[]}},{"access":{"context":{"cx-policy":"https://w3id.org/catenax/policy/","odrl":"http://www.w3.org/ns/odrl/2/"},"obligation":[],"permission":[{"action":"odrl:use","constraints":[{"leftOperand":"cx-policy:Membership","operator":"odrl:eq","rightOperand":"active"}]}],"prohibition":[]},"semanticid":"urn:samm:io.catenax.serial_part:3.0.0#SerialPart","usage":{"context":{"cx-policy":"https://w3id.org/catenax/policy/","odrl":"http://www.w3.org/ns/odrl/2/"},"obligation":[],"permission":[{"LogicalConstraint":"odrl:and","action":"odrl:use","constraints":[{"leftOperand":"cx-policy:FrameworkAgreement","operator":"odrl:eq","rightOperand":"DataExchangeGovernance:1.0"},{"leftOperand":"cx-policy:Membership","operator":"odrl:eq","rightOperand":"active"},{"leftOperand":"cx-policy:UsagePurpose","operator":"odrl:eq","rightOperand":"cx.core.industrycore:1"}]}],"prohibition":[]}},{"access":{"context":{"cx-policy":"https://w3id.org/catenax/policy/","odrl":"http://www.w3.org/ns/odrl/2/"},"obligation":[],"permission":[{"action":"odrl:use","constraints":[{"leftOperand":"cx-policy:Membership","operator":"odrl:eq","rightOperand":"active"}]}],"prohibition":[]},"semanticid":"urn:samm:io.catenax.part_type_information:1.0.0#PartTypeInformation","usage":{"context":{"cx-policy":"https://w3id.org/catenax/policy/","odrl":"http://www.w3.org/ns/odrl/2/"},"obligation":[],"permission":[{"LogicalConstraint":"odrl:and","action":"odrl:use","constraints":[{"leftOperand":"cx-policy:FrameworkAgreement","operator":"odrl:eq","rightOperand":"DataExchangeGovernance:1.0"},{"leftOperand":"cx-policy:Membership","operator":"odrl:eq","rightOperand":"active"},{"leftOperand":"cx-policy:UsagePurpose","operator":"odrl:eq","rightOperand":"cx.core.industrycore:1"}]}],"prohibition":[]}},{"access":{"context":{"cx-policy":"https://w3id.org/catenax/policy/","odrl":"http://www.w3.org/ns/odrl/2/"},"obligation":[],"permission":[{"action":"odrl:use","constraints":[{"leftOperand":"cx-policy:Membership","operator":"odrl:eq","rightOperand":"active"}]}],"prohibition":[]},"semanticid":"urn:samm:io.catenax.us_tariff_information:1.0.0#UsTariffInformation","usage":{"context":{"cx-policy":"https://w3id.org/catenax/policy/","odrl":"http://www.w3.org/ns/odrl/2/"},"obligation":[],"permission":[{"action":"odrl:use","constraints":[{"leftOperand":"cx-policy:UsagePurpose","operator":"odrl:eq","rightOperand":"cx.core.industrycore:1"}]}],"prohibition":[]}}],"authorization":{"apiKey":{"key":"X-Api-Key","value":["<example>"]},"enabled":true,"keycloak":{"authUrl":"https://<ichub-idp-url>/auth/","clientId":"<client-id>","clientSecret":"<client-secret>","enabled":false,"realm":"<realm>","retry":{"backgroundRetryInterval":60,"maxRetries":5,"retryDelay":10}}},"consumer":{"connector":{"controlplane":{"apiKey":"<consumer-edc-api-key>","apiKeyHeader":"X-Api-Key","catalogPath":"/catalog","hostname":"https://<edc-consumer-control-hostname>","managementPath":"/management","protocolPath":"/api/v1/dsp"},"dataspace":{"version":"jupiter"}},"discovery":{"connector_discovery":{"key":"bpn"},"digitalTwinRegistry":{"dct_type_filter":{"operandLeft":"'http://purl.org/dc/terms/type'.'@id'","operandRight":"https://w3id.org/catenax/taxonomy#DigitalTwinRegistry","operator":"="},"dct_type_key":"dct:type"},"discovery_finder":{"url":"https://<discovery-finder-url>/api/v1.0/administration/connectors/discovery/search"},"oauth":{"client_id":"<client-id>","client_secret":"<client-secret>","realm":"<realm>","url":"https://<central-idp-url>/auth/"}}},"database":{"echo":false,"retry_interval":5,"timeout":8},"logger":{"level":"INFO"},"provider":{"connector":{"controlplane":{"apiKey":"<provider-edc-api-key>","apiKeyHeader":"X-Api-Key","hostname":"https://<edc-provider-control-hostname>","managementPath":"/management","protocolPath":"/api/v1/dsp"},"dataplane":{"hostname":"https://<edc-provider-dataplane-hostname>","publicPath":"/api/public"},"dataspace":{"version":"jupiter"}},"digitalTwinRegistry":{"apiPath":"/api/v3","asset_config":{"dct_type":"https://w3id.org/catenax/taxonomy#DigitalTwinRegistry"},"hostname":"https://<dtr-hostname>","lookup":{"uri":""},"policy":{"access":{"context":{"cx-policy":"https://w3id.org/catenax/policy/","odrl":"http://www.w3.org/ns/odrl/2/"},"obligation":[],"permission":[{"action":"odrl:use","constraints":[{"leftOperand":"cx-policy:Membership","operator":"odrl:eq","rightOperand":"active"}]}],"prohibition":[]},"usage":{"context":{"cx-policy":"https://w3id.org/catenax/policy/","odrl":"http://www.w3.org/ns/odrl/2/"},"obligation":[],"permission":[{"LogicalConstraint":"odrl:and","action":"odrl:use","constraints":[{"leftOperand":"cx-policy:FrameworkAgreement","operator":"odrl:eq","rightOperand":"DataExchangeGovernance:1.0"},{"leftOperand":"cx-policy:Membership","operator":"odrl:eq","rightOperand":"active"},{"leftOperand":"cx-policy:UsagePurpose","operator":"odrl:eq","rightOperand":"cx.core.digitalTwinRegistry:1"}]}],"prohibition":[]}},"uri":""}},"submodel_dispatcher":{"apiPath":"/submodel-dispatcher","path":"/industry-core-hub/data/submodels"}}` | Backend configuration, changes to these values will be reflected in the configuration.yml file. |
| backend.configuration.authorization.keycloak.retry | object | `{"backgroundRetryInterval":60,"maxRetries":5,"retryDelay":10}` | Retry configuration for Keycloak connection |
| backend.configuration.authorization.keycloak.retry.backgroundRetryInterval | int | `60` | Background retry interval (in seconds) for continuous reconnection attempts after initial failure |
| backend.configuration.consumer | object | `{"connector":{"controlplane":{"apiKey":"<consumer-edc-api-key>","apiKeyHeader":"X-Api-Key","catalogPath":"/catalog","hostname":"https://<edc-consumer-control-hostname>","managementPath":"/management","protocolPath":"/api/v1/dsp"},"dataspace":{"version":"jupiter"}},"discovery":{"connector_discovery":{"key":"bpn"},"digitalTwinRegistry":{"dct_type_filter":{"operandLeft":"'http://purl.org/dc/terms/type'.'@id'","operandRight":"https://w3id.org/catenax/taxonomy#DigitalTwinRegistry","operator":"="},"dct_type_key":"dct:type"},"discovery_finder":{"url":"https://<discovery-finder-url>/api/v1.0/administration/connectors/discovery/search"},"oauth":{"client_id":"<client-id>","client_secret":"<client-secret>","realm":"<realm>","url":"https://<central-idp-url>/auth/"}}}` | Consumer configuration |
| backend.configuration.database | object | `{"echo":false,"retry_interval":5,"timeout":8}` | Database connection config; database connection settings are inferred from postgresql or externalDatabase sections. |
| backend.configuration.database.retry_interval | int | `5` | seconds to wait between retry attempts |
| backend.configuration.database.timeout | int | `8` | seconds to wait for the database to respond before aborting the connection attempt |
| backend.configuration.provider | object | `{"connector":{"controlplane":{"apiKey":"<provider-edc-api-key>","apiKeyHeader":"X-Api-Key","hostname":"https://<edc-provider-control-hostname>","managementPath":"/management","protocolPath":"/api/v1/dsp"},"dataplane":{"hostname":"https://<edc-provider-dataplane-hostname>","publicPath":"/api/public"},"dataspace":{"version":"jupiter"}},"digitalTwinRegistry":{"apiPath":"/api/v3","asset_config":{"dct_type":"https://w3id.org/catenax/taxonomy#DigitalTwinRegistry"},"hostname":"https://<dtr-hostname>","lookup":{"uri":""},"policy":{"access":{"context":{"cx-policy":"https://w3id.org/catenax/policy/","odrl":"http://www.w3.org/ns/odrl/2/"},"obligation":[],"permission":[{"action":"odrl:use","constraints":[{"leftOperand":"cx-policy:Membership","operator":"odrl:eq","rightOperand":"active"}]}],"prohibition":[]},"usage":{"context":{"cx-policy":"https://w3id.org/catenax/policy/","odrl":"http://www.w3.org/ns/odrl/2/"},"obligation":[],"permission":[{"LogicalConstraint":"odrl:and","action":"odrl:use","constraints":[{"leftOperand":"cx-policy:FrameworkAgreement","operator":"odrl:eq","rightOperand":"DataExchangeGovernance:1.0"},{"leftOperand":"cx-policy:Membership","operator":"odrl:eq","rightOperand":"active"},{"leftOperand":"cx-policy:UsagePurpose","operator":"odrl:eq","rightOperand":"cx.core.digitalTwinRegistry:1"}]}],"prohibition":[]}},"uri":""}}` | Provider configuration |
| backend.configuration.submodel_dispatcher | object | `{"apiPath":"/submodel-dispatcher","path":"/industry-core-hub/data/submodels"}` | EDC (Eclipse Dataspace Connector) configuration |
| backend.image.pullSecrets | list | `[]` | Existing image pull secret to use to [obtain the container image from private registries](https://kubernetes.io/docs/concepts/containers/images/#using-a-private-registry) |
| backend.image.tag | string | `""` | Overrides the image tag whose default is the chart appVersion |
| backend.ingress | object | `{"className":"nginx","enabled":false,"hosts":[{"host":"","paths":[{"backend":{"port":8000,"service":"backend"},"path":"/","pathType":"ImplementationSpecific"}]}],"tls":[]}` | ingress declaration to expose the industry-core-hub-backend service |
| backend.ingress.tls | list | `[]` | Ingress TLS configuration |
| backend.jobs | object | `{"assetSync":{"backoffLimit":3,"concurrencyPolicy":"Forbid","enabled":true,"failedJobsHistoryLimit":3,"resources":{"limits":{"cpu":"500m","ephemeral-storage":"1Gi","memory":"512Mi"},"requests":{"cpu":"100m","ephemeral-storage":"128Mi","memory":"256Mi"}},"restartPolicy":"OnFailure","schedule":"0 2 * * *","startingDeadlineSeconds":200,"successfulJobsHistoryLimit":3,"type":"cronjob"}}` | Jobs configuration for background tasks |
| backend.jobs.assetSync.backoffLimit | int | `3` | Number of retries before marking job as failed |
| backend.jobs.assetSync.concurrencyPolicy | string | `"Forbid"` | Concurrency policy for CronJob (only used when type is "cronjob") Options: Allow, Forbid, Replace |
| backend.jobs.assetSync.enabled | bool | `true` | Enable asset sync job (can be deployed as Job or CronJob) |
| backend.jobs.assetSync.failedJobsHistoryLimit | int | `3` | Number of failed jobs to keep in history (CronJob only) |
| backend.jobs.assetSync.resources | object | `{"limits":{"cpu":"500m","ephemeral-storage":"1Gi","memory":"512Mi"},"requests":{"cpu":"100m","ephemeral-storage":"128Mi","memory":"256Mi"}}` | Resource limits for the job |
| backend.jobs.assetSync.restartPolicy | string | `"OnFailure"` | Restart policy for job pods |
| backend.jobs.assetSync.schedule | string | `"0 2 * * *"` | Cron schedule (only used when type is "cronjob") Example: "0 */6 * * *" runs every 6 hours |
| backend.jobs.assetSync.startingDeadlineSeconds | int | `200` | Deadline in seconds for starting the job if it misses scheduled time (CronJob only) |
| backend.jobs.assetSync.successfulJobsHistoryLimit | int | `3` | Number of successful jobs to keep in history (CronJob only) |
| backend.jobs.assetSync.type | string | `"cronjob"` | Type of job: "job" for one-time execution, "cronjob" for scheduled execution |
| backend.persistence | object | `{"data":{"accessMode":"ReadWriteOnce","enabled":true,"size":"1Gi","storageClass":"standard"},"enabled":true,"logs":{"accessMode":"ReadWriteOnce","enabled":true,"size":"1Gi","storageClass":"standard"}}` | Persistance configuration for the backend |
| backend.persistence.data.accessMode | string | `"ReadWriteOnce"` | Access mode for data volume |
| backend.persistence.data.enabled | bool | `true` | Enable data persistence |
| backend.persistence.data.size | string | `"1Gi"` | Storage size for data |
| backend.persistence.data.storageClass | string | `"standard"` | Storage class for data volume |
| backend.persistence.enabled | bool | `true` | Create a PVC to persist storage (if disabled, data and logs will not be persisted) |
| backend.persistence.logs.accessMode | string | `"ReadWriteOnce"` | Access mode for logs volume |
| backend.persistence.logs.enabled | bool | `true` | Enable logs persistence |
| backend.persistence.logs.size | string | `"1Gi"` | Storage size for logs |
| backend.persistence.logs.storageClass | string | `"standard"` | Storage class for logs volume |
| backend.podSecurityContext | object | `{"fsGroup":10001,"runAsGroup":10001,"runAsUser":10000,"seccompProfile":{"type":"RuntimeDefault"}}` | The [pod security context](https://kubernetes.io/docs/tasks/configure-pod-container/security-context/#set-the-security-context-for-a-pod) defines privilege and access control settings for a Pod within the deployment |
| backend.podSecurityContext.fsGroup | int | `10001` | The owner for volumes and any files created within volumes will belong to this guid |
| backend.podSecurityContext.runAsGroup | int | `10001` | Processes within a pod will belong to this guid |
| backend.podSecurityContext.runAsUser | int | `10000` | Runs all processes within a pod with a special uid |
| backend.podSecurityContext.seccompProfile.type | string | `"RuntimeDefault"` | Restrict a Container's Syscalls with seccomp |
| backend.securityContext.allowPrivilegeEscalation | bool | `false` | Controls [Privilege Escalation](https://kubernetes.io/docs/concepts/security/pod-security-policy/#privilege-escalation) enabling setuid binaries changing the effective user ID |
| backend.securityContext.capabilities.add | list | `[]` | Specifies which capabilities to add to issue specialized syscalls |
| backend.securityContext.capabilities.drop | list | `["ALL"]` | Specifies which capabilities to drop to reduce syscall attack surface |
| backend.securityContext.readOnlyRootFilesystem | bool | `true` | Whether the root filesystem is mounted in read-only mode |
| backend.securityContext.runAsGroup | int | `10001` | The owner for volumes and any files created within volumes will belong to this guid |
| backend.securityContext.runAsNonRoot | bool | `true` | Requires the container to run without root privileges |
| backend.securityContext.runAsUser | int | `10000` | The container's process will run with the specified uid |
| backend.service.type | string | `"ClusterIP"` | [Service type](https://kubernetes.io/docs/concepts/services-networking/service/#publishing-services-service-types) to expose the running application on a set of Pods as a network service |
| backend.volumeMounts | list | `[{"mountPath":"/industry-core-hub/data","name":"data-volume","subPath":"data"},{"mountPath":"/industry-core-hub/logs","name":"logs-volume","subPath":"logs"},{"mountPath":"/industry-core-hub/config","name":"backend-config-configmap"},{"mountPath":"/industry-core-hub/tmp","name":"tmpfs"}]` | specifies volume mounts for the backend deployment |
| backend.volumes | list | `[{"configMap":{"name":"{{ .Release.Name }}-config"},"name":"backend-config-configmap"},{"name":"logs-volume","persistentVolumeClaim":{"claimName":"{{ .Release.Name }}-pvc-logs-backend"}},{"name":"data-volume","persistentVolumeClaim":{"claimName":"{{ .Release.Name }}-pvc-data-backend"}},{"emptyDir":{},"name":"tmpfs"}]` | volume claims for the containers |
| backend.volumes[0] | object | `{"configMap":{"name":"{{ .Release.Name }}-config"},"name":"backend-config-configmap"}` | persist the backend configuration |
| backend.volumes[1] | object | `{"name":"logs-volume","persistentVolumeClaim":{"claimName":"{{ .Release.Name }}-pvc-logs-backend"}}` | persist the backend data directories |
| backend.volumes[3] | object | `{"emptyDir":{},"name":"tmpfs"}` | temporary file system mount |
| deploymentMode | string | `"helm"` | Deployment mode: "helm" for standard Helm deployments, "argocd" for ArgoCD deployments This controls which annotations are used for the realm import job |
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
| frontend.config | object | `{"apiKey":"","apiKeyExpiryWarningDays":7,"apiKeyHeader":"X-API-Key","apiRetryAttempts":3,"apiTimeout":30000,"authEnabled":true,"authLogoutRedirectUri":"","authProvider":"keycloak","authRenewTokenMinValidity":300,"authSessionTimeout":3600000,"bpnValidationPattern":"^BPN[LAS]\\d{10}[a-zA-Z0-9]{2}$","enableAdvancedLogging":false,"enableApiKeyRotation":false,"enableDevTools":false,"enablePerformanceMonitoring":false,"environment":"development","ichubBackendUrl":"https://<backend-hostname>/v1","keycloak":{"checkLoginIframe":false,"checkLoginIframeInterval":5,"clientId":"industry-core-hub-frontend","enableLogging":false,"flow":"standard","minValidity":30,"onLoad":"check-sso","pkceMethod":"S256","realm":"ICHub","silentCheckSsoRedirectUri":"","url":"https://<keycloak-hostname>/auth"},"requireHttpsUrlPattern":false,"uiCompactMode":false,"uiLocale":"en","uiTheme":"auto","version":"1.0.0"}` | Enhanced frontend configuration |
| frontend.consumption.digitalTwinRegistry.policies[0].obligation | list | `[]` |  |
| frontend.consumption.digitalTwinRegistry.policies[0].permission[0].LogicalConstraint | string | `"odrl:and"` |  |
| frontend.consumption.digitalTwinRegistry.policies[0].permission[0].action | string | `"odrl:use"` |  |
| frontend.consumption.digitalTwinRegistry.policies[0].permission[0].constraints[0].leftOperand | string | `"cx-policy:FrameworkAgreement"` |  |
| frontend.consumption.digitalTwinRegistry.policies[0].permission[0].constraints[0].operator | string | `"odrl:eq"` |  |
| frontend.consumption.digitalTwinRegistry.policies[0].permission[0].constraints[0].rightOperand | string | `"DataExchangeGovernance:1.0"` |  |
| frontend.consumption.digitalTwinRegistry.policies[0].permission[0].constraints[1].leftOperand | string | `"cx-policy:Membership"` |  |
| frontend.consumption.digitalTwinRegistry.policies[0].permission[0].constraints[1].operator | string | `"odrl:eq"` |  |
| frontend.consumption.digitalTwinRegistry.policies[0].permission[0].constraints[1].rightOperand | string | `"active"` |  |
| frontend.consumption.digitalTwinRegistry.policies[0].permission[0].constraints[2].leftOperand | string | `"cx-policy:UsagePurpose"` |  |
| frontend.consumption.digitalTwinRegistry.policies[0].permission[0].constraints[2].operator | string | `"odrl:eq"` |  |
| frontend.consumption.digitalTwinRegistry.policies[0].permission[0].constraints[2].rightOperand | string | `"cx.core.digitalTwinRegistry:1"` |  |
| frontend.consumption.digitalTwinRegistry.policies[0].prohibition | list | `[]` |  |
| frontend.consumption.digitalTwinRegistry.policies[0].strict | bool | `false` |  |
| frontend.consumption.digitalTwinRegistry.policies[1].obligation | list | `[]` |  |
| frontend.consumption.digitalTwinRegistry.policies[1].permission[0].action | string | `"odrl:use"` |  |
| frontend.consumption.digitalTwinRegistry.policies[1].permission[0].constraints[0].leftOperand | string | `"cx-policy:UsagePurpose"` |  |
| frontend.consumption.digitalTwinRegistry.policies[1].permission[0].constraints[0].operator | string | `"odrl:eq"` |  |
| frontend.consumption.digitalTwinRegistry.policies[1].permission[0].constraints[0].rightOperand | string | `"cx.core.digitalTwinRegistry:1"` |  |
| frontend.consumption.digitalTwinRegistry.policies[1].prohibition | list | `[]` |  |
| frontend.consumption.governance[0].policies[0] | object | `{"obligation":[],"permission":[{"LogicalConstraint":"odrl:and","action":"odrl:use","constraints":[{"leftOperand":"cx-policy:FrameworkAgreement","operator":"odrl:eq","rightOperand":"DataExchangeGovernance:1.0"},{"leftOperand":"cx-policy:Membership","operator":"odrl:eq","rightOperand":"active"},{"leftOperand":"cx-policy:UsagePurpose","operator":"odrl:eq","rightOperand":"cx.core.industrycore:1"}]}],"prohibition":[],"strict":false}` | Enable here the permutations of constraints (order not matters) |
| frontend.consumption.governance[0].policies[1] | object | `{"obligation":[],"permission":[{"LogicalConstraint":"odrl:and","action":"odrl:use","constraints":[{"leftOperand":"cx-policy:FrameworkAgreement","operator":"odrl:eq","rightOperand":"DataExchangeGovernance:1.0"},{"leftOperand":"cx-policy:Membership","operator":"odrl:eq","rightOperand":"active"}]}],"prohibition":[],"strict":true}` | Disable here the permutations of constraints (order matters) |
| frontend.consumption.governance[0].policies[2] | object | `{"obligation":[],"permission":[{"action":"odrl:use","constraints":[{"leftOperand":"cx-policy:UsagePurpose","operator":"odrl:eq","rightOperand":"cx.core.industrycore:1"}]}],"prohibition":[],"strict":false}` | Enable here the permutations of constraints (order not matters) |
| frontend.consumption.governance[0].semanticid | string | `"urn:samm:io.catenax.part_type_information:1.0.0#PartTypeInformation"` |  |
| frontend.consumption.governance[1].policies[0] | object | `{"obligation":[],"permission":[{"LogicalConstraint":"odrl:and","action":"odrl:use","constraints":[{"leftOperand":"cx-policy:FrameworkAgreement","operator":"odrl:eq","rightOperand":"DataExchangeGovernance:1.0"},{"leftOperand":"cx-policy:Membership","operator":"odrl:eq","rightOperand":"active"},{"leftOperand":"cx-policy:UsagePurpose","operator":"odrl:eq","rightOperand":"cx.core.industrycore:1"}]}],"prohibition":[],"strict":false}` | Enable here the permutations of constraints (order not matters) |
| frontend.consumption.governance[1].policies[1] | object | `{"obligation":[],"permission":[{"LogicalConstraint":"odrl:and","action":"odrl:use","constraints":[{"leftOperand":"cx-policy:FrameworkAgreement","operator":"odrl:eq","rightOperand":"DataExchangeGovernance:1.0"},{"leftOperand":"cx-policy:Membership","operator":"odrl:eq","rightOperand":"active"}]}],"prohibition":[],"strict":true}` | Disable here the permutations of constraints (order matters) |
| frontend.consumption.governance[1].policies[2] | object | `{"obligation":[],"permission":[{"action":"odrl:use","constraints":[{"leftOperand":"cx-policy:UsagePurpose","operator":"odrl:eq","rightOperand":"cx.core.industrycore:1"}]}],"prohibition":[],"strict":false}` | Enable here the permutations of constraints (order not matters) |
| frontend.consumption.governance[1].semanticid | string | `"urn:samm:io.catenax.serial_part:3.0.0#SerialPart"` |  |
| frontend.consumption.governance[2].policies[0] | object | `{"obligation":[],"permission":[{"action":"odrl:use","constraints":[{"leftOperand":"cx-policy:UsagePurpose","operator":"odrl:eq","rightOperand":"cx.circular.dpp:1"}]}],"prohibition":[],"strict":false}` | Enable here the permutations of constraints (order not matters) |
| frontend.consumption.governance[2].policies[1] | object | `{"obligation":[],"permission":[{"LogicalConstraint":"odrl:and","action":"odrl:use","constraints":[{"leftOperand":"cx-policy:FrameworkAgreement","operator":"odrl:eq","rightOperand":"DataExchangeGovernance:1.0"},{"leftOperand":"cx-policy:Membership","operator":"odrl:eq","rightOperand":"active"},{"leftOperand":"cx-policy:UsagePurpose","operator":"odrl:eq","rightOperand":"cx.circular.dpp:1"}]}],"prohibition":[],"strict":false}` | Disable here the permutations of constraints (order matters) |
| frontend.consumption.governance[2].semanticid | string | `"urn:samm:io.catenax.generic.digital_product_passport:6.1.0#DigitalProductPassport"` |  |
| frontend.consumption.governance[3].policies[0].obligation | list | `[]` |  |
| frontend.consumption.governance[3].policies[0].permission[0].LogicalConstraint | string | `"odrl:and"` |  |
| frontend.consumption.governance[3].policies[0].permission[0].action | string | `"odrl:use"` |  |
| frontend.consumption.governance[3].policies[0].permission[0].constraints[0].leftOperand | string | `"cx-policy:FrameworkAgreement"` |  |
| frontend.consumption.governance[3].policies[0].permission[0].constraints[0].operator | string | `"odrl:eq"` |  |
| frontend.consumption.governance[3].policies[0].permission[0].constraints[0].rightOperand | string | `"DataExchangeGovernance:1.0"` |  |
| frontend.consumption.governance[3].policies[0].permission[0].constraints[1].leftOperand | string | `"cx-policy:Membership"` |  |
| frontend.consumption.governance[3].policies[0].permission[0].constraints[1].operator | string | `"odrl:eq"` |  |
| frontend.consumption.governance[3].policies[0].permission[0].constraints[1].rightOperand | string | `"active"` |  |
| frontend.consumption.governance[3].policies[0].permission[0].constraints[2].leftOperand | string | `"cx-policy:UsagePurpose"` |  |
| frontend.consumption.governance[3].policies[0].permission[0].constraints[2].operator | string | `"odrl:eq"` |  |
| frontend.consumption.governance[3].policies[0].permission[0].constraints[2].rightOperand | string | `"cx.core.industrycore:1"` |  |
| frontend.consumption.governance[3].policies[0].prohibition | list | `[]` |  |
| frontend.consumption.governance[3].policies[0].strict | bool | `false` |  |
| frontend.consumption.governance[3].policies[1] | object | `{"obligation":[],"permission":[{"LogicalConstraint":"odrl:and","action":"odrl:use","constraints":[{"leftOperand":"cx-policy:FrameworkAgreement","operator":"odrl:eq","rightOperand":"DataExchangeGovernance:1.0"},{"leftOperand":"cx-policy:Membership","operator":"odrl:eq","rightOperand":"active"}]}],"prohibition":[],"strict":true}` | Disable here the permutations of constraints (order matters) |
| frontend.consumption.governance[3].policies[2].obligation | list | `[]` |  |
| frontend.consumption.governance[3].policies[2].permission[0].action | string | `"odrl:use"` |  |
| frontend.consumption.governance[3].policies[2].permission[0].constraints[0].leftOperand | string | `"cx-policy:UsagePurpose"` |  |
| frontend.consumption.governance[3].policies[2].permission[0].constraints[0].operator | string | `"odrl:eq"` |  |
| frontend.consumption.governance[3].policies[2].permission[0].constraints[0].rightOperand | string | `"cx.core.industrycore:1"` |  |
| frontend.consumption.governance[3].policies[2].prohibition | list | `[]` |  |
| frontend.consumption.governance[3].policies[2].strict | bool | `false` |  |
| frontend.consumption.governance[3].semanticid | string | `"urn:samm:io.catenax.us_tariff_information:1.0.0#UsTariffInformation"` |  |
| frontend.enabled | bool | `true` |  |
| frontend.env.backendUrl | string | `"https://<backend-hostname>/v1"` | industry-core-hub backend base URL |
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
| frontend.ingress | object | `{"className":"nginx","enabled":false,"hosts":[{"host":"<frontend-hostname>","paths":[{"backend":{"port":8080,"service":"frontend"},"path":"/","pathType":"ImplementationSpecific"}]}],"tls":[]}` | ingress declaration to expose the industry-core-hub-backend service |
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
| keycloak.args | list | `[]` |  |
| keycloak.auth.adminPassword | string | `"keycloak-admin-password"` | Keycloak administrator password. |
| keycloak.auth.adminUser | string | `"admin"` |  |
| keycloak.auth.existingSecret | string | `""` | Secret containing the password for admin username 'admin'. |
| keycloak.command | list | `[]` | Will be set automatically when realmImport.method is "startup" |
| keycloak.enabled | bool | `true` |  |
| keycloak.externalDatabase.database | string | `"ichub-postgres"` | Database name. |
| keycloak.externalDatabase.existingSecret | string | `"ichub-postgres-secret"` | Secret containing the database credentials. |
| keycloak.externalDatabase.existingSecretDatabaseKey | string | `""` |  |
| keycloak.externalDatabase.existingSecretHostKey | string | `""` |  |
| keycloak.externalDatabase.existingSecretPasswordKey | string | `"ichub-password"` |  |
| keycloak.externalDatabase.existingSecretPortKey | string | `""` |  |
| keycloak.externalDatabase.existingSecretUserKey | string | `""` |  |
| keycloak.externalDatabase.host | string | `"{{ include \"industry-core-hub.postgresql.fullname\" . }}"` | External PostgreSQL configuration IMPORTANT: non-root db user needs needs to be created beforehand on external database. |
| keycloak.externalDatabase.password | string | `""` | Password for the non-root username. |
| keycloak.externalDatabase.port | int | `5432` | Database port number. |
| keycloak.externalDatabase.user | string | `"ichub_keycloak"` | Non-root username. |
| keycloak.extraEnvVars | list | `[]` | Will be set automatically based on realmImport.method |
| keycloak.extraVolumeMounts[0].mountPath | string | `"/opt/bitnami/keycloak/themes/catenax-central"` |  |
| keycloak.extraVolumeMounts[0].name | string | `"themes"` |  |
| keycloak.extraVolumes[0].emptyDir | object | `{}` |  |
| keycloak.extraVolumes[0].name | string | `"themes"` |  |
| keycloak.httpRelativePath | string | `"/auth/"` | Setting the path relative to '/' for serving resources: as we're migrating from 16.1.1 version which was using the trailing 'auth', we're setting it to '/auth/'. ref: https://www.keycloak.org/migration/migrating-to-quarkus#_default_context_path_changed |
| keycloak.image.registry | string | `"docker.io"` |  |
| keycloak.image.repository | string | `"bitnamilegacy/keycloak"` |  |
| keycloak.image.tag | string | `"25.0.6-debian-12-r0"` |  |
| keycloak.ingress.annotations | object | `{"nginx.ingress.kubernetes.io/use-regex":"true"}` | Optional annotations when using the nginx ingress class; Enable TLS configuration for the host defined at `ingress.hostname` parameter; TLS certificates will be retrieved from a TLS secret with name: `{{- printf "%s-tls" .Values.ingress.hostname }}`; Provide the name of ClusterIssuer to acquire the certificate required for this Ingress. |
| keycloak.ingress.enabled | bool | `false` | Enable ingress record generation |
| keycloak.ingress.hostname | string | `"<keycloak-hostname>"` | Provide default path for the ingress record. |
| keycloak.ingress.ingressClassName | string | `""` |  |
| keycloak.ingress.tls | bool | `false` |  |
| keycloak.initContainers[0].args[0] | string | `"-c"` |  |
| keycloak.initContainers[0].args[1] | string | `"echo \"Copying themes...\"\ncp -R /import/themes/catenax-central/* /themes\n"` |  |
| keycloak.initContainers[0].command[0] | string | `"sh"` |  |
| keycloak.initContainers[0].image | string | `"docker.io/tractusx/portal-iam:v4.2.0"` |  |
| keycloak.initContainers[0].imagePullPolicy | string | `"IfNotPresent"` |  |
| keycloak.initContainers[0].name | string | `"import"` |  |
| keycloak.initContainers[0].volumeMounts[0].mountPath | string | `"/themes"` |  |
| keycloak.initContainers[0].volumeMounts[0].name | string | `"themes"` |  |
| keycloak.livenessProbe | object | `{"enabled":true,"failureThreshold":6,"initialDelaySeconds":240,"periodSeconds":2,"successThreshold":1,"timeoutSeconds":10}` | Liveness probe configuration |
| keycloak.postgresql.architecture | string | `"standalone"` |  |
| keycloak.postgresql.auth.database | string | `"ichub-postgres"` | Database name. |
| keycloak.postgresql.auth.existingSecret | string | `"ichub-postgres-secret"` | Secret containing the passwords for root usernames postgres and non-root username ichub. |
| keycloak.postgresql.auth.username | string | `"ichub_keycloak"` | Non-root username. |
| keycloak.postgresql.commonLabels."app.kubernetes.io/version" | string | `"15"` |  |
| keycloak.postgresql.enabled | bool | `false` | PostgreSQL chart configuration (recommended for demonstration purposes only); default configurations: host: "centralidp-postgresql", port: 5432; Switch to enable or disable the PostgreSQL helm chart. |
| keycloak.postgresql.image | object | `{"registry":"docker.io","repository":"bitnamilegacy/postgresql","tag":"15-debian-11"}` | Setting to Postgres version 15 as that is the aligned version, https://eclipse-tractusx.github.io/docs/release/trg-5/trg-5-07/#aligning-dependency-versions). Keycloak helm-chart from Bitnami has moved on to version 16. |
| keycloak.production | bool | `false` | Run Keycloak in production mode. TLS configuration is required except when using proxy=edge. |
| keycloak.proxy | string | `"edge"` | Proxy mode for Keycloak when running behind a reverse proxy (edge, reencrypt, passthrough, or none) Use 'edge' when running behind a reverse proxy that terminates SSL/TLS |
| keycloak.rbac.create | bool | `true` |  |
| keycloak.rbac.rules[0].apiGroups[0] | string | `""` |  |
| keycloak.rbac.rules[0].resources[0] | string | `"pods"` |  |
| keycloak.rbac.rules[0].verbs[0] | string | `"get"` |  |
| keycloak.rbac.rules[0].verbs[1] | string | `"list"` |  |
| keycloak.readinessProbe | object | `{"enabled":true,"failureThreshold":6,"initialDelaySeconds":60,"periodSeconds":20,"successThreshold":1,"timeoutSeconds":2}` | Readiness probe configuration |
| keycloak.realm | object | `{"clients":{"backend":{"redirectUris":["http://localhost:8000/*","http://localhost:9000/*","http://ichub-backend.tx.test/*"],"webOrigins":["http://localhost:8000","http://localhost:9000","http://ichub-backend.tx.test"]},"frontend":{"redirectUris":["http://localhost:3000/*","http://localhost:5173/*","http://ichub-frontend.tx.test/*","http://industry-core-hub-frontend.tx.test/*"],"webOrigins":["http://localhost:3000","http://localhost:5173","http://ichub-frontend.tx.test","http://industry-core-hub-frontend.tx.test"]}},"name":"ICHub","users":[{"attributes":{"BPN":["BPNL000000000000"]},"email":"ichub-admin@example.com","emailVerified":true,"enabled":true,"firstName":"Industry","lastName":"Admin","password":"changeme","realmRoles":["default-roles-ichub","offline_access","uma_authorization"],"username":"ichub-admin"}]}` | Realm user configuration (passwords will be hashed at deployment time) |
| keycloak.realm.clients | object | `{"backend":{"redirectUris":["http://localhost:8000/*","http://localhost:9000/*","http://ichub-backend.tx.test/*"],"webOrigins":["http://localhost:8000","http://localhost:9000","http://ichub-backend.tx.test"]},"frontend":{"redirectUris":["http://localhost:3000/*","http://localhost:5173/*","http://ichub-frontend.tx.test/*","http://industry-core-hub-frontend.tx.test/*"],"webOrigins":["http://localhost:3000","http://localhost:5173","http://ichub-frontend.tx.test","http://industry-core-hub-frontend.tx.test"]}}` | Client redirect URIs configuration |
| keycloak.realmImport | object | `{"enabled":true,"image":{"pullPolicy":"IfNotPresent","repository":"adorsys/keycloak-config-cli","tag":"latest-25.0.1"},"method":"job","resources":{"limits":{"cpu":"500m","ephemeral-storage":"128Mi","memory":"256Mi"},"requests":{"cpu":"100m","ephemeral-storage":"64Mi","memory":"128Mi"}}}` | Realm import configuration |
| keycloak.realmImport.image | object | `{"pullPolicy":"IfNotPresent","repository":"adorsys/keycloak-config-cli","tag":"latest-25.0.1"}` | keycloak-config-cli image configuration |
| keycloak.realmImport.method | string | `"job"` | "job": Post-install Kubernetes job (allows dynamic password setting) |
| keycloak.realmImport.resources | object | `{"limits":{"cpu":"500m","ephemeral-storage":"128Mi","memory":"256Mi"},"requests":{"cpu":"100m","ephemeral-storage":"64Mi","memory":"128Mi"}}` | Resource limits for the realm import job |
| keycloak.replicaCount | int | `1` |  |
| keycloak.resources | object | `{"limits":{"cpu":"1","ephemeral-storage":"2Gi","memory":"2Gi"},"requests":{"cpu":"500m","ephemeral-storage":"256Mi","memory":"1Gi"}}` | Resource configuration for Keycloak |
| keycloak.service.sessionAffinity | string | `"ClientIP"` |  |
| livenessProbe.failureThreshold | int | `3` |  |
| livenessProbe.initialDelaySeconds | int | `10` |  |
| livenessProbe.periodSeconds | int | `10` |  |
| livenessProbe.successThreshold | int | `1` |  |
| livenessProbe.timeoutSeconds | int | `10` |  |
| nameOverride | string | `""` |  |
| nodeSelector | object | `{}` |  |
| participantId | string | `""` |  |
| pgadmin4 | object | `{"enabled":false,"env":{"email":"pgadmin4@txtest.org","password":"tractusxpgadmin4"},"ingress":{"enabled":false},"persistentVolume":{"enabled":false}}` | pgAdmin4 configuration |
| postgresql | object | `{"auth":{"database":"ichub-postgres","existingSecret":"ichub-postgres-secret","ichubPassword":"","ichubUser":"ichub","password":"","sslMode":"prefer"},"enabled":true,"extraEnvVars":[{"name":"DATABASE_PASSWORD","valueFrom":{"secretKeyRef":{"key":"ichub-password","name":"ichub-postgres-secret"}}}],"fullnameOverride":"","image":{"registry":"docker.io","repository":"postgres"},"initdb":{"scriptsConfigMap":"{{ .Release.Name }}-cm-postgres"},"nameOverride":"","persistence":{"enabled":false,"size":"10Gi","torageClass":""}}` | PostgreSQL chart configuration (cloudpirates) |
| postgresql.auth | object | `{"database":"ichub-postgres","existingSecret":"ichub-postgres-secret","ichubPassword":"","ichubUser":"ichub","password":"","sslMode":"prefer"}` | PostgreSQL Authentication (postgres admin user) |
| postgresql.auth.database | string | `"ichub-postgres"` | Default database to create |
| postgresql.auth.existingSecret | string | `"ichub-postgres-secret"` | Existing secret containing passwords |
| postgresql.auth.ichubPassword | string | `""` | Password for the non-root username 'ichub'. Secret-key 'ichub-password'. |
| postgresql.auth.ichubUser | string | `"ichub"` | Username for  ichub user |
| postgresql.auth.password | string | `""` | Password for postgres admin user (stored in existingSecret with key 'postgres-password') |
| postgresql.auth.sslMode | string | `"prefer"` | Determines whether or with what priority a secure SSL TCP/IP connection will be negotiated with the server. There are [six modes](https://www.postgresql.org/docs/current/libpq-connect.html#LIBPQ-CONNECT-SSLMODE) |
| postgresql.enabled | bool | `true` | Switch to enable or disable the PostgreSQL helm chart |
| postgresql.extraEnvVars | list | `[{"name":"DATABASE_PASSWORD","valueFrom":{"secretKeyRef":{"key":"ichub-password","name":"ichub-postgres-secret"}}}]` | Extra environment variables for init scripts |
| postgresql.fullnameOverride | string | `""` | String to fully override postgres.fullname |
| postgresql.image | object | `{"registry":"docker.io","repository":"postgres"}` | PostgreSQL image configuration |
| postgresql.image.registry | string | `"docker.io"` | PostgreSQL image registry |
| postgresql.image.repository | string | `"postgres"` | PostgreSQL image repository |
| postgresql.initdb | object | `{"scriptsConfigMap":"{{ .Release.Name }}-cm-postgres"}` | Initdb configuration - runs scripts to create ichub and ichub_keycloak users |
| postgresql.initdb.scriptsConfigMap | string | `"{{ .Release.Name }}-cm-postgres"` | ConfigMap with scripts to be run at first boot |
| postgresql.nameOverride | string | `""` | String to partially override postgres.fullname |
| postgresql.persistence | object | `{"enabled":false,"size":"10Gi","torageClass":""}` | Persistence configuration |
| postgresql.persistence.enabled | bool | `false` | Enable persistence using Persistent Volume Claims |
| postgresql.persistence.size | string | `"10Gi"` | Storage class for the volume claim |
| postgresql.persistence.torageClass | string | `""` | Persistent Volume storage class |
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
