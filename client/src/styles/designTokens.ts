const _green900 = "#02472E";
const _green700 = "#03603d";
const _green100 = "#E8F5E0";
const _teal400 = "#45C9B2";
const _teal300 = "#35b09b";
const _teal100 = "#E0F7F4";
const _lime600 = "#48C96D";
const _lime400 = "#AEE553";
const _lime200 = "#cff690";
const _red400 = "#FF6B6B";
const _red300 = "#ff5252";
const _yellow400 = "#FFD93D";
const _purple400 = "#C77DFF";
const _cyan400 = "#4FC3F7";
const _pink400 = "#F48FB1";
const _white = "#FFFFFF";
const _gray50 = "#F8F8F8";
const _gray100 = "#F5F5F5";
const _gray200 = "#EEEEEE";
const _gray300 = "#DDDDDD";
const _gray500 = "#9E9E9E";
const _gray600 = "#6B6B6B";
const _gray900 = "#1A1A1A";

export const COLORS = {
  primary: {
    default: _green900,
    hover: _green700,
    light: _green100,
  },
  secondary: {
    default: _teal400,
    hover: _teal300,
    light: _teal100,
  },
  highlight: {
    dark: _lime600,
    default: _lime400,
    secondary: _lime200,
    tertiary: _teal100,
  },
  palette: {
    1: _teal400,
    2: _red400,
    3: _yellow400,
    4: _purple400,
    5: _lime600,
    6: _cyan400,
    7: _pink400,
  },
  bg: {
    base: _gray50,
    surface: _white,
    elevated: _white,
  },
  text: {
    primary: _gray900,
    secondary: _gray600,
    tertiary: _gray500,
    inverse: _white,
  },
  border: {
    default: _gray200,
    strong: _gray300,
  },
  semantic: {
    error: _red400,
    warning: _yellow400,
    success: _lime600,
    info: _cyan400,
    errorBg: "#FFF0F0",
    warningBg: "#FFFBEB",
    successBg: "#F0FFF4",
    infoBg: "#F0F9FF",
  },
  sidebar: {
    bg: _white,
    itemActiveBg: _lime400,
    itemActiveColor: _green900,
    itemColor: _gray600,
    itemHoverBg: _gray100,
  },
  btn: {
    primary: { bg: _green900, color: _white, hoverBg: _green700 },
    secondary: {
      bg: "transparent",
      color: _green900,
      border: _green900,
      hoverBg: _green100,
    },
    danger: { bg: _red400, color: _white, hoverBg: _red300 },
    disabled: { bg: _gray200, color: _gray500 },
  },
  input: {
    bg: _white,
    border: _gray300,
    borderFocus: _green900,
    borderError: _red400,
    color: _gray900,
    placeholder: _gray500,
  },
} as const;

export const FONTS = {
  body: "'Poppins', sans-serif",
  heading: "'Poppins', sans-serif",
} as const;

export const FONT_SIZES = {
  xs: "11px",
  sm: "12px",
  md: "13px",
  base: "14px",
  lg: "16px",
  xl: "18px",
  "2xl": "22px",
  "3xl": "28px",
  "4xl": "36px",
} as const;

export const FONT_WEIGHTS = {
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
} as const;

export const LINE_HEIGHTS = {
  tight: 1.3,
  normal: 1.5,
  relaxed: 1.7,
} as const;

export const SPACING = {
  1: "4px",
  2: "8px",
  3: "12px",
  4: "16px",
  5: "20px",
  6: "24px",
  8: "32px",
  10: "40px",
  12: "48px",
  16: "64px",
} as const;

export const RADII = {
  sm: "6px",
  md: "8px",
  lg: "12px",
  xl: "14px",
  full: "9999px",
} as const;

export const SHADOWS = {
  sm: "0 1px 2px rgba(0,0,0,0.06)",
  md: "0 2px 8px rgba(0,0,0,0.08)",
  lg: "0 4px 16px rgba(0,0,0,0.10)",
  sidebar: "1px 0 2px rgba(0,0,0,0.06)",
} as const;

export const SIDEBAR = {
  widthCollapsed: "56px",
  widthExpanded: "220px",
} as const;

export const BORDER_WIDTHS = {
  none: "0px",
  sm: "1px",
  md: "2px",
  lg: "4px",
} as const;

export const ICON_SIZES = {
  xxs: 5,
  xs: 14,
  sm: 16,
  md: 20,
  lg: 24,
} as const;

export const Z_INDEX = {
  sidebar: 100,
  modal: 200,
  toast: 9999,
} as const;
