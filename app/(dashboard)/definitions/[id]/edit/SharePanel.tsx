'use client';

import { useState } from 'react';

interface SharePanelProps {
  definitionId: string;
  arabicWord: string;
  isPublic: boolean;
  shareSlug: string | null;
}

export function SharePanel({
  definitionId,
  arabicWord,
  isPublic: initialIsPublic,
  shareSlug: initialShareSlug,
}: SharePanelProps) {
  const [isPublic, setIsPublic] = useState(initialIsPublic);
  const [shareSlug, setShareSlug] = useState(initialShareSlug);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const shareUrl = shareSlug ? `${process.env.NEXT_PUBLIC_APP_URL}/shared/${shareSlug}` : null;

  async function handleShare() {
    setLoading(true);
    try {
      const res = await fetch(`/api/definitions/${definitionId}/share`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Failed to share');
      const data = await res.json();
      setShareSlug(data.share_slug);
      setIsPublic(true);
    } catch {
      alert('Failed to enable sharing. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleUnshare() {
    setLoading(true);
    try {
      const res = await fetch(`/api/definitions/${definitionId}/unshare`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Failed to unshare');
      setShareSlug(null);
      setIsPublic(false);
    } catch {
      alert('Failed to disable sharing. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className='space-y-4'>
      <h2 className='text-base font-semibold text-gray-900'>Public sharing</h2>

      <section className='rounded-xl border border-gray-200 bg-white p-6 space-y-4'>
        <div className='flex items-center justify-between'>
          <div>
            <p className='font-medium text-gray-900'>Public sharing</p>
            <p className='text-sm text-gray-500'>
              {isPublic
                ? 'Anyone with the link can view this definition.'
                : 'Only you can see this definition.'}
            </p>
          </div>
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
              isPublic ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
            }`}
          >
            {isPublic ? 'Public' : 'Private'}
          </span>
        </div>

        {isPublic && shareUrl ? (
          <div className='space-y-3'>
            <div className='flex gap-2'>
              <input
                readOnly
                value={shareUrl}
                className='flex-1 rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-700 focus-visible:outline-none'
              />
              <button
                type='button'
                onClick={handleCopy}
                className='rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 transition-colors'
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <button
              type='button'
              onClick={handleUnshare}
              disabled={loading}
              className='w-full rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
            >
              {loading ? 'Updating…' : 'Stop sharing'}
            </button>
          </div>
        ) : (
          <button
            type='button'
            onClick={handleShare}
            disabled={loading}
            className='w-full rounded-lg bg-green-500 px-4 py-2 text-sm font-medium text-white hover:bg-green-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
          >
            {loading ? 'Generating link…' : 'Share this definition'}
          </button>
        )}
      </section>
    </div>
  );
}
