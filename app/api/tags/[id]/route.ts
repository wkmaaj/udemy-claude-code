import { headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import db from '@/lib/db';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  const tag = db.query('SELECT id FROM tags WHERE id = ? AND user_id = ?').get(id, session.user.id);
  if (!tag) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  db.query('DELETE FROM tags WHERE id = ?').run(id);

  return new NextResponse(null, { status: 204 });
}
