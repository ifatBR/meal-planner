import { Button as ChakraButton, Spinner } from '@chakra-ui/react'
import type { ButtonProps as ChakraButtonProps } from '@chakra-ui/react'
import { COLORS, RADII, FONT_SIZES, FONT_WEIGHTS, SPACING } from '@/styles/designTokens'

interface ButtonProps extends Omit<ChakraButtonProps, 'variant'> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  isLoading?: boolean
}

const variantStyles: Record<NonNullable<ButtonProps['variant']>, React.CSSProperties> = {
  primary: {
    backgroundColor: COLORS.btn.primary.bg,
    color: COLORS.btn.primary.color,
  },
  secondary: {
    backgroundColor: COLORS.btn.secondary.bg,
    color: COLORS.btn.secondary.color,
    border: `1px solid ${COLORS.btn.secondary.border}`,
  },
  danger: {
    backgroundColor: COLORS.btn.danger.bg,
    color: COLORS.btn.danger.color,
  },
  ghost: {
    backgroundColor: 'transparent',
    color: COLORS.text.secondary,
  },
}

const variantHoverStyles: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary: COLORS.btn.primary.hoverBg,
  secondary: COLORS.btn.secondary.hoverBg,
  danger: COLORS.btn.danger.hoverBg,
  ghost: COLORS.bg.elevated,
}

export function Button({
  variant = 'primary',
  size,
  isLoading = false,
  disabled,
  children,
  style,
  onMouseEnter,
  onMouseLeave,
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || isLoading
  const isSm = size === 'sm'

  const baseStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING[1],
    fontFamily: 'inherit',
    fontSize: isSm ? FONT_SIZES.sm : FONT_SIZES.base,
    fontWeight: FONT_WEIGHTS.medium,
    borderRadius: isSm ? RADII.md : RADII.xl,
    padding: isSm ? `${SPACING[1]} ${SPACING[3]}` : `${SPACING[2]} ${SPACING[5]}`,
    cursor: isDisabled ? 'not-allowed' : 'pointer',
    border: 'none',
    transition: 'background-color 0.15s ease',
    ...(isDisabled
      ? { backgroundColor: COLORS.btn.disabled.bg, color: COLORS.btn.disabled.color }
      : variantStyles[variant]),
    ...style,
  }

  const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!isDisabled) {
      e.currentTarget.style.backgroundColor = variantHoverStyles[variant]
    }
    onMouseEnter?.(e)
  }

  const handleMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!isDisabled) {
      const base = variantStyles[variant]
      e.currentTarget.style.backgroundColor = base.backgroundColor ?? 'transparent'
    }
    onMouseLeave?.(e)
  }

  return (
    <ChakraButton
      {...rest}
      disabled={isDisabled}
      style={baseStyle}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {isLoading ? (
        <>
          <Spinner size="sm" />
          <span style={{ visibility: 'hidden', position: 'absolute' }}>{children}</span>
        </>
      ) : (
        children
      )}
    </ChakraButton>
  )
}
