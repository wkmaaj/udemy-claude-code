'use client';

import { useState, useEffect } from 'react';

interface Tag {
  id: string;
  name: string;
}

export default function TagsPage() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/tags')
      .then((r) => r.json())
      .then(setTags)
      .catch(() => {});
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    setError('');
    setLoading(true);
    const res = await fetch('/api/tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    if (res.ok) {
      const tag = await res.json();
      setTags((prev) => [...prev, tag].sort((a, b) => a.name.localeCompare(b.name)));
      setNewName('');
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? 'Failed to create tag.');
    }
    setLoading(false);
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this tag? It will be removed from all definitions.')) return;
    const res = await fetch(`/api/tags/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setTags((prev) => prev.filter((t) => t.id !== id));
    } else {
      alert('Failed to delete tag.');
    }
  }

  return (
    <div className='max-w-xl mx-auto px-4 py-8 space-y-6'>
      <h1 className='text-2xl font-bold text-gray-900'>Tags</h1>

      <form onSubmit={handleCreate} className='flex gap-2'>
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder='New tag name…'
          className='flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
        />
        <button
          type='submit'
          disabled={loading || !newName.trim()}
          className='rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
        >
          {loading ? 'Adding…' : 'Add'}
        </button>
      </form>

      {error && <p className='text-sm text-red-600'>{error}</p>}

      {tags.length === 0 ? (
        <p className='text-sm text-gray-500'>No tags yet. Add one above.</p>
      ) : (
        <ul className='space-y-2'>
          {tags.map((t) => (
            <li
              key={t.id}
              className='flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3'
            >
              <span className='text-sm font-medium text-gray-800'>{t.name}</span>
              <button
                type='button'
                onClick={() => handleDelete(t.id)}
                className='text-sm text-red-500 hover:text-red-700 transition-colors'
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
