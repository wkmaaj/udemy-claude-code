import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import db from '@/lib/db';

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  const definition = db
    .query('SELECT id FROM definitions WHERE id = ? AND user_id = ?')
    .get(id, session.user.id);

  if (!definition) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  db.query(
    "UPDATE definitions SET is_public = 0, share_slug = NULL, updated_at = datetime('now') WHERE id = ?",
  ).run(id);

  return NextResponse.json({ success: true });
}
