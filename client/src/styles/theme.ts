import { createSystem, defaultConfig, defineConfig } from "@chakra-ui/react"
import { COLORS, FONT_SIZES, FONT_WEIGHTS, LINE_HEIGHTS, SPACING, RADII, SHADOWS, FONTS } from './designTokens'

const flattenObject = (obj: Record<string, unknown>, prefix = ''): Record<string, { value: string }> => {
  return Object.entries(obj).reduce((acc, [key, value]) => {
    const fullKey = prefix ? `${prefix}-${key}` : key;
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      Object.assign(acc, flattenObject(value as Record<string, unknown>, fullKey));
    } else {
      acc[fullKey] = { value: String(value) };
    }
    return acc;
  }, {} as Record<string, { value: string }>);
};

const config = defineConfig({
  globalCss: {
    "html, body": {
      margin: 0,
      padding: 0,
      fontFamily: FONTS.body,
      backgroundColor: COLORS.bg.base,
      color: COLORS.text.primary,
    },
    "*, *::before, *::after": { boxSizing: "border-box" },
    a: { color: "inherit", textDecoration: "none" },
    button: { cursor: "pointer", fontFamily: FONTS.body },
    "input, textarea, select": { fontFamily: FONTS.body },
  },
  theme: {
    tokens: {
      colors: flattenObject(COLORS),
      fonts: {
        body: { value: FONTS.body },
        heading: { value: FONTS.heading },
      },
      fontSizes: Object.fromEntries(
        Object.entries(FONT_SIZES).map(([k, v]) => [k, { value: v }])
      ),
      fontWeights: Object.fromEntries(
        Object.entries(FONT_WEIGHTS).map(([k, v]) => [k, { value: String(v) }])
      ),
      lineHeights: Object.fromEntries(
        Object.entries(LINE_HEIGHTS).map(([k, v]) => [k, { value: String(v) }])
      ),
      spacing: Object.fromEntries(
        Object.entries(SPACING).map(([k, v]) => [k, { value: v }])
      ),
      radii: Object.fromEntries(
        Object.entries(RADII).map(([k, v]) => [k, { value: v }])
      ),
      shadows: Object.fromEntries(
        Object.entries(SHADOWS).map(([k, v]) => [k, { value: v }])
      ),
    },
  },
})

export const system = createSystem(defaultConfig, config)
