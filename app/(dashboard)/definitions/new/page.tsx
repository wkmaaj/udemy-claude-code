'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { JSONContent } from '@tiptap/react';
import { Editor } from '@/components/editor/Editor';

interface Tag {
  id: string;
  name: string;
}

export default function NewDefinitionPage() {
  const router = useRouter();
  const [arabicWord, setArabicWord] = useState('');
  const [content, setContent] = useState<JSONContent>({
    type: 'doc',
    content: [{ type: 'paragraph' }],
  });
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/tags')
      .then((r) => r.json())
      .then(setTags)
      .catch(() => {});
  }, []);

  function toggleTag(id: string) {
    setSelectedTagIds((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!arabicWord.trim()) {
      setError('Arabic word is required.');
      return;
    }
    setError('');
    setLoading(true);
    const res = await fetch('/api/definitions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ arabic_word: arabicWord.trim(), content, tag_ids: selectedTagIds }),
    });
    if (res.ok) {
      const def = await res.json();
      router.push(`/definitions/${def.id}/edit`);
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? 'Failed to create definition.');
    }
    setLoading(false);
  }

  return (
    <div className='max-w-2xl mx-auto px-4 py-8 space-y-6'>
      <div className='flex items-center gap-3'>
        <button
          type='button'
          onClick={() => router.push('/definitions')}
          className='text-sm text-gray-500 hover:text-gray-800 transition-colors'
        >
          ← Back
        </button>
        <h1 className='text-2xl font-bold text-gray-900'>New definition</h1>
      </div>

      <form onSubmit={handleSubmit} className='space-y-5'>
        <div className='space-y-1'>
          <label className='block text-sm font-medium text-gray-700'>Arabic word</label>
          <input
            dir='rtl'
            value={arabicWord}
            onChange={(e) => setArabicWord(e.target.value)}
            placeholder='اكتب الكلمة هنا'
            className='w-full rounded-lg border border-gray-300 px-3 py-2 text-xl text-right font-bold focus:outline-none focus:ring-2 focus:ring-blue-500'
          />
        </div>

        <div className='space-y-1'>
          <label className='block text-sm font-medium text-gray-700'>Definition</label>
          <Editor content={content} onChange={setContent} />
        </div>

        {tags.length > 0 && (
          <div className='space-y-2'>
            <label className='block text-sm font-medium text-gray-700'>Tags</label>
            <div className='flex flex-wrap gap-2'>
              {tags.map((t) => (
                <button
                  key={t.id}
                  type='button'
                  onClick={() => toggleTag(t.id)}
                  className={`rounded-full px-3 py-1 text-sm transition-colors ${
                    selectedTagIds.includes(t.id)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {t.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {error && <p className='text-sm text-red-600'>{error}</p>}

        <div className='flex gap-3'>
          <button
            type='submit'
            disabled={loading}
            className='rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
          >
            {loading ? 'Saving…' : 'Save definition'}
          </button>
          <button
            type='button'
            onClick={() => router.push('/definitions')}
            className='rounded-lg border border-gray-300 px-5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors'
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
