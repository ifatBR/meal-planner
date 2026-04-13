import { describe, it, expect, vi } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { renderWithChakra as renderWithProviders } from '@/test/renderWithProviders'
import { Input } from './Input'
import { COLORS } from '@/styles/designTokens'

describe('Input', () => {
  it('renders with placeholder', () => {
    renderWithProviders(<Input placeholder="Enter text" />)
    expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument()
  })

  it('calls onChange when typed into', () => {
    const handleChange = vi.fn()
    renderWithProviders(<Input onChange={handleChange} />)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'hello' } })
    expect(handleChange).toHaveBeenCalledTimes(1)
  })

  it('applies normal border color when isError is false', () => {
    renderWithProviders(<Input />)
    expect(screen.getByRole('textbox')).toHaveStyle({ borderColor: COLORS.input.border })
  })

  it('applies error border color when isError is true', () => {
    renderWithProviders(<Input isError />)
    expect(screen.getByRole('textbox')).toHaveStyle({ borderColor: COLORS.input.borderError })
  })
})
