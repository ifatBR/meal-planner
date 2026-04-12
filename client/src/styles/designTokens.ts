export const COLORS = {
  primary: {
    default: '#02472E',
    hover: '#03603d',
    light: '#E8F5E0',
  },
  secondary: {
    default: '#45C9B2',
    hover: '#35b09b',
    light: '#E0F7F4',
  },
  highlight: {
    default: '#AEE553',
    dark: '#48C96D',
  },
  palette: {
    1: '#AEE553',
    2: '#45C9B2',
    3: '#FF6B6B',
    4: '#FFD93D',
    5: '#C77DFF',
    6: '#48C96D',
    7: '#4FC3F7',
    8: '#F48FB1',
  },
  bg: {
    base: '#F8F8F8',
    surface: '#FFFFFF',
    elevated: '#FFFFFF',
  },
  text: {
    primary: '#1A1A1A',
    secondary: '#6B6B6B',
    tertiary: '#9E9E9E',
    inverse: '#FFFFFF',
  },
  border: {
    default: '#EEEEEE',
    strong: '#DDDDDD',
  },
  semantic: {
    error: '#FF6B6B',
    warning: '#FFD93D',
    success: '#48C96D',
    info: '#4FC3F7',
    errorBg: '#FFF0F0',
    warningBg: '#FFFBEB',
    successBg: '#F0FFF4',
    infoBg: '#F0F9FF',
  },
  sidebar: {
    bg: '#FFFFFF',
    itemActiveBg: '#AEE553',
    itemActiveColor: '#02472E',
    itemColor: '#6B6B6B',
    itemHoverBg: '#F5F5F5',
  },
  btn: {
    primary: { bg: '#02472E', color: '#FFFFFF', hoverBg: '#03603d' },
    secondary: { bg: 'transparent', color: '#02472E', border: '#02472E', hoverBg: '#E8F5E0' },
    danger: { bg: '#FF6B6B', color: '#FFFFFF', hoverBg: '#ff5252' },
    disabled: { bg: '#EEEEEE', color: '#9E9E9E' },
  },
  input: {
    bg: '#FFFFFF',
    border: '#DDDDDD',
    borderFocus: '#02472E',
    borderError: '#FF6B6B',
    color: '#1A1A1A',
    placeholder: '#9E9E9E',
  },
} as const;

export const FONTS = {
  body: "'Poppins', sans-serif",
  heading: "'Poppins', sans-serif",
} as const;

export const FONT_SIZES = {
  xs: '11px',
  sm: '12px',
  md: '13px',
  base: '14px',
  lg: '16px',
  xl: '18px',
  '2xl': '22px',
  '3xl': '28px',
  '4xl': '36px',
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
  1: '4px',
  2: '8px',
  3: '12px',
  4: '16px',
  5: '20px',
  6: '24px',
  8: '32px',
  10: '40px',
  12: '48px',
  16: '64px',
} as const;

export const RADII = {
  sm: '6px',
  md: '8px',
  lg: '12px',
  xl: '14px',
  full: '9999px',
} as const;

export const SHADOWS = {
  sm: '0 1px 2px rgba(0,0,0,0.06)',
  md: '0 2px 8px rgba(0,0,0,0.08)',
  lg: '0 4px 16px rgba(0,0,0,0.10)',
  sidebar: '1px 0 2px rgba(0,0,0,0.06)',
} as const;

export const SIDEBAR = {
  widthCollapsed: '56px',
  widthExpanded: '220px',
} as const;
