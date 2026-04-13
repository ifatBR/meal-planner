import { Input as ChakraInput } from '@chakra-ui/react'
import type { InputProps as ChakraInputProps } from '@chakra-ui/react'
import { COLORS, RADII, FONT_SIZES, FONTS, SPACING } from '@/styles/designTokens'

interface InputProps extends ChakraInputProps {
  isError?: boolean
}

export function Input({ isError = false, style, ...rest }: InputProps) {
  const inputStyle: React.CSSProperties = {
    backgroundColor: COLORS.input.bg,
    border: `1px solid ${isError ? COLORS.input.borderError : COLORS.input.border}`,
    borderRadius: RADII.md,
    color: COLORS.input.color,
    fontFamily: FONTS.body,
    fontSize: FONT_SIZES.base,
    padding: `${SPACING[2]} ${SPACING[3]}`,
    outline: 'none',
    width: '100%',
    transition: 'border-color 0.15s ease',
    ...style,
  }

  return (
    <ChakraInput
      {...rest}
      style={inputStyle}
      onFocus={(e) => {
        e.currentTarget.style.borderColor = isError
          ? COLORS.input.borderError
          : COLORS.input.borderFocus
        rest.onFocus?.(e)
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = isError
          ? COLORS.input.borderError
          : COLORS.input.border
        rest.onBlur?.(e)
      }}
    />
  )
}
