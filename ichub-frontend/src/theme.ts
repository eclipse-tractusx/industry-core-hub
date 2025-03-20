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

import { createTheme } from '@mui/material/styles'
// Needs to use like this to overwrite data grid styles
// https://mui.com/components/data-grid/getting-started/#typescript
import createPalette, { PaletteColorOptions } from '@mui/material/styles/createPalette'
import createTypography from '@mui/material/styles/createTypography'

declare module '@mui/material/styles' {
  
  interface TypeBackground {
    background01: string;
    background02: string;
    background03: string;
  }

  interface TypeText {
    tertiary: string;
  }

  interface PaletteColor {
    shadow: string;
  }

  interface ColorType {
    main: string;
    contrastText: string;
  }
  
  interface TextStyle {
    fontSize: number;
    lineHeight: number;
    letterSpacing: number;
    fontWeight?: string;
    fontFamily?: string;
    color?: string;
  }
  
  interface Palette {
    border: {
      border01: string;
      border02: string;
      border03: string;
      border04: string;
    };

    danger: {
      danger: string;
      dangerHover: string;
      dangerBadge: string;
    };

    textField: {
      placeholderText: string;
      helperText: string;
      background: string;
      backgroundHover: string;
    };

    background: TypeBackground;

    primary: PaletteColor;
    
    pending: ColorType;
    confirmed: ColorType;
    declined: ColorType;
    label: ColorType;
    deleted: ColorType;

    text: TypeText;

    chip: {
      release: string;
      active: string;
      inactive: string;
      created: string;
      inReview: string;
      enabled: string;
      default: string;
      bgRelease: string;
      bgActive: string;
      bgInactive: string;
      bgCreated: string;
      bgInReview: string;
      bgEnabled: string;
      bgDefault: string;
      warning: string;
      registered: string;
      bgRegistered: string;
      borderDraft: string;
      black: string;
      none: string;
    };

    typography: {
      label1: TextStyle;
      label2: TextStyle;
      label3: TextStyle;
      label4: TextStyle;
      label5: TextStyle;
      caption1: TextStyle;
      caption2: TextStyle;
      caption3: TextStyle;
      boldLabel: TextStyle;
      helper: TextStyle;
    };
  }

  interface PaletteOptions {
    border?: {
      border01?: string;
      border02?: string;
      border03?: string;
      border04?: string;
    };

    danger: {
      danger?: string;
      dangerHover?: string;
      dangerBadge?: string;
    };

    textField: {
      placeholderText?: string;
      helperText?: string;
      background?: string;
      backgroundHover?: string;
    };

    background?:  Partial<TypeBackground>;

    primary?: PaletteColorOptions;

    pending?: ColorType;
    confirmed?: ColorType;
    declined?: ColorType;
    label?: ColorType;
    deleted?: ColorType;

    text?: Partial<TypeText>;

    chip: {
      release: string;
      active: string;
      inactive: string;
      created: string;
      inReview: string;
      enabled: string;
      default: string;
      bgRelease: string;
      bgActive: string;
      bgInactive: string;
      bgCreated: string;
      bgInReview: string;
      bgEnabled: string;
      bgDefault: string;
      warning: string;
      registered: string;
      bgRegistered: string;
      borderDraft: string;
      black: string;
      none: string;
    };
    
    typography: {
      label1: TextStyle;
      label2: TextStyle;
      label3: TextStyle;
      label4: TextStyle;
      label5: TextStyle;
      caption1: TextStyle;
      caption2: TextStyle;
      caption3: TextStyle;
      boldLabel: TextStyle;
      helper: TextStyle;
    };
  }
}

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

const breakpoints = {
  xs: 0,
  sm: 375,
  md: 627,
  lg: 1056,
  xl: 1312,
}

