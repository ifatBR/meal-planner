import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/renderWithProviders';
import { LoginPage } from './LoginPage';
import * as authApi from '@/api/auth';

vi.mock('@/api/auth');

// Mock react-router-dom navigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => mockNavigate };
});

const mockUser = {
  id: '1',
  email: 'a@b.com',
  role: 'admin',
  userName: 'auser',
  firstName: 'A',
  lastName: 'B',
};

beforeEach(() => {
  vi.resetAllMocks();
  // Default: refresh fails → unauthenticated state
  vi.mocked(authApi.refreshToken).mockRejectedValue(new Error('no session'));
});

describe('LoginPage', () => {
  it('renders email and password fields', async () => {
    renderWithProviders(<LoginPage />);
    await waitFor(() => {
      expect(screen.getByPlaceholderText('you@example.com')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();
    });
  });

  it('renders submit button', async () => {
    renderWithProviders(<LoginPage />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });
  });

  it('shows error message on failed login', async () => {
    vi.mocked(authApi.login).mockRejectedValue({ message: 'Unauthorized' });
    const user = userEvent.setup();

    renderWithProviders(<LoginPage />);

    await user.type(await screen.findByPlaceholderText('you@example.com'), 'a@b.com');
    await user.type(screen.getByPlaceholderText('••••••••'), 'wrongpassword');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText(/invalid email or password/i)).toBeInTheDocument();
    });
  });

  it('redirects to schedules on successful login', async () => {
    vi.mocked(authApi.login).mockResolvedValue({ user: mockUser, accessToken: 'tok' });
    const user = userEvent.setup();

    renderWithProviders(<LoginPage />);

    await user.type(await screen.findByPlaceholderText('you@example.com'), 'a@b.com');
    await user.type(screen.getByPlaceholderText('••••••••'), 'secret');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/schedules', { replace: true });
    });
  });
});
