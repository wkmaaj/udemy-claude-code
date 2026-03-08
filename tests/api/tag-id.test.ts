import { NextRequest } from 'next/server';
import { DELETE } from '@/app/api/tags/[id]/route';

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

describe('DELETE /api/tags/[id]', () => {
  it('returns 401 when no session', async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await DELETE(new NextRequest('http://localhost/api/tags/t1'), {
      params: Promise.resolve({ id: 't1' }),
    });
    expect(res.status).toBe(401);
  });

  it('returns 404 when tag not found', async () => {
    mockGetSession.mockResolvedValue(SESSION);
    mockGet.mockReturnValueOnce(null);
    const res = await DELETE(new NextRequest('http://localhost/api/tags/t1'), {
      params: Promise.resolve({ id: 't1' }),
    });
    expect(res.status).toBe(404);
  });

  it('returns 204 and deletes tag', async () => {
    mockGetSession.mockResolvedValue(SESSION);
    mockGet.mockReturnValueOnce({ id: 't1' });
    const res = await DELETE(new NextRequest('http://localhost/api/tags/t1'), {
      params: Promise.resolve({ id: 't1' }),
    });
    expect(res.status).toBe(204);
    const deleteCall = mockQuery.mock.calls.find(([sql]: [string]) =>
      sql.includes('DELETE FROM tags WHERE id = ?'),
    );
    expect(deleteCall).toBeDefined();
    expect(mockRun.mock.calls[0]).toEqual(['t1']);
  });
});
