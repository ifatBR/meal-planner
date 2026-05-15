import { describe, it, expect, vi, beforeAll } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithChakra } from '@/test/renderWithProviders'
import { Button } from './Button'
import { COLORS } from '@/styles/designTokens'

beforeAll(() => {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
})

describe('Button', () => {
  it('renders children', () => {
    renderWithChakra(<Button>Save</Button>)
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument()
  })

  it('calls onClick when clicked', async () => {
    const onClick = vi.fn()
    const user = userEvent.setup()
    renderWithChakra(<Button onClick={onClick}>Save</Button>)
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('does not call onClick when disabled', async () => {
    const onClick = vi.fn()
    const user = userEvent.setup()
    renderWithChakra(<Button onClick={onClick} disabled>Save</Button>)
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(onClick).not.toHaveBeenCalled()
  })

  it('is disabled when isLoading', () => {
    renderWithChakra(<Button isLoading>Save</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('does not call onClick when isLoading', async () => {
    const onClick = vi.fn()
    const user = userEvent.setup()
    renderWithChakra(<Button onClick={onClick} isLoading>Save</Button>)
    await user.click(screen.getByRole('button'))
    expect(onClick).not.toHaveBeenCalled()
  })

  it('applies primary variant background by default', () => {
    renderWithChakra(<Button>Save</Button>)
    expect(screen.getByRole('button', { name: 'Save' })).toHaveStyle({
      backgroundColor: COLORS.btn.primary.bg,
    })
  })

  it('applies secondary variant styles', () => {
    renderWithChakra(<Button variant="secondary">Cancel</Button>)
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveStyle({
      border: `1px solid ${COLORS.btn.secondary.border}`,
    })
  })

  it('applies danger variant styles', () => {
    renderWithChakra(<Button variant="danger">Delete</Button>)
    expect(screen.getByRole('button', { name: 'Delete' })).toHaveStyle({
      backgroundColor: COLORS.btn.danger.bg,
    })
  })

  it('applies ghost variant styles', () => {
    renderWithChakra(<Button variant="ghost">More</Button>)
    expect(screen.getByRole('button', { name: 'More' })).toHaveStyle({
      color: COLORS.text.secondary,
    })
  })

  it('applies disabled styles when disabled', () => {
    renderWithChakra(<Button disabled>Save</Button>)
    expect(screen.getByRole('button', { name: 'Save' })).toHaveStyle({
      backgroundColor: COLORS.btn.disabled.bg,
      cursor: 'not-allowed',
    })
  })

  it('shows tooltip on hover when tooltip prop is provided', async () => {
    const user = userEvent.setup()
    renderWithChakra(<Button tooltip="Save your work">Save</Button>)
    await user.hover(screen.getByRole('button', { name: 'Save' }))
    expect(await screen.findByText('Save your work')).toBeInTheDocument()
  })
})
