/**
 * @jest-environment node
 *
 * Integration tests for POST /api/users/signup
 * MongoDB is mocked — no live connection required.
 */

import { POST } from '@/app/api/users/signup/route';

// ── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('@/lib/mongodb', () => ({
  connectDB: jest.fn().mockResolvedValue(undefined),
}));

const mockFindOne = jest.fn();
const mockCreate = jest.fn();

jest.mock('@/lib/models/User', () => ({
  __esModule: true,
  default: {
    findOne: (...args: unknown[]) => mockFindOne(...args),
    create: (...args: unknown[]) => mockCreate(...args),
  },
}));

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeRequest(body: unknown) {
  return new Request('http://localhost/api/users/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function fakeUser(overrides = {}) {
  return {
    _id: { toString: () => 'user-id-123' },
    email: 'test@example.com',
    name: 'Test User',
    isAdmin: false,
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterAll(() => jest.restoreAllMocks());

describe('POST /api/users/signup', () => {
  it('returns 400 when email is missing', async () => {
    const res = await POST(makeRequest({ password: 'pass123', name: 'Alice' }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.detail).toMatch(/required/i);
  });

  it('returns 400 when password is missing', async () => {
    const res = await POST(makeRequest({ email: 'a@b.com', name: 'Alice' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when name is missing', async () => {
    const res = await POST(makeRequest({ email: 'a@b.com', password: 'pass123' }));
    expect(res.status).toBe(400);
  });

  it('returns 409 when user already exists', async () => {
    mockFindOne.mockResolvedValue(fakeUser());

    const res = await POST(makeRequest({ email: 'test@example.com', password: 'pass', name: 'Alice' }));
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.detail).toMatch(/already exists/i);
  });

  it('creates a new user and returns a token on success', async () => {
    mockFindOne.mockResolvedValue(null);
    mockCreate.mockResolvedValue(fakeUser({ email: 'new@example.com', name: 'New User' }));

    const res = await POST(makeRequest({ email: 'new@example.com', password: 'secret', name: 'New User' }));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.access_token).toBeDefined();
    expect(body.token_type).toBe('bearer');
    expect(body.user.email).toBe('new@example.com');
    expect(body.user.name).toBe('New User');
    expect(body.user.isAdmin).toBe(false);
  });

  it('returns 500 when User.create throws', async () => {
    mockFindOne.mockResolvedValue(null);
    mockCreate.mockRejectedValue(new Error('DB error'));

    const res = await POST(makeRequest({ email: 'x@x.com', password: 'pass', name: 'X' }));
    expect(res.status).toBe(500);
  });

  it('lowercases the email before duplicate check', async () => {
    mockFindOne.mockResolvedValue(null);
    mockCreate.mockResolvedValue(fakeUser({ email: 'upper@example.com', name: 'Upper' }));

    await POST(makeRequest({ email: 'UPPER@example.com', password: 'pass', name: 'Upper' }));

    expect(mockFindOne).toHaveBeenCalledWith({ email: 'upper@example.com' });
  });
});
