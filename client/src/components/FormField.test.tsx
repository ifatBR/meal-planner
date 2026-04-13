import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithChakra as renderWithProviders } from '@/test/renderWithProviders'
import { FormField } from './FormField'

describe('FormField', () => {
  it('renders label', () => {
    renderWithProviders(
      <FormField label="Email"><input /></FormField>
    )
    expect(screen.getByText('Email')).toBeInTheDocument()
  })

  it('renders children', () => {
    renderWithProviders(
      <FormField label="Email"><input placeholder="Enter email" /></FormField>
    )
    expect(screen.getByPlaceholderText('Enter email')).toBeInTheDocument()
  })

  it('renders error message when error prop is provided', () => {
    renderWithProviders(
      <FormField label="Email" error="Invalid email"><input /></FormField>
    )
    expect(screen.getByRole('alert')).toHaveTextContent('Invalid email')
  })

  it('does not render error message when error prop is absent', () => {
    renderWithProviders(
      <FormField label="Email"><input /></FormField>
    )
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('renders required indicator when required is true', () => {
    renderWithProviders(
      <FormField label="Email" required><input /></FormField>
    )
    expect(screen.getByText('*')).toBeInTheDocument()
  })
})
