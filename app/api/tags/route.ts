import { headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import db from '@/lib/db';

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const tags = db
    .query('SELECT id, name FROM tags WHERE user_id = ? ORDER BY name')
    .all(session.user.id);

  return NextResponse.json(tags);
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

  const name = (body as { name?: string }).name?.trim();
  if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

  const id = crypto.randomUUID();
  try {
    db.query('INSERT INTO tags (id, user_id, name) VALUES (?, ?, ?)').run(
      id,
      session.user.id,
      name,
    );
  } catch {
    return NextResponse.json({ error: 'Tag already exists' }, { status: 409 });
  }

  return NextResponse.json({ id, name }, { status: 201 });
}
