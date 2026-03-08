import { POST } from '@/app/api/definitions/[id]/share/route';

const { mockRun, mockGet, mockAll, mockQuery, mockGetSession, mockRandomBytes } = vi.hoisted(() => {
  const mockRun = vi.fn();
  const mockGet = vi.fn();
  const mockAll = vi.fn();
  const mockQuery = vi.fn(() => ({ run: mockRun, get: mockGet, all: mockAll }));
  const mockGetSession = vi.fn();
  const mockRandomBytes = vi.fn().mockReturnValue({ toString: () => 'test-slug' });
  return { mockRun, mockGet, mockAll, mockQuery, mockGetSession, mockRandomBytes };
});

vi.mock('@/lib/db', () => ({ default: { query: mockQuery } }));
vi.mock('@/lib/auth', () => ({ auth: { api: { getSession: mockGetSession } } }));
vi.mock('next/headers', () => ({ headers: vi.fn().mockResolvedValue(new Headers()) }));
vi.mock('crypto', () => ({ randomBytes: mockRandomBytes }));

const SESSION = { user: { id: 'user-1' } };

beforeEach(() => {
  vi.clearAllMocks();
  mockQuery.mockReturnValue({ run: mockRun, get: mockGet, all: mockAll });
  mockRandomBytes.mockReturnValue({ toString: () => 'test-slug' });
  process.env.NEXT_PUBLIC_APP_URL = 'https://example.com';
});

describe('POST /api/definitions/[id]/share', () => {
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

  it('returns share_slug and share_url', async () => {
    mockGetSession.mockResolvedValue(SESSION);
    mockGet.mockReturnValueOnce({ id: 'd1' });
    const res = await POST(new Request('http://localhost'), {
      params: Promise.resolve({ id: 'd1' }),
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.share_slug).toBe('test-slug');
    expect(json.share_url).toBe('https://example.com/shared/test-slug');
  });
});
