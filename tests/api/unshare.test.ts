import { POST } from '@/app/api/definitions/[id]/unshare/route';

const { mockRun, mockGet, mockAll, mockQuery, mockGetSession } = vi.hoisted(() => {
  const mockRun = vi.fn();
  const mockGet = vi.fn();
  const mockAll = vi.fn();
  const mockQuery = vi.fn(() => ({ run: mockRun, get: mockGet, all: mockAll }));
  const mockGetSession = vi.fn();
  return { mockRun, mockGet, mockAll, mockQuery, mockGetSession };
});

vi.mock('@/lib/db', () => ({ default: { query: mockQuery } }));
vi.mock('@/lib/auth', () => ({ auth: { api: { getSession: mockGetSession } } }));
vi.mock('next/headers', () => ({ headers: vi.fn().mockResolvedValue(new Headers()) }));

const SESSION = { user: { id: 'user-1' } };

beforeEach(() => {
  vi.clearAllMocks();
  mockQuery.mockReturnValue({ run: mockRun, get: mockGet, all: mockAll });
});

describe('POST /api/definitions/[id]/unshare', () => {
  it('returns 401 when no session', async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await POST(new Request('http://localhost'), {
      params: Promise.resolve({ id: 'd1' }),
    });
    expect(res.status).toBe(401);
  });

  it('returns 404 when definition not found', async () => {
    mockGetSession.mockResolvedValue(SESSION);
    mockGet.mockReturnValueOnce(null);
    const res = await POST(new Request('http://localhost'), {
      params: Promise.resolve({ id: 'd1' }),
    });
    expect(res.status).toBe(404);
  });

  it('returns success and calls UPDATE with is_public = 0', async () => {
    mockGetSession.mockResolvedValue(SESSION);
    mockGet.mockReturnValueOnce({ id: 'd1' });
    const res = await POST(new Request('http://localhost'), {
      params: Promise.resolve({ id: 'd1' }),
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
    const updateCall = mockQuery.mock.calls.find(([sql]: [string]) =>
      sql.includes('is_public = 0, share_slug = NULL'),
    );
    expect(updateCall).toBeDefined();
    expect(mockRun).toHaveBeenCalledTimes(1);
  });
});
