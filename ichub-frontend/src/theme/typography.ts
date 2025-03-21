/********************************************************************************
 * Copyright (c) 2023 Contributors to the Eclipse Foundation
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
 ********************************************************************************/

import { paletteDefinitions } from './palette'

const getFontFamily = (name: string): string =>
  [
    '"Manrope"',
    `"${name}"`,
    '-apple-system',
    'BlinkMacSystemFont',
    '"Segoe UI"',
    'Roboto',
    '"Helvetica Neue"',
    'Arial',
    'sans-serif',
    '"Apple Color Emoji"',
    '"Segoe UI Emoji"',
    '"Segoe UI Symbol"',
  ].join(',')

export const typographyDefinitions = {
    fontFamily: getFontFamily('Manrope'),
    htmlFontSize: 16,
    allVariants: {
        color: paletteDefinitions.text.primary,
    },
    h1: {
        fontSize: 56,
        lineHeight: 68 / 56,
        letterSpacing: 0,
    },
    h2: {
        fontSize: 36,
        lineHeight: 44 / 36,
        letterSpacing: 0,
    },
    h3: {
        fontSize: 24,
        lineHeight: 36 / 24,
        letterSpacing: 0,
    },
    h4: {
        fontSize: 18,
        lineHeight: 28 / 18,
        letterSpacing: 0,
    },
    h5: {
        fontSize: 16,
        lineHeight: 24 / 16,
        letterSpacing: 0,
    },
    body1: {
        fontSize: 18,
        lineHeight: 28 / 18,
        letterSpacing: 0,
    },
    body2: {
        fontSize: 16,
        lineHeight: 24 / 16,
        letterSpacing: 0,
    },
    body3: {
        fontSize: 14,
        lineHeight: 20 / 14,
        letterSpacing: 0,
    },
    label1: {
        fontSize: 18,
        lineHeight: 28 / 18,
        letterSpacing: 0,
    },
    label2: {
        fontSize: 16,
        lineHeight: 24 / 16,
        letterSpacing: 0
    },
    boldLabel: {
        fontSize: 16,
        lineHeight: 24 / 16,
        letterSpacing: 0,
        fontWeight: 'bold',
    },
    label3: {
        fontSize: 14,
        lineHeight: 20 / 14,
        letterSpacing: 0,
        fontWeight: 'bold'
    },
    label4: {
        fontSize: 12,
        lineHeight: 16 / 12,
        letterSpacing: 0,
    },
    label5: {
        fontSize: 11,
        lineHeight: 16 / 11,
        letterSpacing: 0,
        color: paletteDefinitions.text.secondary,
    },
    caption1: {
        fontSize: 18,
        lineHeight: 28 / 18,
        letterSpacing: 0,
        color: paletteDefinitions.text.tertiary,
    },
    caption2: {
        fontSize: 16,
        lineHeight: 24 / 16,
        letterSpacing: 0,
        color: paletteDefinitions.text.tertiary,
    },
    caption3: {
        fontSize: 14,
        lineHeight: 20 / 14,
        letterSpacing: 0,
        color: paletteDefinitions.text.tertiary,
    },
    helper: {
        fontSize: 12,
        lineHeight: 16 / 12,
        letterSpacing: 0,
        color: paletteDefinitions.text.tertiary,
    },
    button: {
        fontSize: 16,
        lineHeight: 24 / 16,
    },
}