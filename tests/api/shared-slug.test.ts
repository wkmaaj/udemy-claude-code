import { GET } from '@/app/api/shared/[slug]/route';

const { mockRun, mockGet, mockAll, mockQuery } = vi.hoisted(() => {
  const mockRun = vi.fn();
  const mockGet = vi.fn();
  const mockAll = vi.fn();
  const mockQuery = vi.fn(() => ({ run: mockRun, get: mockGet, all: mockAll }));
  return { mockRun, mockGet, mockAll, mockQuery };
});

vi.mock('@/lib/db', () => ({ default: { query: mockQuery } }));

beforeEach(() => {
  vi.clearAllMocks();
  mockQuery.mockReturnValue({ run: mockRun, get: mockGet, all: mockAll });
});

describe('GET /api/shared/[slug]', () => {
  it('returns 404 when definition not found', async () => {
    mockGet.mockReturnValueOnce(null);
    const res = await GET(new Request('http://localhost'), {
      params: Promise.resolve({ slug: 'missing' }),
    });
    expect(res.status).toBe(404);
  });

  it('returns 200 with public definition', async () => {
    const def = { id: 'd1', arabic_word: 'كتاب', content: '{}' };
    mockGet.mockReturnValueOnce(def);
    const res = await GET(new Request('http://localhost'), {
      params: Promise.resolve({ slug: 'test-slug' }),
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(def);
    expect(mockQuery.mock.calls[0][0]).toContain('is_public = 1');
  });
});
