import type { ReactNode } from 'react'
import { Box, Flex, Text } from '@chakra-ui/react'
import { COLORS, FONT_SIZES, FONT_WEIGHTS, SPACING } from '@/styles/designTokens'

interface FormFieldProps {
  label: string
  error?: string
  required?: boolean
  children: ReactNode
}

export function FormField({ label, error, required = false, children }: FormFieldProps) {
  return (
    <Flex direction="column" gap={SPACING[1]}>
      <Box
        as="label"
        fontSize={FONT_SIZES.sm}
        fontWeight={FONT_WEIGHTS.medium}
        color={COLORS.text.primary}
      >
        {label}
        {required && (
          <Box as="span" aria-hidden="true" color={COLORS.semantic.error} ml={SPACING[1]}>
            *
          </Box>
        )}
      </Box>
      {children}
      {error && (
        <Text
          role="alert"
          fontSize={FONT_SIZES.sm}
          color={COLORS.semantic.error}
        >
          {error}
        </Text>
      )}
    </Flex>
  )
}
