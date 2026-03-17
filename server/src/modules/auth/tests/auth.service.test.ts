import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loginUser, refreshAccessToken, logoutUser, logoutAllSessions } from '../auth.service';
import * as repo from '../auth.repository';
import * as argon2 from 'argon2';

vi.mock('../auth.repository');
vi.mock('argon2');

const mockSign = vi.fn().mockReturnValue('mock-access-token');
const prisma = {} as any;
const future = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);

const mockUser = {
  id: 'user-1',
  email: 'a@test.com',
  username: 'user1',
  first_name: 'John',
  last_name: 'Doe',
  active: true,
  password_hash: 'hash',
  created_at: new Date(),
  updated_at: new Date(),
};
const mockWorkspaceUser = {
  workspace_id: 'ws-1',
  role: { key: 'admin' },
  created_at: new Date(),
};

describe('loginUser', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns user and tokens on valid credentials', async () => {
    vi.mocked(repo.findUserByEmail).mockResolvedValue(mockUser as any);
    vi.mocked(repo.findUserWithFirstWorkspace).mockResolvedValue(mockWorkspaceUser as any);
    vi.mocked(repo.createRefreshToken).mockResolvedValue({} as any);
    vi.mocked(argon2.verify).mockResolvedValue(true);

    const result = await loginUser(
      prisma,
      mockSign,
      { email: 'a@test.com', password: 'pass1234' },
      { ipAddress: null, device: null },
    );

    expect(result.user.email).toBe('a@test.com');
    expect(result.user.userName).toBe('user1');
    expect(result.accessToken).toBe('mock-access-token');
    expect(result.refreshToken).toHaveLength(64);
  });

  it('throws 401 if user not found', async () => {
    vi.mocked(repo.findUserByEmail).mockResolvedValue(null);
    await expect(
      loginUser(
        prisma,
        mockSign,
        { email: 'x@test.com', password: 'pass1234' },
        { ipAddress: null, device: null },
      ),
    ).rejects.toMatchObject({ statusCode: 401 });
  });

  it('throws 401 if user is inactive', async () => {
    vi.mocked(repo.findUserByEmail).mockResolvedValue({ ...mockUser, active: false } as any);
    await expect(
      loginUser(
        prisma,
        mockSign,
        { email: 'a@test.com', password: 'pass1234' },
        { ipAddress: null, device: null },
      ),
    ).rejects.toMatchObject({ statusCode: 401 });
  });

  it('throws 401 if password is wrong', async () => {
    vi.mocked(repo.findUserByEmail).mockResolvedValue(mockUser as any);
    vi.mocked(argon2.verify).mockResolvedValue(false);
    await expect(
      loginUser(
        prisma,
        mockSign,
        { email: 'a@test.com', password: 'wrongpass' },
        { ipAddress: null, device: null },
      ),
    ).rejects.toMatchObject({ statusCode: 401 });
  });

  it('throws 401 if user has no workspace', async () => {
    vi.mocked(repo.findUserByEmail).mockResolvedValue(mockUser as any);
    vi.mocked(argon2.verify).mockResolvedValue(true);
    vi.mocked(repo.findUserWithFirstWorkspace).mockResolvedValue(null);
    await expect(
      loginUser(
        prisma,
        mockSign,
        { email: 'a@test.com', password: 'pass1234' },
        { ipAddress: null, device: null },
      ),
    ).rejects.toMatchObject({ statusCode: 401 });
  });
});

describe('refreshAccessToken', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rotates the token and returns new access token', async () => {
    vi.mocked(repo.findRefreshTokenByHash).mockResolvedValue({
      id: 'rt-1',
      user_id: 'user-1',
      revoked_at: null,
      expires_at: future,
      created_at: new Date(),
      ip_address: null,
      device: null,
      token_hash: 'h',
    } as any);
    vi.mocked(repo.findUserWithFirstWorkspace).mockResolvedValue(mockWorkspaceUser as any);
    vi.mocked(repo.revokeRefreshToken).mockResolvedValue({} as any);
    vi.mocked(repo.createRefreshToken).mockResolvedValue({} as any);

    const result = await refreshAccessToken(prisma, mockSign, 'a'.repeat(64));
    expect(result.accessToken).toBe('mock-access-token');
    expect(result.refreshToken).toHaveLength(64);
    expect(repo.revokeRefreshToken).toHaveBeenCalledWith(prisma, 'rt-1');
  });

  it('throws 401 for expired token', async () => {
    vi.mocked(repo.findRefreshTokenByHash).mockResolvedValue({
      id: 'rt-1',
      revoked_at: null,
      expires_at: new Date(Date.now() - 1000),
      created_at: new Date(),
    } as any);
    await expect(refreshAccessToken(prisma, mockSign, 'token')).rejects.toMatchObject({
      statusCode: 401,
    });
  });

  it('throws 401 for revoked token', async () => {
    vi.mocked(repo.findRefreshTokenByHash).mockResolvedValue({
      id: 'rt-1',
      revoked_at: new Date(),
      expires_at: future,
      created_at: new Date(),
    } as any);
    await expect(refreshAccessToken(prisma, mockSign, 'token')).rejects.toMatchObject({
      statusCode: 401,
    });
  });
});

describe('logoutUser', () => {
  beforeEach(() => vi.clearAllMocks());

  it('revokes the session if found and active', async () => {
    vi.mocked(repo.findRefreshTokenByHash).mockResolvedValue({
      id: 'rt-1',
      revoked_at: null,
    } as any);
    vi.mocked(repo.revokeRefreshToken).mockResolvedValue({} as any);
    await logoutUser(prisma, 'raw-token');
    expect(repo.revokeRefreshToken).toHaveBeenCalledWith(prisma, 'rt-1');
  });

  it('does nothing if token not found', async () => {
    vi.mocked(repo.findRefreshTokenByHash).mockResolvedValue(null);
    await logoutUser(prisma, 'raw-token');
    expect(repo.revokeRefreshToken).not.toHaveBeenCalled();
  });
});

describe('logoutAllSessions', () => {
  it('deletes all sessions for the user', async () => {
    vi.mocked(repo.deleteAllUserRefreshTokens).mockResolvedValue({ count: 3 } as any);
    await logoutAllSessions(prisma, 'user-1');
    expect(repo.deleteAllUserRefreshTokens).toHaveBeenCalledWith(prisma, 'user-1');
  });
});
