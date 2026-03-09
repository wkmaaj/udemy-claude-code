import { NextRequest } from 'next/server';
import { DELETE, GET, PATCH } from '@/app/api/definitions/[id]/route';

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
const DEF_ROW = {
  id: 'd1',
  arabic_word: 'كتاب',
  content: '{}',
  is_public: 0,
  share_slug: null,
  created_at: '2024',
  updated_at: '2024',
};

beforeEach(() => {
  vi.clearAllMocks();
  mockQuery.mockReturnValue({ run: mockRun, get: mockGet, all: mockAll });
});

describe('GET /api/definitions/[id]', () => {
  it('returns 401 when no session', async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await GET(new NextRequest('http://localhost/api/definitions/d1'), {
      params: Promise.resolve({ id: 'd1' }),
    });
    expect(res.status).toBe(401);
  });

  it('returns 404 when definition not found', async () => {
    mockGetSession.mockResolvedValue(SESSION);
    mockGet.mockReturnValueOnce(null);
    const res = await GET(new NextRequest('http://localhost/api/definitions/d1'), {
      params: Promise.resolve({ id: 'd1' }),
    });
    expect(res.status).toBe(404);
  });

  it('returns 200 with definition and tags', async () => {
    mockGetSession.mockResolvedValue(SESSION);
    mockGet.mockReturnValueOnce({ id: 'd1' }); // ownership check
    mockGet.mockReturnValueOnce({ ...DEF_ROW, is_public: 1 }); // getDefinitionWithTags
    mockAll.mockReturnValueOnce([{ id: 't1', name: 'grammar' }]);
    const res = await GET(new NextRequest('http://localhost/api/definitions/d1'), {
      params: Promise.resolve({ id: 'd1' }),
    });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.is_public).toBe(true);
    expect(json.tags).toEqual([{ id: 't1', name: 'grammar' }]);
  });
});

describe('PATCH /api/definitions/[id]', () => {
  it('returns 401 when no session', async () => {
    mockGetSession.mockResolvedValue(null);
    const req = new NextRequest('http://localhost/api/definitions/d1', {
      method: 'PATCH',
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' },
    });
    expect((await PATCH(req, { params: Promise.resolve({ id: 'd1' }) })).status).toBe(401);
  });

  it('returns 404 when definition not found', async () => {
    mockGetSession.mockResolvedValue(SESSION);
    mockGet.mockReturnValueOnce(null);
    const req = new NextRequest('http://localhost/api/definitions/d1', {
      method: 'PATCH',
      body: JSON.stringify({ arabic_word: 'test' }),
      headers: { 'Content-Type': 'application/json' },
    });
    expect((await PATCH(req, { params: Promise.resolve({ id: 'd1' }) })).status).toBe(404);
  });

  it('updates arabic_word only', async () => {
    mockGetSession.mockResolvedValue(SESSION);
    mockGet.mockReturnValueOnce({ id: 'd1' }); // ownership
    mockGet.mockReturnValueOnce({ ...DEF_ROW, arabic_word: 'جديد' }); // getDefinitionWithTags
    mockAll.mockReturnValueOnce([]);
    const req = new NextRequest('http://localhost/api/definitions/d1', {
      method: 'PATCH',
      body: JSON.stringify({ arabic_word: 'جديد' }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: 'd1' }) });
    expect(res.status).toBe(200);
    const updateCall = mockQuery.mock.calls.find(([sql]: [string]) =>
      sql.includes('arabic_word = ?'),
    );
    expect(updateCall).toBeDefined();
  });

  it('replaces tags when tag_ids provided', async () => {
    mockGetSession.mockResolvedValue(SESSION);
    mockGet.mockReturnValueOnce({ id: 'd1' }); // ownership
    // DELETE definition_tags (run #0)
    mockGet.mockReturnValueOnce({ id: 'tag-1' }); // tag ownership
    // INSERT definition_tags (run #1)
    mockGet.mockReturnValueOnce(DEF_ROW); // getDefinitionWithTags
    mockAll.mockReturnValueOnce([{ id: 'tag-1', name: 'grammar' }]);
    const req = new NextRequest('http://localhost/api/definitions/d1', {
      method: 'PATCH',
      body: JSON.stringify({ tag_ids: ['tag-1'] }),
      headers: { 'Content-Type': 'application/json' },
    });
    await PATCH(req, { params: Promise.resolve({ id: 'd1' }) });
    const deleteCall = mockQuery.mock.calls.find(([sql]: [string]) =>
      sql.includes('DELETE FROM definition_tags'),
    );
    expect(deleteCall).toBeDefined();
    expect(mockRun).toHaveBeenCalledTimes(2); // DELETE + INSERT
  });
});

describe('DELETE /api/definitions/[id]', () => {
  it('returns 401 when no session', async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await DELETE(new NextRequest('http://localhost/api/definitions/d1'), {
      params: Promise.resolve({ id: 'd1' }),
    });
    expect(res.status).toBe(401);
  });

  it('returns 404 when definition not found', async () => {
    mockGetSession.mockResolvedValue(SESSION);
    mockGet.mockReturnValueOnce(null);
    const res = await DELETE(new NextRequest('http://localhost/api/definitions/d1'), {
      params: Promise.resolve({ id: 'd1' }),
    });
    expect(res.status).toBe(404);
  });

  it('returns 204 and deletes definition', async () => {
    mockGetSession.mockResolvedValue(SESSION);
    mockGet.mockReturnValueOnce({ id: 'd1' });
    const res = await DELETE(new NextRequest('http://localhost/api/definitions/d1'), {
      params: Promise.resolve({ id: 'd1' }),
    });
    expect(res.status).toBe(204);
    const deleteCall = mockQuery.mock.calls.find(([sql]: [string]) =>
      sql.includes('DELETE FROM definitions WHERE id = ?'),
    );
    expect(deleteCall).toBeDefined();
  });
});
