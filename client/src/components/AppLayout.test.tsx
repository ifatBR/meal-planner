import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { system } from '@/styles/theme';
import { AppLayout } from './AppLayout';
import { SIDEBAR } from '@/styles/designTokens';

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: '1', email: 'test@example.com', firstName: 'Test', lastName: 'User', userName: 'testuser', role: 'user' },
    accessToken: 'token',
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
  }),
}));

function renderAppLayout(childContent = 'Page content') {
  const router = createMemoryRouter([
    {
      path: '/',
      element: <AppLayout />,
      children: [{ index: true, element: <div>{childContent}</div> }],
    },
  ]);
  return render(
    <ChakraProvider value={system}>
      <RouterProvider router={router} />
    </ChakraProvider>
  );
}

describe('AppLayout', () => {
  it('renders the sidebar', () => {
    renderAppLayout();
    expect(screen.getByRole('navigation')).toBeInTheDocument();
  });

  it('renders Outlet child content', () => {
    renderAppLayout('Hello from outlet');
    expect(screen.getByText('Hello from outlet')).toBeInTheDocument();
  });

  it('sidebar starts expanded', () => {
    renderAppLayout();
    expect(screen.getByRole('navigation')).toHaveStyle({ width: SIDEBAR.widthExpanded });
  });

  it('collapses sidebar when toggle button is clicked', async () => {
    const user = userEvent.setup();
    renderAppLayout();

    const nav = screen.getByRole('navigation');
    expect(nav).toHaveStyle({ width: SIDEBAR.widthExpanded });

    await user.click(screen.getByRole('button', { name: /collapse sidebar/i }));

    expect(nav).toHaveStyle({ width: SIDEBAR.widthCollapsed });
  });

  it('expands sidebar again after second toggle click', async () => {
    const user = userEvent.setup();
    renderAppLayout();

    await user.click(screen.getByRole('button', { name: /collapse sidebar/i }));
    await user.click(screen.getByRole('button', { name: /expand sidebar/i }));

    expect(screen.getByRole('navigation')).toHaveStyle({ width: SIDEBAR.widthExpanded });
  });
});
