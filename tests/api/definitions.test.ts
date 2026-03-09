import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/definitions/route';

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

describe('GET /api/definitions', () => {
  it('returns 401 when no session', async () => {
    mockGetSession.mockResolvedValue(null);
    const res = await GET(new NextRequest('http://localhost/api/definitions'));
    expect(res.status).toBe(401);
  });

  it('returns empty array when no definitions', async () => {
    mockGetSession.mockResolvedValue(SESSION);
    mockAll.mockReturnValueOnce([]);
    const res = await GET(new NextRequest('http://localhost/api/definitions'));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });

  it('returns definitions with tags', async () => {
    mockGetSession.mockResolvedValue(SESSION);
    const row = {
      id: 'd1',
      arabic_word: 'كتاب',
      content: '{}',
      is_public: 0,
      share_slug: null,
      created_at: '2024',
      updated_at: '2024',
    };
    mockAll.mockReturnValueOnce([row]);
    mockAll.mockReturnValueOnce([{ id: 't1', name: 'grammar' }]);
    const res = await GET(new NextRequest('http://localhost/api/definitions'));
    const json = await res.json();
    expect(json).toHaveLength(1);
    expect(json[0].is_public).toBe(false);
    expect(json[0].tags).toEqual([{ id: 't1', name: 'grammar' }]);
  });

  it('uses FTS when ?q is provided', async () => {
    mockGetSession.mockResolvedValue(SESSION);
    mockAll.mockReturnValueOnce([]);
    await GET(new NextRequest('http://localhost/api/definitions?q=كتاب'));
    expect(mockQuery.mock.calls[0][0]).toContain('definitions_fts MATCH');
    expect(mockAll.mock.calls[0]).toEqual(['كتاب*', 'user-1']);
  });

  it('filters by tag when ?tag is provided', async () => {
    mockGetSession.mockResolvedValue(SESSION);
    mockAll.mockReturnValueOnce([]);
    await GET(new NextRequest('http://localhost/api/definitions?tag=tag-1'));
    expect(mockQuery.mock.calls[0][0]).toContain('definition_tags WHERE tag_id = ?');
    expect(mockAll.mock.calls[0]).toEqual(['user-1', 'tag-1']);
  });

  it('sorts by arabic word ascending when sort=alpha_asc', async () => {
    mockGetSession.mockResolvedValue(SESSION);
    mockAll.mockReturnValueOnce([]);
    await GET(new NextRequest('http://localhost/api/definitions?sort=alpha_asc'));
    expect(mockQuery.mock.calls[0][0]).toContain('ORDER BY d.arabic_word ASC');
  });
});

describe('POST /api/definitions', () => {
  it('returns 401 when no session', async () => {
    mockGetSession.mockResolvedValue(null);
    const req = new NextRequest('http://localhost/api/definitions', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' },
    });
    expect((await POST(req)).status).toBe(401);
  });

  it('returns 400 when arabic_word is missing', async () => {
    mockGetSession.mockResolvedValue(SESSION);
    const req = new NextRequest('http://localhost/api/definitions', {
      method: 'POST',
      body: JSON.stringify({ content: {} }),
      headers: { 'Content-Type': 'application/json' },
    });
    expect((await POST(req)).status).toBe(400);
  });

  it('returns 400 when arabic_word is empty', async () => {
    mockGetSession.mockResolvedValue(SESSION);
    const req = new NextRequest('http://localhost/api/definitions', {
      method: 'POST',
      body: JSON.stringify({ arabic_word: '', content: {} }),
      headers: { 'Content-Type': 'application/json' },
    });
    expect((await POST(req)).status).toBe(400);
  });

  it('returns 400 for invalid JSON body', async () => {
    mockGetSession.mockResolvedValue(SESSION);
    const req = new NextRequest('http://localhost/api/definitions', {
      method: 'POST',
      body: 'not json',
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('Invalid JSON');
  });

  it('creates definition without tags', async () => {
    mockGetSession.mockResolvedValue(SESSION);
    const defRow = {
      id: 'new-id',
      arabic_word: 'كتاب',
      content: '{}',
      is_public: 0,
      share_slug: null,
      created_at: '2024',
      updated_at: '2024',
    };
    mockGet.mockReturnValueOnce(defRow);
    mockAll.mockReturnValueOnce([]);
    const req = new NextRequest('http://localhost/api/definitions', {
      method: 'POST',
      body: JSON.stringify({ arabic_word: 'كتاب', content: {} }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.tags).toEqual([]);
    expect(json.is_public).toBe(false);
    expect(mockRun).toHaveBeenCalledTimes(1);
  });

  it('creates definition with valid tag_ids', async () => {
    mockGetSession.mockResolvedValue(SESSION);
    const defRow = {
      id: 'new-id',
      arabic_word: 'كتاب',
      content: '{}',
      is_public: 0,
      share_slug: null,
      created_at: '2024',
      updated_at: '2024',
    };
    mockGet.mockReturnValueOnce({ id: 'tag-1' }); // tag ownership check
    mockGet.mockReturnValueOnce(defRow); // definition select
    mockAll.mockReturnValueOnce([{ id: 'tag-1', name: 'grammar' }]);
    const req = new NextRequest('http://localhost/api/definitions', {
      method: 'POST',
      body: JSON.stringify({ arabic_word: 'كتاب', content: {}, tag_ids: ['tag-1'] }),
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
    expect(mockRun).toHaveBeenCalledTimes(2); // INSERT definition + INSERT definition_tags
  });
});
