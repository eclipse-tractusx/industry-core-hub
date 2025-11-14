{{- /*
* Eclipse Tractus-X - Industry Core Hub
*
* Copyright (c) 2025 Contributors to the Eclipse Foundation
*
* See the NOTICE file(s) distributed with this work for additional
* information regarding copyright ownership.
*
* This program and the accompanying materials are made available under the
* terms of the Apache License, Version 2.0 which is available at
* https://www.apache.org/licenses/LICENSE-2.0.
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
* WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
* License for the specific language governing permissions and limitations
* under the License.
*
* SPDX-License-Identifier: Apache-2.0
*/}}
{{/*
Expand the name of the chart.
*/}}
{{- define "industry-core-hub.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
We truncate at 63 chars because some Kubernetes name fields are limited to this (by the DNS naming spec).
If release name contains chart name it will be used as a full name.
*/}}
{{- define "industry-core-hub.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{- define "industry-core-hub.fullname.backend" -}}
{{- if .Values.backend.name }}
{{- .Values.backend.name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-backend" (include "industry-core-hub.fullname" .) | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}

{{- define "industry-core-hub.fullname.frontend" -}}
{{- if .Values.frontend.name }}
{{- .Values.frontend.name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-frontend" (include "industry-core-hub.fullname" .) | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "industry-core-hub.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "industry-core-hub.labels" -}}
helm.sh/chart: {{ include "industry-core-hub.chart" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Backend labels (includes backend selector labels)
*/}}
{{- define "industry-core-hub.backend.labels" -}}
{{ include "industry-core-hub.backend.selectorLabels" . }}
{{ include "industry-core-hub.labels" . }}
{{- end }}

{{/*
Frontend labels (includes frontend selector labels)
*/}}
{{- define "industry-core-hub.frontend.labels" -}}
{{ include "industry-core-hub.frontend.selectorLabels" . }}
{{ include "industry-core-hub.labels" . }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "industry-core-hub.selectorLabels" -}}
app.kubernetes.io/name: {{ include "industry-core-hub.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Backend Selector labels
*/}}
{{- define "industry-core-hub.backend.selectorLabels" -}}
app.kubernetes.io/name: {{ include "industry-core-hub.fullname.backend" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Backend Selector labels
*/}}
{{- define "industry-core-hub.frontend.selectorLabels" -}}
app.kubernetes.io/name: {{ include "industry-core-hub.fullname.frontend" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Create the name of the service account to use
*/}}
{{- define "industry-core-hub.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "industry-core-hub.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}

{{/*
Get the database host
*/}}
{{- define "industry-core-hub.postgresql.host" -}}
{{- if .Values.postgresql.enabled }}
{{- (include "industry-core-hub.postgresql.fullname" .) -}}
{{- else -}}
{{- .Values.externalDatabase.host -}}
{{- end -}}
{{- end -}}

{{/*
Get the database port
*/}}
{{- define "industry-core-hub.postgresql.port" -}}
{{- if .Values.postgresql.enabled }}
{{- .Values.postgresql.service.port | default 5432 -}}
{{- else -}}
{{- .Values.externalDatabase.port -}}
{{- end -}}
{{- end -}}

{{/*
Get the database name
*/}}
{{- define "industry-core-hub.postgresql.fullname" -}}
{{- if .Values.postgresql.fullnameOverride -}}
{{- .Values.postgresql.fullnameOverride | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- $name := default "postgresql" .Values.postgresql.nameOverride -}}
{{- if contains $name .Release.Name -}}
{{- .Release.Name | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" -}}
{{- end -}}
{{- end -}}
{{- end -}}

{{/*
Get the database username
*/}}
{{- define "industry-core-hub.postgresql.ichubUser" -}}
{{- if .Values.postgresql.enabled }}
{{- .Values.postgresql.auth.ichubUser -}}
{{- else -}}
{{- .Values.externalDatabase.ichubUser -}}
{{- end -}}
{{- end -}}

{{/*
Get the database secret name
*/}}
{{- define "industry-core-hub.postgresql.secretName" -}}
{{- if .Values.postgresql.enabled }}
{{- if .Values.postgresql.auth.existingSecret }}
{{- .Values.postgresql.auth.existingSecret -}}
{{- else -}}
{{- include "industry-core-hub.postgresql.fullname" . -}}
{{- end -}}
{{- else -}}
{{- if .Values.externalDatabase.existingSecret }}
{{- .Values.externalDatabase.existingSecret -}}
{{- else -}}
{{- printf "%s-external-db" (include "industry-core-hub.postgresql.fullname" .) -}}
{{- end -}}
{{- end -}}
{{- end -}}

{{/*
Get the database name
*/}}
{{- define "industry-core-hub.postgresql.databaseName" -}}
{{- if .Values.postgresql.enabled }}
{{- .Values.postgresql.auth.database -}}
{{- else -}}
{{- .Values.externalDatabase.database -}}
{{- end -}}
{{- end -}}

{{/*
Get the sslMode
*/}}
{{- define "industry-core-hub.postgresql.sslMode" -}}
{{- if .Values.postgresql.enabled }}
{{- .Values.postgresql.auth.sslMode -}}
{{- else -}}
{{- .Values.externalDatabase.sslMode -}}
{{- end -}}
{{- end -}}

{{/*
Get the database secret key
*/}}
{{- define "industry-core-hub.postgresql.ichub.secretKey" -}}
{{- if .Values.postgresql.enabled }}
{{- print "ichub-password" -}}
{{- else -}}
{{- .Values.externalDatabase.existingIchubSecretKey -}}
{{- end -}}
{{- end -}}

{{/*
Return the postgresql URL
*/}}
{{- define "industry-core-hub.postgresql.url" -}}
{{- $host := include "industry-core-hub.database.host" . -}}
{{- $port := include "industry-core-hub.database.port" . -}}
{{- $name := include "industry-core-hub.database.name" . -}}
{{- printf "postgresql://%s:%s/%s" $host $port $name -}}
{{- end -}}

{{/*
Get the postgres configmap name
*/}}
{{- define "industry-core-hub.postgresql.configmap" -}}
{{- printf "%s-cm-postgres" .Release.Name -}}
{{- end -}}

{{/*
Return the postgresql DSN URL
*/}}
{{- define "industry-core-hub.postgresql.dsn" -}}
{{- $host := include "industry-core-hub.postgresql.host" . -}}
{{- $port := include "industry-core-hub.postgresql.port" . -}}
{{- $name := include "industry-core-hub.postgresql.databaseName" . -}}
{{- $user := include "industry-core-hub.postgresql.ichubUser" . -}}
{{- $sslMode := include "industry-core-hub.postgresql.sslMode" . -}}
{{- printf "postgresql://%s:$DATABASE_PASSWORD@%s:%s/%s?sslmode=%s" $user $host $port $name $sslMode -}}
{{- end -}}

{{- define "industry-core-hub.ingressUrl" -}}
{{- $ingress := .Values.backend.ingress }}
{{- $host := "" }}
{{- $path := "/" }}
{{- $apiVersion := .Values.backend.apiVersion }}
{{- $tlsHosts := dict }}
{{- range $tls := $ingress.tls }}
  {{- range $tlsHost := $tls.hosts }}
    {{- $_ := set $tlsHosts $tlsHost true }}
  {{- end }}
{{- end }}
{{- if $ingress.hosts }}
  {{- $first := index $ingress.hosts 0 }}
  {{- $host = $first.host }}
  {{- if and $first.paths (gt (len $first.paths) 0) }}
    {{- $firstPath := index $first.paths 0 }}
    {{- if and $firstPath.path (ne $firstPath.path "/") }}
      {{- $path = $firstPath.path }}
    {{- end }}
  {{- end }}
{{- end }}
{{- $scheme := ternary "https" "http" (hasKey $tlsHosts $host) }}
{{- if eq $path "/" }}
  {{- if and $apiVersion (ne $apiVersion "") }}
    {{- printf "%s://%s/%s" $scheme $host $apiVersion }}
  {{- else }}
    {{- printf "%s://%s" $scheme $host }}
  {{- end }}
{{- else }}
  {{- if and $apiVersion (ne $apiVersion "") }}
    {{- printf "%s://%s%s/%s" $scheme $host $path $apiVersion }}
  {{- else }}
    {{- printf "%s://%s%s" $scheme $host $path }}
  {{- end }}
{{- end }}
{{- end }}
