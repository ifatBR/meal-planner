import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { AuthProvider } from './AuthContext';
import { useAuth } from '../hooks/useAuth';
import * as authApi from '../api/auth';

vi.mock('../api/auth');

const mockUser = {
  id: '1',
  email: 'a@b.com',
  role: 'admin',
  userName: 'auser',
  firstName: 'A',
  lastName: 'B',
};

const wrapper = ({ children }: { children: ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

beforeEach(() => {
  vi.resetAllMocks();
});

describe('AuthContext', () => {
  it('initializes with isLoading true then resolves', async () => {
    vi.mocked(authApi.refreshToken).mockResolvedValue({ accessToken: 'tok' });
    vi.mocked(authApi.getMe).mockResolvedValue(mockUser);

    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isLoading).toBe(false));
  });

  it('sets user and accessToken on successful refresh init', async () => {
    vi.mocked(authApi.refreshToken).mockResolvedValue({ accessToken: 'tok' });
    vi.mocked(authApi.getMe).mockResolvedValue(mockUser);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.user).toEqual(mockUser);
    expect(result.current.accessToken).toBe('tok');
  });

  it('sets null user on failed refresh init', async () => {
    vi.mocked(authApi.refreshToken).mockRejectedValue(new Error('expired'));

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.user).toBeNull();
    expect(result.current.accessToken).toBeNull();
  });

  it('login sets user and accessToken', async () => {
    vi.mocked(authApi.refreshToken).mockRejectedValue(new Error('no token'));
    vi.mocked(authApi.login).mockResolvedValue({ user: mockUser, accessToken: 'new-tok' });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.login({ email: 'a@b.com', password: 'secret' });
    });

    expect(result.current.user).toEqual(mockUser);
    expect(result.current.accessToken).toBe('new-tok');
  });

  it('logout clears user and accessToken', async () => {
    vi.mocked(authApi.refreshToken).mockResolvedValue({ accessToken: 'tok' });
    vi.mocked(authApi.getMe).mockResolvedValue(mockUser);
    vi.mocked(authApi.logout).mockResolvedValue(undefined);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.user).toEqual(mockUser));

    await act(async () => {
      await result.current.logout();
    });

    expect(result.current.user).toBeNull();
    expect(result.current.accessToken).toBeNull();
  });
});