export const paletteDefinitions = {
  common: {
    white: '#fff',
    black: '#000',
  },
  primary: {
    main: 'rgb(1,32,96)',
    dark: 'black',
    contrastText: '#fff',
    shadow: 'rgba(15, 113, 203, 0.4)',
  },
  secondary: {
    main: '#eaf1fe',
    dark: '#d4e3fe',
    contrastText: '#0f71cb',
  },
  brand: {
    brand01: '#FFA600',
    brand02: '#B3CB2D',
  },
  action: {
    active: '#939393',
    disabled: '#ADADAD',
    disabledBackground: '#EAEAEA',
  },
  danger: {
    danger: '#D91E18',
    dangerHover: '#E5231D',
    dangerBadge: '#FB6540',
  },
  support: {
    success: '#00AA55',
    error: '#D91E18',
    info: '#676BC6',
    warning: '#FFA600',
  },
  success: {
    main: '#00aa55',
  },
  icon: {  // not used
    icon01: '#939393',
    icon02: '#B6B6B6',
    icon03: '#333333',
  },
  border: {
    border01: '#DCDCDC',
    border02: '#B6B6B6',
    border03: '#989898',
    border04: '#0F71CB',
  },
  chip: {
    release: '#0D61AE',
    active: '#88982D',
    inactive: '#D91E18',
    created: '#8f8013',
    inReview: '#8f8013',
    enabled: '#007877',
    default: '#888888',
    bgRelease: '#EAF1FE',
    bgActive: '#F0F5D5',
    bgInactive: '#FFF7FF',
    bgCreated: '#f5efd5',
    bgInReview: '#f5efd5',
    bgEnabled: '#DEEEEF',
    bgDefault: '#c7c5c5',
    warning: '#FFA600',
    registered: 'rgb(255, 255, 255)',
    bgRegistered: '2px solid rgba(40, 104, 255, 1)',
    borderDraft: '1px solid rgba(246, 246, 246, 0.66)',
    black: "#000000",
    none: 'none'
  },
  stepper: {
    stepDone: '#B3CB2D',
    stepCurrent: '#FFA600',
    stepUpcoming: '#EAEAEA',
  },
  background: {
    background01: '#F9F9F9',
    background03: '#E9E9E9',
  },
  textField: {
    placeholderText: '#8D8D8D',
    helperText: '#717171',
    background: '#F7F7F7',
    backgroundHover: '#ECECEC',
  },
  text: {
    primary: '#111111',
    secondary: '#252525',
    tertiary: '#888888',
    quaternary: '#A2A2A2',
  },
  accent: { // not used
    accent01: '#4D73D5',
    accent02: '#F2F3FB',
    accent03: '#676BC6',
    accent04: '#E1F1FF',
    accent05: '#FFEBCC',
    accent06: '#5E3416',
    accent07: '#88982D',
    accent08: '#F0F5D5',
    accent09: '#FDB943',
    accent10: '#428C5B',
    accent11: '#337B89',
    accent12: '#2B4078',
  },
  selected: { // not used
    hover: 'rgba(15, 113, 203, 0.05)',
    focus: 'rgba(15, 113, 203, 0.15)',
    active: 'rgba(15, 113, 203, 0.2)',
  },
  pending: {
    main: '#FFECBD',
    contrastText: '#975B27',
  },
  confirmed: {
    main: '#ffffff',
    contrastText: '#ffffff',
  },
  declined: {
    main: '#FEE7E2',
    contrastText: '#FF532F',
  },
  label: {
    main: '#F2F3FB',
    contrastText: '#676BC6',
  },
  deleted: {
    main: '#eaeaea',
    contrastText: '#adadad',
  },
  info: {
    main: '#F2F3FB',
    contrastText: '#676BC6',
  },
  warning: {
    main: '#ffa602',
    contrastText: '#ffff',
  },
  buttons: {
    darkGrey: '#e1e1e1',
    lightGrey: '#f3f3f3',
    white: '#f9f9f9',
    yellow: '#f5f9ee',
  },
  typography: {}
}

const palette = createPalette(paletteDefinitions)

export const typographyDefinitions = {
  fontFamily: getFontFamily('Manrope'),
  htmlFontSize: 16,
  allVariants: {
    color: palette.text.primary,
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
    color: palette.text.secondary,
  },
  caption1: {
    fontSize: 18,
    lineHeight: 28 / 18,
    letterSpacing: 0,
    color: palette.text.tertiary,
  },
  caption2: {
    fontSize: 16,
    lineHeight: 24 / 16,
    letterSpacing: 0,
    color: palette.text.tertiary,
  },
  caption3: {
    fontSize: 14,
    lineHeight: 20 / 14,
    letterSpacing: 0,
    color: palette.text.tertiary,
  },
  helper: {
    fontSize: 12,
    lineHeight: 16 / 12,
    letterSpacing: 0,
    color: palette.text.tertiary,
  },
  button: {
    fontSize: 16,
    lineHeight: 24 / 16,
  },
}

const typography = createTypography(palette, typographyDefinitions)

