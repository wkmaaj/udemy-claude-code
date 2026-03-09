import { notFound } from 'next/navigation';
import db from '@/lib/db';
import { ContentRenderer } from './ContentRenderer';

interface Definition {
  arabic_word: string;
  content: string;
}

export default async function SharedDefinitionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const definition = db
    .query('SELECT arabic_word, content FROM definitions WHERE share_slug = ? AND is_public = 1')
    .get(slug) as Definition | null;

  if (!definition) notFound();

  return (
    <main className='min-h-screen bg-white px-4 py-12'>
      <article className='mx-auto max-w-2xl space-y-8'>
        <h1 dir='rtl' className='text-4xl font-bold text-right text-gray-900 leading-snug'>
          {definition.arabic_word}
        </h1>
        <ContentRenderer content={definition.content} />
      </article>
    </main>
  );
}
