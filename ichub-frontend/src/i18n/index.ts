/********************************************************************************
 * Eclipse Tractus-X - Industry Core Hub Frontend
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
 * distributed under the License is distributed on an "AS IS" BASIS
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND,
 * either express or implied. See the
 * License for the specific language govern in permissions and limitations
 * under the License.
 *
 * SPDX-License-Identifier: Apache-2.0
********************************************************************************/

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// English
import enCommon from './locales/en/common.json';
import enKits from './locales/en/kits.json';
import enCatalogManagement from './locales/en/catalogManagement.json';
import enPartnerManagement from './locales/en/partnerManagement.json';
import enPassportConsumption from './locales/en/passportConsumption.json';
import enPassportProvision from './locales/en/passportProvision.json';
import enPartDiscovery from './locales/en/partDiscovery.json';
import enSerializedParts from './locales/en/serializedParts.json';
import enNotifications from './locales/en/notifications.json';

// Spanish
import esCommon from './locales/es/common.json';
import esKits from './locales/es/kits.json';
import esCatalogManagement from './locales/es/catalogManagement.json';
import esPartnerManagement from './locales/es/partnerManagement.json';
import esPassportConsumption from './locales/es/passportConsumption.json';
import esPassportProvision from './locales/es/passportProvision.json';
import esPartDiscovery from './locales/es/partDiscovery.json';
import esSerializedParts from './locales/es/serializedParts.json';
import esNotifications from './locales/es/notifications.json';

// German
import deCommon from './locales/de/common.json';
import deKits from './locales/de/kits.json';
import deCatalogManagement from './locales/de/catalogManagement.json';
import dePartnerManagement from './locales/de/partnerManagement.json';
import dePassportConsumption from './locales/de/passportConsumption.json';
import dePassportProvision from './locales/de/passportProvision.json';
import dePartDiscovery from './locales/de/partDiscovery.json';
import deSerializedParts from './locales/de/serializedParts.json';
import deNotifications from './locales/de/notifications.json';

// French
import frCommon from './locales/fr/common.json';
import frKits from './locales/fr/kits.json';
import frCatalogManagement from './locales/fr/catalogManagement.json';
import frPartnerManagement from './locales/fr/partnerManagement.json';
import frPassportConsumption from './locales/fr/passportConsumption.json';
import frPassportProvision from './locales/fr/passportProvision.json';
import frPartDiscovery from './locales/fr/partDiscovery.json';
import frSerializedParts from './locales/fr/serializedParts.json';
import frNotifications from './locales/fr/notifications.json';

// Chinese (Simplified)
import zhCommon from './locales/zh/common.json';
import zhKits from './locales/zh/kits.json';
import zhCatalogManagement from './locales/zh/catalogManagement.json';
import zhPartnerManagement from './locales/zh/partnerManagement.json';
import zhPassportConsumption from './locales/zh/passportConsumption.json';
import zhPassportProvision from './locales/zh/passportProvision.json';
import zhPartDiscovery from './locales/zh/partDiscovery.json';
import zhSerializedParts from './locales/zh/serializedParts.json';
import zhNotifications from './locales/zh/notifications.json';

// Japanese
import jaCommon from './locales/ja/common.json';
import jaKits from './locales/ja/kits.json';
import jaCatalogManagement from './locales/ja/catalogManagement.json';
import jaPartnerManagement from './locales/ja/partnerManagement.json';
import jaPassportConsumption from './locales/ja/passportConsumption.json';
import jaPassportProvision from './locales/ja/passportProvision.json';
import jaPartDiscovery from './locales/ja/partDiscovery.json';
import jaSerializedParts from './locales/ja/serializedParts.json';
import jaNotifications from './locales/ja/notifications.json';