export const theme = createTheme({
  breakpoints: {
    values: breakpoints,
  },
  palette,
  typography,
  shape: {
    borderRadius: 4,
  },
  components: {
    MuiButtonBase: {
      defaultProps: {
        disableRipple: true,
      },
      styleOverrides: {
        root: {
          ':focus': {
            boxShadow: `0px 0px 0px 3px ${palette.primary.shadow}`,
          },
          ':active': {
            boxShadow: `0px 0px 0px 3px ${palette.primary.shadow}`,
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 50,
          boxShadow: 'none',
          fontSize: typography.body1.fontSize,
          padding: '16px 28px',
          ':hover': {
            boxShadow: 'none',
          },
          ':active, :focus': {
            boxShadow: `0px 0px 0px 3px ${palette.primary.shadow}`,
          },
        },
        sizeMedium: {
          padding: '14px 24px',
        },
        sizeSmall: {
          fontSize: typography.body3.fontSize,
          padding: '10px 18px',
        },
        outlined: {
          borderColor: palette.primary.main,
          borderWidth: 2,
          padding: '14px 26px',
          ':hover': {
            color: palette.primary.dark,
            borderColor: palette.primary.dark,
            borderWidth: 2,
            backgroundColor: 'transparent',
          },
          ':disabled': {
            borderColor: palette.action.disabled,
            borderWidth: 2,
          },
        },
        outlinedSizeMedium: {
          padding: '12px 22px',
        },
        outlinedSizeSmall: {
          padding: '8px 16px',
        },
        text: {
          ':hover': {
            backgroundColor: palette.secondary.dark,
          },
        },
      },
      variants: [
        {
          props: {
            color: 'secondary',
          },
          style: {
            ':hover': {
              color: palette.primary.dark,
            },
          },
        },
      ],
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          color: palette.primary.main,
          padding: 6,
          ':hover': {
            backgroundColor: palette.secondary.dark,
            color: palette.primary.dark,
          },
        },
      },
      variants: [
        {
          props: {
            color: 'primary',
          },
          style: {
            backgroundColor: palette.primary.main,
            color: palette.common.white,
            ':hover': {
              backgroundColor: palette.primary.dark,
              color: palette.common.white,
            },
          },
        },
        {
          props: {
            color: 'secondary',
          },
          style: {
            backgroundColor: palette.secondary.main,
          },
        },
        {
          props: {
            size: 'small',
          },
          style: {
            padding: 2,
          },
        },
      ],
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          backgroundColor: palette.background.background01,
          padding: '4px 24px',
          '.MuiOutlinedInput-notchedOutline': {
            borderColor: palette.border.border01,
          },
          ':hover': {
            '.MuiOutlinedInput-notchedOutline': {
              borderColor: palette.primary.shadow,
            },
          },
          '&.Mui-focused': {
            '.MuiOutlinedInput-notchedOutline': {
              borderColor: palette.primary.shadow,
            },
          },
        },
      },
    },
    MuiFilledInput: {
      styleOverrides: {
        root: {
          backgroundColor: palette.textField.background,
          borderRadius: '6px 6px 0 0',
          fontSize: typography.body2.fontSize,
          '.MuiFilledInput-input': {
            padding: '16px',
          },
          '&.Mui-focused': {
            backgroundColor: palette.textField.backgroundHover,
          },
          '&.Mui-disabled': {
            backgroundColor: palette.textField.background,
          },
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          fontFamily: typography.label3.fontFamily,
          fontSize: typography.label3.fontSize,
        },
      },
      variants: [
        {
          props: {
            variant: 'filled',
          },
          style: {
            transform: 'none',
            position: 'relative',
          },
        },
      ],
    },
    MuiBadge: {
      styleOverrides: {
        root: {
          color: palette.common.white,
        },
      },
    },
    MuiDataGrid: {
      styleOverrides: {
        root: {
          border: `1px solid ${palette.border.border01}`,
          borderRadius: 24,
          overflow: 'hidden',
        },
        columnHeaders: {
          backgroundColor: palette.background.background03,
        },
        columnHeader: {
          padding: '0 32px',
        },
        columnSeparator: {
          display: 'none',
        },
        row: {
          '&.MuiDataGrid-row--lastVisible .MuiDataGrid-cell': {
            borderColor: palette.border.border01,
          },
        },
        cell: {
          padding: '16px 32px',
          borderColor: palette.border.border01,
        },
        columnHeaderCheckbox: {
          width: '64px !important',
          minWidth: '64px !important',
          maxWidth: '64px !important',
          paddingLeft: '10px !important',
          paddingRight: '10px !important',
          height: '76px !important',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: '8px',
        },
      },
      variants: [
        {
          props: {
            color: 'pending',
          },
          style: {
            backgroundColor: palette.pending.main,
            color: palette.pending.contrastText,
          },
        },
        {
          props: {
            color: 'confirmed',
          },
          style: {
            backgroundColor: palette.confirmed.main,
            color: palette.confirmed.contrastText,
          },
        },
        {
          props: {
            color: 'declined',
          },
          style: {
            backgroundColor: palette.declined.main,
            color: palette.declined.contrastText,
          },
        },
        {
          props: {
            color: 'info',
          },
          style: {
            backgroundColor: palette.info.main,
            color: palette.info.contrastText,
          },
        },
        {
          props: {
            color: 'label',
          },
          style: {
            backgroundColor: palette.label.main,
            color: palette.label.contrastText,
          },
        },
        {
          props: {
            color: 'registered',
          },
          style: {
            backgroundColor: palette.label.main,
            color: palette.label.contrastText,
          },
        },
      ],
    },
    MuiLink: {
      styleOverrides: {
        root: {
          fontFamily: typography.body1.fontFamily,
          textDecoration: 'none',
          ':hover': {
            color: palette.primary.dark,
          },
        },
      },
    },
    MuiList: {
      styleOverrides: {
        root: {
          fontFamily: typography.label3.fontFamily,
          fontSize: typography.label3.fontSize,
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 40,
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          fontFamily: typography.h4.fontFamily,
          fontSize: typography.h4.fontSize,
          padding: 0,
        },
      },
    },
    MuiDialogActions: {
      styleOverrides: {
        root: {
          padding: 0,
          justifyContent: 'center',
          '& .MuiButton-root:not(:first-of-type)': {
            marginLeft: 24,
          },
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          justifyContent: 'start',
          color: 'text.primary',
          '&:active, &:focus': {
            boxShadow: 'none',
          },
        },
      },
    },
    MuiFormControlLabel: {
      styleOverrides: {
        root: {
          '.MuiFormControlLabel-label': {
            fontFamily: typography.label2.fontFamily,
            fontSize: typography.label2.fontSize,
          },
        },
      },
    },
    MuiCircularProgress: {
      styleOverrides: {
        circle: {
          strokeLinecap: 'butt',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: '6px',
          '.MuiCalendarPicker-viewTransitionContainer': {
            borderTop: `1px solid ${palette.border.border01}`,
            '.MuiTypography-root': {
              fontWeight: 'bold',
              fontSize: '14px',
            },
          },
          '.MuiIconButton-root': {
            color: '#939393',
          },
          '.PrivatePickersFadeTransitionGroup-root': {
            fontWeight: 'bold',
            fontSize: '16px',
          },
          '.MuiFilledInput-root': {
            paddingTop: '0px !important',
            minHeight: '55px',
          },
        },
      },
    },
    MuiSvgIcon: {
      variants: [
        {
          props: { color: 'default' },
          style: { color: palette.text.primary },
        },
        {
          props: { color: 'error' },
          style: { color: palette.danger.danger },
        },
        {
          props: { color: 'success' },
          style: { color: palette.success.main },
        },
        {
          props: { color: 'warning' },
          style: { color: palette.warning.main },
        },
        {
          props: { fontSize: '8' },
          style: { fontSize: typography.pxToRem(8) },
        },
        {
          props: { fontSize: '10' },
          style: { fontSize: typography.pxToRem(10) },
        },
        {
          props: { fontSize: '12' },
          style: { fontSize: typography.pxToRem(12) },
        },
        {
          props: { fontSize: '14' },
          style: { fontSize: typography.pxToRem(14) },
        },
        {
          props: { fontSize: '16' },
          style: { fontSize: typography.pxToRem(16) },
        },
        {
          props: { fontSize: '18' },
          style: { fontSize: typography.pxToRem(18) },
        },
        {
          props: { fontSize: '20' },
          style: { fontSize: typography.pxToRem(20) },
        },
      ],
    },
    MuiTabs: {
      styleOverrides: {
        root: {
          paddingTop: '50px',
          minWidth: 'fit-content',
          '.MuiTab-textColorPrimary': {
            minHeight: '50px',
            alignItems: 'flex-start',
            color: palette.text.tertiary,
            paddingRight: '50px',
          },
          '.MuiTabs-indicator': {
            backgroundColor: palette.common.white,
          },
        },
      },
    },
  },
})