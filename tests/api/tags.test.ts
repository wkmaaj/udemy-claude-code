import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/tags/route';

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

describe('GET /api/tags', () => {
  it('returns 401 when no session', async () => {
    mockGetSession.mockResolvedValue(null);
    expect((await GET()).status).toBe(401);
  });

  it('returns tags ordered by name', async () => {
    mockGetSession.mockResolvedValue(SESSION);
    mockAll.mockReturnValueOnce([{ id: 't1', name: 'grammar' }]);
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([{ id: 't1', name: 'grammar' }]);
    expect(mockQuery.mock.calls[0][0]).toContain('ORDER BY name');
  });
});

describe('POST /api/tags', () => {
  it('returns 401 when no session', async () => {
    mockGetSession.mockResolvedValue(null);
    const req = new NextRequest('http://localhost/api/tags', {
      method: 'POST',
      body: JSON.stringify({ name: 'grammar' }),
      headers: { 'Content-Type': 'application/json' },
    });
    expect((await POST(req)).status).toBe(401);
  });

  it('returns 400 when name is empty', async () => {
    mockGetSession.mockResolvedValue(SESSION);
    const req = new NextRequest('http://localhost/api/tags', {
      method: 'POST',
      body: JSON.stringify({ name: '' }),
      headers: { 'Content-Type': 'application/json' },
    });
    expect((await POST(req)).status).toBe(400);
  });

  it('returns 400 when name trims to empty', async () => {
    mockGetSession.mockResolvedValue(SESSION);
    const req = new NextRequest('http://localhost/api/tags', {
      method: 'POST',
      body: JSON.stringify({ name: '   ' }),
      headers: { 'Content-Type': 'application/json' },
    });
    expect((await POST(req)).status).toBe(400);
  });

  it('returns 409 when tag already exists', async () => {
    mockGetSession.mockResolvedValue(SESSION);
    mockRun.mockImplementationOnce(() => {
      throw new Error('UNIQUE constraint failed');
    });
    const req = new NextRequest('http://localhost/api/tags', {
      method: 'POST',
      body: JSON.stringify({ name: 'grammar' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe('Tag already exists');
  });

  it('returns 201 with created tag', async () => {
    mockGetSession.mockResolvedValue(SESSION);
    const req = new NextRequest('http://localhost/api/tags', {
      method: 'POST',
      body: JSON.stringify({ name: 'grammar' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(typeof json.id).toBe('string');
    expect(json.name).toBe('grammar');
  });
});
