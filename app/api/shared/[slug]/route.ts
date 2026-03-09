import { NextResponse } from 'next/server';
import db from '@/lib/db';

export function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  return params.then(({ slug }) => {
    const definition = db
      .query(
        'SELECT id, arabic_word, content FROM definitions WHERE share_slug = ? AND is_public = 1',
      )
      .get(slug);

    if (!definition) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json(definition);
  });
}
