import type { ReactNode } from 'react'
import { render } from '@testing-library/react'
import { ChakraProvider } from '@chakra-ui/react'
import { MemoryRouter } from 'react-router-dom'
import { system } from '@/styles/theme'
import { AuthProvider } from '@/context/AuthContext'

/** For pure UI components that don't need routing or auth. */
export function renderWithChakra(ui: ReactNode) {
  return render(<ChakraProvider value={system}>{ui}</ChakraProvider>)
}

/** For page-level components that need routing and auth context. */
export function renderWithProviders(ui: ReactNode) {
  return render(
    <ChakraProvider value={system}>
      <MemoryRouter>
        <AuthProvider>{ui}</AuthProvider>
      </MemoryRouter>
    </ChakraProvider>
  )
}
