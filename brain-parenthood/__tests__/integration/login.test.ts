/**
 * @jest-environment node
 *
 * Integration tests for POST /api/users/login
 */

import { POST } from '@/app/api/users/login/route';

jest.mock('@/lib/mongodb', () => ({
  connectDB: jest.fn().mockResolvedValue(undefined),
}));

const mockFindOne = jest.fn();

jest.mock('@/lib/models/User', () => ({
  __esModule: true,
  default: {
    findOne: (...args: unknown[]) => mockFindOne(...args),
  },
}));

function makeRequest(body: unknown) {
  return new Request('http://localhost/api/users/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function fakeUser(overrides = {}) {
  return {
    _id: { toString: () => 'abc123' },
    email: 'user@example.com',
    name: 'Test User',
    password: 'correctpass',
    isAdmin: false,
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterAll(() => jest.restoreAllMocks());

describe('POST /api/users/login', () => {
  it('returns 400 when email is missing', async () => {
    const res = await POST(makeRequest({ password: 'pass' }));
    expect(res.status).toBe(400);
    expect((await res.json()).detail).toMatch(/required/i);
  });

  it('returns 400 when password is missing', async () => {
    const res = await POST(makeRequest({ email: 'a@b.com' }));
    expect(res.status).toBe(400);
  });

  it('returns 401 when user is not found', async () => {
    mockFindOne.mockResolvedValue(null);
    const res = await POST(makeRequest({ email: 'ghost@example.com', password: 'pass' }));
    expect(res.status).toBe(401);
    expect((await res.json()).detail).toMatch(/invalid credentials/i);
  });

  it('returns 401 when password does not match', async () => {
    mockFindOne.mockResolvedValue(fakeUser());
    const res = await POST(makeRequest({ email: 'user@example.com', password: 'wrongpass' }));
    expect(res.status).toBe(401);
  });

  it('returns token and user on valid credentials', async () => {
    mockFindOne.mockResolvedValue(fakeUser());
    const res = await POST(makeRequest({ email: 'user@example.com', password: 'correctpass' }));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.access_token).toBeDefined();
    expect(body.token_type).toBe('bearer');
    expect(body.user.email).toBe('user@example.com');
    expect(body.user.name).toBe('Test User');
    expect(body.user.id).toBe('abc123');
  });

  it('returns 500 when User.findOne throws', async () => {
    mockFindOne.mockRejectedValue(new Error('DB failure'));
    const res = await POST(makeRequest({ email: 'a@b.com', password: 'pass' }));
    expect(res.status).toBe(500);
  });

  it('lowercases the email before lookup', async () => {
    mockFindOne.mockResolvedValue(fakeUser());
    await POST(makeRequest({ email: 'USER@EXAMPLE.COM', password: 'correctpass' }));
    expect(mockFindOne).toHaveBeenCalledWith({ email: 'user@example.com' });
  });

  it('issued token decodes to contain user id and email', async () => {
    mockFindOne.mockResolvedValue(fakeUser());
    const res = await POST(makeRequest({ email: 'user@example.com', password: 'correctpass' }));
    const { access_token } = await res.json();
    const decoded = Buffer.from(access_token, 'base64').toString('utf-8');
    expect(decoded).toContain('abc123');
    expect(decoded).toContain('user@example.com');
  });
});
