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

import { createTheme } from "@mui/material/styles";
import createPalette, { PaletteColorOptions } from "@mui/material/styles/createPalette";
import createTypography from "@mui/material/styles/createTypography";

import {paletteDefinitions} from './palette'
import {typographyDefinitions} from './typography'

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
    shadow?: string;
  }
  interface SimplePaletteColorOptions {
    shadow?: string;
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
  }

  interface TypographyVariants {
    body1: TextStyle;
    body2: TextStyle;
    body3: TextStyle;
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
  }

  interface TypographyVariantsOptions {
    body1: TextStyle;
    body2: TextStyle;
    body3: TextStyle;
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
  }
}

declare module '@mui/material/Typography' {
  interface TypographyPropsVariantOverrides {
    body1: true;
    body2: true;
    body3: true;
    label1: true;
    label2: true;
    label3: true;
    label4: true;
    label5: true;
    caption1: true;
    caption2: true;
    caption3: true;
    boldLabel: true;
    helper: true;
  }
}

const breakpoints = {
  xs: 0,
  sm: 375,
  md: 627,
  lg: 1056,
  xl: 1312,
}

const palette = createPalette(paletteDefinitions)

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
          props: { color: 'primary' },
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