// Portuguese
import ptCommon from './locales/pt/common.json';
import ptKits from './locales/pt/kits.json';
import ptCatalogManagement from './locales/pt/catalogManagement.json';
import ptPartnerManagement from './locales/pt/partnerManagement.json';
import ptPassportConsumption from './locales/pt/passportConsumption.json';
import ptPassportProvision from './locales/pt/passportProvision.json';
import ptPartDiscovery from './locales/pt/partDiscovery.json';
import ptSerializedParts from './locales/pt/serializedParts.json';
import ptNotifications from './locales/pt/notifications.json';

export const defaultNS = 'common';
export const resources = {
  en: {
    common: enCommon,
    kits: enKits,
    catalogManagement: enCatalogManagement,
    partnerManagement: enPartnerManagement,
    passportConsumption: enPassportConsumption,
    passportProvision: enPassportProvision,
    partDiscovery: enPartDiscovery,
    serializedParts: enSerializedParts,
    notifications: enNotifications
  },
  es: {
    common: esCommon,
    kits: esKits,
    catalogManagement: esCatalogManagement,
    partnerManagement: esPartnerManagement,
    passportConsumption: esPassportConsumption,
    passportProvision: esPassportProvision,
    partDiscovery: esPartDiscovery,
    serializedParts: esSerializedParts,
    notifications: esNotifications
  },
  de: {
    common: deCommon,
    kits: deKits,
    catalogManagement: deCatalogManagement,
    partnerManagement: dePartnerManagement,
    passportConsumption: dePassportConsumption,
    passportProvision: dePassportProvision,
    partDiscovery: dePartDiscovery,
    serializedParts: deSerializedParts,
    notifications: deNotifications
  },
  fr: {
    common: frCommon,
    kits: frKits,
    catalogManagement: frCatalogManagement,
    partnerManagement: frPartnerManagement,
    passportConsumption: frPassportConsumption,
    passportProvision: frPassportProvision,
    partDiscovery: frPartDiscovery,
    serializedParts: frSerializedParts,
    notifications: frNotifications
  },
  zh: {
    common: zhCommon,
    kits: zhKits,
    catalogManagement: zhCatalogManagement,
    partnerManagement: zhPartnerManagement,
    passportConsumption: zhPassportConsumption,
    passportProvision: zhPassportProvision,
    partDiscovery: zhPartDiscovery,
    serializedParts: zhSerializedParts,
    notifications: zhNotifications
  },
  ja: {
    common: jaCommon,
    kits: jaKits,
    catalogManagement: jaCatalogManagement,
    partnerManagement: jaPartnerManagement,
    passportConsumption: jaPassportConsumption,
    passportProvision: jaPassportProvision,
    partDiscovery: jaPartDiscovery,
    serializedParts: jaSerializedParts,
    notifications: jaNotifications
  },
  pt: {
    common: ptCommon,
    kits: ptKits,
    catalogManagement: ptCatalogManagement,
    partnerManagement: ptPartnerManagement,
    passportConsumption: ptPassportConsumption,
    passportProvision: ptPassportProvision,
    partDiscovery: ptPartDiscovery,
    serializedParts: ptSerializedParts,
    notifications: ptNotifications
  }
} as const;

/** 
 * Supported language codes for the application.
 * Used by the language detector to validate detected languages.
 */
const supportedLanguages = ['en', 'es', 'de', 'fr', 'zh', 'ja', 'pt'];

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    supportedLngs: supportedLanguages,
    defaultNS,
    ns: ['common', 'kits', 'catalogManagement', 'partnerManagement', 'passportConsumption', 'passportProvision', 'partDiscovery', 'notifications'],
    interpolation: {
      escapeValue: false // React already escapes values
    },
    detection: {
      // Order of detection methods: localStorage first, then browser language
      order: ['localStorage', 'navigator', 'htmlTag'],
      // Key used to store language preference in localStorage
      lookupLocalStorage: 'ichub-language',
      // Cache the detected language in localStorage
      caches: ['localStorage']
    }
  });

export default i18n;
