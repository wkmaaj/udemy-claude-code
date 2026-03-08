'use client';

import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

export function ContentRenderer({ content }: { content: string }) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit],
    content: JSON.parse(content),
    editable: false,
  });

  return (
    <div className='prose prose-gray max-w-none'>
      <EditorContent editor={editor} />
    </div>
  );
}
