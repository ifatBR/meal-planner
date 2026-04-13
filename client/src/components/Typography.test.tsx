import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithChakra as renderWithProviders } from '@/test/renderWithProviders'
import { PageTitle, SectionTitle, BodyText, Caption } from './Typography'
import { COLORS } from '@/styles/designTokens'

describe('Typography', () => {
  describe('PageTitle', () => {
    it('renders its children', () => {
      renderWithProviders(<PageTitle>My Page</PageTitle>)
      expect(screen.getByText('My Page')).toBeInTheDocument()
    })
  })

  describe('SectionTitle', () => {
    it('renders its children', () => {
      renderWithProviders(<SectionTitle>Section Header</SectionTitle>)
      expect(screen.getByText('Section Header')).toBeInTheDocument()
    })
  })

  describe('BodyText', () => {
    it('renders its children', () => {
      renderWithProviders(<BodyText>Some paragraph text</BodyText>)
      expect(screen.getByText('Some paragraph text')).toBeInTheDocument()
    })

    it('renders primary color by default', () => {
      renderWithProviders(<BodyText>Primary text</BodyText>)
      expect(screen.getByText('Primary text')).toHaveStyle({ color: COLORS.text.primary })
    })

    it('renders secondary color when secondary prop is true', () => {
      renderWithProviders(<BodyText secondary>Secondary text</BodyText>)
      expect(screen.getByText('Secondary text')).toHaveStyle({ color: COLORS.text.secondary })
    })
  })

  describe('Caption', () => {
    it('renders its children', () => {
      renderWithProviders(<Caption>Helper text</Caption>)
      expect(screen.getByText('Helper text')).toBeInTheDocument()
    })
  })
})
