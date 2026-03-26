/**
 * @jest-environment node
 *
 * Integration tests for GET and POST /api/progress
 */

import { GET, POST } from '@/app/api/progress/route';

jest.mock('@/lib/mongodb', () => ({
  connectDB: jest.fn().mockResolvedValue(undefined),
}));

const mockFindOne = jest.fn();
const mockFindOneAndUpdate = jest.fn();

jest.mock('@/lib/models/User', () => ({
  __esModule: true,
  default: {
    findOne: (...args: unknown[]) => mockFindOne(...args),
    findOneAndUpdate: (...args: unknown[]) => mockFindOneAndUpdate(...args),
  },
}));

// Build a valid token for email
function tokenFor(email: string) {
  return Buffer.from(`some-id:${email}:${Date.now()}`).toString('base64');
}

function makeGetRequest(token?: string) {
  return new Request('http://localhost/api/progress', {
    method: 'GET',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

function makePostRequest(body: unknown, token?: string) {
  return new Request('http://localhost/api/progress', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterAll(() => jest.restoreAllMocks());

describe('GET /api/progress', () => {
  it('returns 401 without auth header', async () => {
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(401);
  });

  it('returns 404 when user not found', async () => {
    mockFindOne.mockResolvedValue(null);
    const res = await GET(makeGetRequest(tokenFor('ghost@example.com')));
    expect(res.status).toBe(404);
  });

  it('returns progress data for authenticated user', async () => {
    mockFindOne.mockResolvedValue({
      moduleProgress: {
        completedModules: [1, 2, 3],
        currentModule: 4,
        lastActivity: '2024-01-15T10:00:00.000Z',
      },
    });

    const res = await GET(makeGetRequest(tokenFor('user@example.com')));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.completedModules).toEqual([1, 2, 3]);
    expect(body.currentModule).toBe(4);
    expect(body.lastActivity).toBe('2024-01-15T10:00:00.000Z');
  });

  it('returns defaults when moduleProgress is absent', async () => {
    mockFindOne.mockResolvedValue({ moduleProgress: null });

    const res = await GET(makeGetRequest(tokenFor('user@example.com')));
    const body = await res.json();
    expect(body.completedModules).toEqual([]);
    expect(body.currentModule).toBe(1);
    expect(body.lastActivity).toBeNull();
  });
});

describe('POST /api/progress', () => {
  it('returns 401 without auth header', async () => {
    const res = await POST(makePostRequest({ completedModules: [], currentModule: 1 }));
    expect(res.status).toBe(401);
  });

  it('returns 404 when user not found', async () => {
    mockFindOneAndUpdate.mockResolvedValue(null);
    const res = await POST(
      makePostRequest({ completedModules: [1], currentModule: 2 }, tokenFor('ghost@example.com'))
    );
    expect(res.status).toBe(404);
  });

  it('updates progress and returns success', async () => {
    mockFindOneAndUpdate.mockResolvedValue({ email: 'user@example.com' });

    const res = await POST(
      makePostRequest({ completedModules: [1, 2], currentModule: 3 }, tokenFor('user@example.com'))
    );
    expect(res.status).toBe(200);
    expect((await res.json()).success).toBe(true);
  });

  it('calls findOneAndUpdate with correct fields', async () => {
    mockFindOneAndUpdate.mockResolvedValue({ email: 'user@example.com' });

    await POST(
      makePostRequest({ completedModules: [1], currentModule: 2 }, tokenFor('user@example.com'))
    );

    expect(mockFindOneAndUpdate).toHaveBeenCalledWith(
      { email: 'user@example.com' },
      expect.objectContaining({
        $set: expect.objectContaining({
          'moduleProgress.completedModules': [1],
          'moduleProgress.currentModule': 2,
        }),
      }),
      { new: true }
    );
  });
});
