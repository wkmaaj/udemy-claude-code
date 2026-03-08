import { headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import db from '@/lib/db';

const updateSchema = z.object({
  arabic_word: z.string().min(1).optional(),
  content: z.record(z.string(), z.unknown()).optional(),
  tag_ids: z.array(z.string()).optional(),
});

function getDefinitionWithTags(id: string) {
  const definition = db
    .query(
      'SELECT id, arabic_word, content, is_public, share_slug, created_at, updated_at FROM definitions WHERE id = ?',
    )
    .get(id) as ({ is_public: number } & Record<string, unknown>) | null;
  if (!definition) return null;
  const tags = db
    .query(
      `SELECT t.id, t.name FROM tags t
       JOIN definition_tags dt ON t.id = dt.tag_id
       WHERE dt.definition_id = ?`,
    )
    .all(id);
  return { ...definition, is_public: definition.is_public === 1, tags };
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  const existing = db
    .query('SELECT id FROM definitions WHERE id = ? AND user_id = ?')
    .get(id, session.user.id);
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  return NextResponse.json(getDefinitionWithTags(id));
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  const existing = db
    .query('SELECT id FROM definitions WHERE id = ? AND user_id = ?')
    .get(id, session.user.id);
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const { arabic_word, content, tag_ids } = parsed.data;

  if (arabic_word !== undefined || content !== undefined) {
    const updates: string[] = ["updated_at = datetime('now')"];
    const values: unknown[] = [];
    if (arabic_word !== undefined) {
      updates.push('arabic_word = ?');
      values.push(arabic_word);
    }
    if (content !== undefined) {
      updates.push('content = ?');
      values.push(JSON.stringify(content));
    }
    values.push(id);
    db.query(`UPDATE definitions SET ${updates.join(', ')} WHERE id = ?`).run(...values);
  }

  if (tag_ids !== undefined) {
    db.query('DELETE FROM definition_tags WHERE definition_id = ?').run(id);
    for (const tagId of tag_ids) {
      const tag = db
        .query('SELECT id FROM tags WHERE id = ? AND user_id = ?')
        .get(tagId, session.user.id);
      if (tag) {
        db.query('INSERT OR IGNORE INTO definition_tags (definition_id, tag_id) VALUES (?, ?)').run(
          id,
          tagId,
        );
      }
    }
  }

  return NextResponse.json(getDefinitionWithTags(id));
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  const existing = db
    .query('SELECT id FROM definitions WHERE id = ? AND user_id = ?')
    .get(id, session.user.id);
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  db.query('DELETE FROM definitions WHERE id = ?').run(id);

  return new NextResponse(null, { status: 204 });
}
