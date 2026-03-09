import { headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import db from '@/lib/db';

const createSchema = z.object({
  arabic_word: z.string().min(1),
  content: z.record(z.string(), z.unknown()),
  tag_ids: z.array(z.string()).optional().default([]),
});

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = request.nextUrl;
  const q = searchParams.get('q')?.trim();
  const tag = searchParams.get('tag');
  const sort = searchParams.get('sort') ?? 'created_desc';

  const sortMap: Record<string, string> = {
    alpha_asc: 'd.arabic_word ASC',
    alpha_desc: 'd.arabic_word DESC',
    created_asc: 'd.created_at ASC',
    created_desc: 'd.created_at DESC',
    updated_asc: 'd.updated_at ASC',
    updated_desc: 'd.updated_at DESC',
  };
  const orderBy = sortMap[sort] ?? 'd.created_at DESC';

  const tagFilter = tag
    ? 'AND d.id IN (SELECT definition_id FROM definition_tags WHERE tag_id = ?)'
    : '';

  let rows: unknown[];

  if (q) {
    const args: unknown[] = [`${q}*`, session.user.id];
    if (tag) args.push(tag);
    rows = db
      .query(
        `SELECT d.id, d.arabic_word, d.content, d.is_public, d.share_slug, d.created_at, d.updated_at
         FROM definitions d
         JOIN definitions_fts fts ON d.rowid = fts.rowid
         WHERE fts.definitions_fts MATCH ? AND d.user_id = ?
         ${tagFilter}
         ORDER BY rank`,
      )
      .all(...args);
  } else {
    const args: unknown[] = [session.user.id];
    if (tag) args.push(tag);
    rows = db
      .query(
        `SELECT d.id, d.arabic_word, d.content, d.is_public, d.share_slug, d.created_at, d.updated_at
         FROM definitions d
         WHERE d.user_id = ?
         ${tagFilter}
         ORDER BY ${orderBy}`,
      )
      .all(...args);
  }

  const definitions = (rows as { id: string; is_public: number }[]).map((row) => {
    const tags = db
      .query(
        `SELECT t.id, t.name FROM tags t
         JOIN definition_tags dt ON t.id = dt.tag_id
         WHERE dt.definition_id = ?`,
      )
      .all(row.id);
    return { ...row, is_public: row.is_public === 1, tags };
  });

  return NextResponse.json(definitions);
}

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const { arabic_word, content, tag_ids } = parsed.data;
  const id = crypto.randomUUID();

  db.query(`INSERT INTO definitions (id, user_id, arabic_word, content) VALUES (?, ?, ?, ?)`).run(
    id,
    session.user.id,
    arabic_word,
    JSON.stringify(content),
  );

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

  const definition = db
    .query(
      'SELECT id, arabic_word, content, is_public, share_slug, created_at, updated_at FROM definitions WHERE id = ?',
    )
    .get(id) as { is_public: number } & Record<string, unknown>;

  const tags = db
    .query(
      `SELECT t.id, t.name FROM tags t
       JOIN definition_tags dt ON t.id = dt.tag_id
       WHERE dt.definition_id = ?`,
    )
    .all(id);

  return NextResponse.json(
    { ...definition, is_public: definition.is_public === 1, tags },
    { status: 201 },
  );
}
