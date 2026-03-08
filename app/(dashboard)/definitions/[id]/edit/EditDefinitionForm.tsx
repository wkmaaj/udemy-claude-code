'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { JSONContent } from '@tiptap/react';
import { Editor } from '@/components/editor/Editor';
import { SharePanel } from './SharePanel';

interface Tag {
  id: string;
  name: string;
}

interface DefinitionProps {
  id: string;
  arabic_word: string;
  content: string;
  is_public: boolean;
  share_slug: string | null;
}

interface Props {
  definition: DefinitionProps;
  allTags: Tag[];
  initialTagIds: string[];
}

export function EditDefinitionForm({ definition, allTags, initialTagIds }: Props) {
  const router = useRouter();
  const [arabicWord, setArabicWord] = useState(definition.arabic_word);
  const [content, setContent] = useState<JSONContent>(() => {
    try {
      return JSON.parse(definition.content);
    } catch {
      return { type: 'doc', content: [{ type: 'paragraph' }] };
    }
  });
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(initialTagIds);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  function toggleTag(id: string) {
    setSelectedTagIds((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!arabicWord.trim()) {
      setError('Arabic word is required.');
      return;
    }
    setError('');
    setLoading(true);
    const res = await fetch(`/api/definitions/${definition.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        arabic_word: arabicWord.trim(),
        content,
        tag_ids: selectedTagIds,
      }),
    });
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? 'Failed to save.');
    }
    setLoading(false);
  }

  async function handleDelete() {
    if (!confirm('Delete this definition? This cannot be undone.')) return;
    setDeleting(true);
    const res = await fetch(`/api/definitions/${definition.id}`, { method: 'DELETE' });
    if (res.ok) {
      router.push('/definitions');
    } else {
      setError('Failed to delete.');
      setDeleting(false);
    }
  }

  return (
    <div className='max-w-2xl mx-auto px-4 py-8 space-y-8'>
      <div className='flex items-center gap-3'>
        <button
          type='button'
          onClick={() => router.push('/definitions')}
          className='text-sm text-gray-500 hover:text-gray-800 transition-colors'
        >
          ← Back
        </button>
        <h1 className='text-2xl font-bold text-gray-900'>Edit definition</h1>
      </div>

      <form onSubmit={handleSave} className='space-y-5'>
        <div className='space-y-1'>
          <label className='block text-sm font-medium text-gray-700'>Arabic word</label>
          <input
            dir='rtl'
            value={arabicWord}
            onChange={(e) => setArabicWord(e.target.value)}
            className='w-full rounded-lg border border-gray-300 px-3 py-2 text-xl text-right font-bold focus:outline-none focus:ring-2 focus:ring-blue-500'
          />
        </div>

        <div className='space-y-1'>
          <label className='block text-sm font-medium text-gray-700'>Definition</label>
          <Editor content={content} onChange={setContent} />
        </div>

        {allTags.length > 0 && (
          <div className='space-y-2'>
            <label className='block text-sm font-medium text-gray-700'>Tags</label>
            <div className='flex flex-wrap gap-2'>
              {allTags.map((t) => (
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

        <div className='flex items-center gap-3'>
          <button
            type='submit'
            disabled={loading}
            className='rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
          >
            {loading ? 'Saving…' : saved ? 'Saved!' : 'Save changes'}
          </button>
          <button
            type='button'
            onClick={handleDelete}
            disabled={deleting}
            className='rounded-lg border border-red-200 px-5 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
          >
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </form>

      <hr className='border-gray-200' />

      <SharePanel
        definitionId={definition.id}
        arabicWord={arabicWord}
        isPublic={definition.is_public}
        shareSlug={definition.share_slug}
      />
    </div>
  );
}
