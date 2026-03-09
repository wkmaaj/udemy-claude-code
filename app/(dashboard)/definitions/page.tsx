'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

interface Tag {
  id: string;
  name: string;
}

interface Definition {
  id: string;
  arabic_word: string;
  content: string;
  is_public: boolean;
  share_slug: string | null;
  created_at: string;
  updated_at: string;
  tags: Tag[];
}

function contentPreview(raw: string): string {
  try {
    const doc = JSON.parse(raw);
    const texts: string[] = [];
    function walk(node: { text?: string; content?: unknown[] }) {
      if (node.text) texts.push(node.text);
      node.content?.forEach((c) => walk(c as { text?: string; content?: unknown[] }));
    }
    walk(doc);
    const joined = texts.join(' ').trim();
    return joined.length > 120 ? joined.slice(0, 120) + '…' : joined;
  } catch {
    return '';
  }
}

function DefinitionsPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [definitions, setDefinitions] = useState<Definition[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState(searchParams.get('q') ?? '');
  const [tagFilter, setTagFilter] = useState(searchParams.get('tag') ?? '');
  const [sort, setSort] = useState(searchParams.get('sort') ?? 'created_desc');

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchDefinitions = useCallback(async (q: string, tag: string, s: string) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (tag) params.set('tag', tag);
    if (s) params.set('sort', s);
    const res = await fetch(`/api/definitions?${params}`);
    if (res.ok) setDefinitions(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    fetch('/api/tags')
      .then((r) => r.json())
      .then(setTags)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchDefinitions(search, tagFilter, sort);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search, tagFilter, sort, fetchDefinitions]);

  return (
    <div className='max-w-4xl mx-auto px-4 py-8 space-y-6'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <h1 className='text-2xl font-bold text-gray-900'>Definitions</h1>
        <Link
          href='/definitions/new'
          className='rounded-lg bg-green-500 px-4 py-2 text-sm font-medium text-white hover:bg-green-600 transition-colors'
        >
          + New definition
        </Link>
      </div>

      {/* Filters */}
      <div className='flex flex-wrap gap-3'>
        <input
          type='search'
          placeholder='Search…'
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className='flex-1 min-w-48 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500'
        />

        <select
          value={tagFilter}
          onChange={(e) => setTagFilter(e.target.value)}
          className='rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500'
        >
          <option value=''>All tags</option>
          {tags.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>

        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className='rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500'
        >
          <option value='created_desc'>Newest first</option>
          <option value='created_asc'>Oldest first</option>
          <option value='updated_desc'>Recently updated</option>
          <option value='alpha_asc'>A → Z</option>
          <option value='alpha_desc'>Z → A</option>
        </select>
      </div>

      {/* List */}
      {loading ? (
        <p className='text-sm text-gray-500'>Loading…</p>
      ) : definitions.length === 0 ? (
        <div className='text-center py-16 space-y-3'>
          <p className='text-gray-500'>No definitions found.</p>
          <Link href='/definitions/new' className='text-sm text-green-500 hover:underline'>
            Create your first definition
          </Link>
        </div>
      ) : (
        <ul className='space-y-3'>
          {definitions.map((def) => (
            <li key={def.id}>
              <button
                type='button'
                onClick={() => router.push(`/definitions/${def.id}/edit`)}
                className='w-full text-left rounded-xl border border-gray-200 bg-white p-4 hover:border-green-300 hover:shadow-sm transition-all space-y-2'
              >
                <div className='flex items-start justify-between gap-4'>
                  <p dir='rtl' className='text-xl font-bold text-gray-900 leading-tight'>
                    {def.arabic_word}
                  </p>
                  <div className='flex items-center gap-2 shrink-0'>
                    {def.is_public && (
                      <span className='rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700'>
                        Shared
                      </span>
                    )}
                  </div>
                </div>

                {contentPreview(def.content) && (
                  <p className='text-sm text-gray-600 line-clamp-2'>
                    {contentPreview(def.content)}
                  </p>
                )}

                <div className='flex items-center gap-2 flex-wrap'>
                  {def.tags.map((t) => (
                    <span
                      key={t.id}
                      className='rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600'
                    >
                      {t.name}
                    </span>
                  ))}
                  <span className='text-xs text-gray-400 ml-auto'>
                    {new Date(def.updated_at).toLocaleDateString()}
                  </span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function DefinitionsPage() {
  return (
    <Suspense>
      <DefinitionsPageInner />
    </Suspense>
  );
}
