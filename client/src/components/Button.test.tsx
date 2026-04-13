import { describe, it, expect, vi } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { renderWithChakra as renderWithProviders } from '@/test/renderWithProviders'
import { Button } from './Button'
import { COLORS } from '@/styles/designTokens'

describe('Button', () => {
  it('renders with correct text', () => {
    renderWithProviders(<Button>Click me</Button>)
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument()
  })

  it('calls onClick when clicked', () => {
    const handleClick = vi.fn()
    renderWithProviders(<Button onClick={handleClick}>Click me</Button>)
    fireEvent.click(screen.getByRole('button'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('does not call onClick when disabled', () => {
    const handleClick = vi.fn()
    renderWithProviders(<Button disabled onClick={handleClick}>Click me</Button>)
    fireEvent.click(screen.getByRole('button'))
    expect(handleClick).not.toHaveBeenCalled()
  })

  it('shows spinner and disables button when isLoading is true', () => {
    renderWithProviders(<Button isLoading>Submit</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('applies correct styles for primary variant', () => {
    renderWithProviders(<Button variant="primary">Primary</Button>)
    expect(screen.getByRole('button')).toHaveStyle({ backgroundColor: COLORS.btn.primary.bg })
  })

  it('applies correct styles for secondary variant', () => {
    renderWithProviders(<Button variant="secondary">Secondary</Button>)
    expect(screen.getByRole('button')).toHaveStyle({ color: COLORS.btn.secondary.color })
  })

  it('applies correct styles for danger variant', () => {
    renderWithProviders(<Button variant="danger">Danger</Button>)
    expect(screen.getByRole('button')).toHaveStyle({ backgroundColor: COLORS.btn.danger.bg })
  })

  it('applies correct styles for ghost variant', () => {
    renderWithProviders(<Button variant="ghost">Ghost</Button>)
    expect(screen.getByRole('button')).toHaveStyle({ color: COLORS.text.secondary })
  })
})
