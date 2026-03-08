import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { auth } from '@/lib/auth';
import db from '@/lib/db';
import { EditDefinitionForm } from './EditDefinitionForm';

interface Tag {
  id: string;
  name: string;
}

interface Definition {
  id: string;
  arabic_word: string;
  content: string;
  is_public: number;
  share_slug: string | null;
}

export default async function EditDefinitionPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) notFound();

  const { id } = await params;

  const definition = db
    .query(
      'SELECT id, arabic_word, content, is_public, share_slug FROM definitions WHERE id = ? AND user_id = ?',
    )
    .get(id, session.user.id) as Definition | null;

  if (!definition) notFound();

  const tags = db
    .query('SELECT id, name FROM tags WHERE user_id = ? ORDER BY name')
    .all(session.user.id) as Tag[];

  const definitionTags = db
    .query('SELECT tag_id FROM definition_tags WHERE definition_id = ?')
    .all(id) as { tag_id: string }[];

  return (
    <EditDefinitionForm
      definition={{
        ...definition,
        is_public: definition.is_public === 1,
      }}
      allTags={tags}
      initialTagIds={definitionTags.map((t) => t.tag_id)}
    />
  );
}
