import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { ChakraProvider } from '@chakra-ui/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { system } from '@/styles/theme';
import * as authHook from '@/hooks/useAuth';
import * as authApi from '@/api/auth';
import { routeConfig } from './index';

vi.mock('@/api/auth');
vi.mock('@/hooks/useAuth');

const mockUser = {
  id: '1',
  email: 'a@b.com',
  role: 'admin',
  userName: 'auser',
  firstName: 'A',
  lastName: 'B',
};

function renderAt(initialPath: string) {
  const testRouter = createMemoryRouter(routeConfig, { initialEntries: [initialPath] });
  return render(
    <ChakraProvider value={system}>
      <RouterProvider router={testRouter} />
    </ChakraProvider>
  );
}

beforeEach(() => {
  vi.mocked(authApi.refreshToken).mockRejectedValue(new Error('no session'));
  vi.mocked(authApi.login).mockResolvedValue({ user: mockUser, accessToken: 'tok' });
  vi.mocked(authApi.logout).mockResolvedValue(undefined);
  vi.mocked(authApi.getMe).mockResolvedValue(mockUser);
});

describe('router', () => {
  it('redirects / to /schedules when authenticated', async () => {
    vi.mocked(authHook.useAuth).mockReturnValue({
      user: mockUser,
      accessToken: 'tok',
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
    });

    renderAt('/');

    await waitFor(() => {
      // The Schedules placeholder renders inside <main> — sidebar also shows "Schedules" label
      expect(screen.getAllByText('Schedules').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByRole('main')).toHaveTextContent('Schedules');
    });
  });

  it('renders LoginPage at /login when unauthenticated', async () => {
    vi.mocked(authHook.useAuth).mockReturnValue({
      user: null,
      accessToken: null,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
    });

    renderAt('/login');

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });
  });

  it('redirects /login to /schedules when authenticated', async () => {
    vi.mocked(authHook.useAuth).mockReturnValue({
      user: mockUser,
      accessToken: 'tok',
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
    });

    renderAt('/login');

    await waitFor(() => {
      expect(screen.getByRole('main')).toHaveTextContent('Schedules');
    });
  });

  it('redirects /library to /login when unauthenticated', async () => {
    vi.mocked(authHook.useAuth).mockReturnValue({
      user: null,
      accessToken: null,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
    });

    renderAt('/library');

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });
  });
});
