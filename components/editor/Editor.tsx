'use client';

import { EditorContent, useEditor, type JSONContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

interface EditorProps {
  content?: JSONContent;
  onChange?: (content: JSONContent) => void;
}

const TOOLBAR_CLASSES =
  'rounded px-2 py-1 text-sm hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors';
const ACTIVE_CLASSES = 'bg-gray-200 font-semibold';

export function Editor({ content, onChange }: EditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit],
    content: content ?? { type: 'doc', content: [{ type: 'paragraph' }] },
    onUpdate: ({ editor }) => {
      onChange?.(editor.getJSON());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-gray max-w-none min-h-[200px] px-4 py-3 focus:outline-none',
      },
    },
  });

  if (!editor) return null;

  return (
    <div className='rounded-lg border border-gray-300 bg-white overflow-hidden'>
      {/* Toolbar */}
      <div className='flex flex-wrap items-center gap-1 border-b border-gray-200 px-2 py-1 bg-gray-50'>
        {/* Text style dropdown */}
        <select
          value={
            editor.isActive('heading', { level: 1 })
              ? 'h1'
              : editor.isActive('heading', { level: 2 })
                ? 'h2'
                : editor.isActive('heading', { level: 3 })
                  ? 'h3'
                  : 'p'
          }
          onChange={(e) => {
            const val = e.target.value;
            if (val === 'p') editor.chain().focus().setParagraph().run();
            else
              editor
                .chain()
                .focus()
                .setHeading({ level: parseInt(val[1]) as 1 | 2 | 3 })
                .run();
          }}
          className='rounded border border-gray-300 px-2 py-1 text-sm bg-white hover:bg-gray-50 focus:outline-none'
        >
          <option value='p'>Normal</option>
          <option value='h1'>Heading 1</option>
          <option value='h2'>Heading 2</option>
          <option value='h3'>Heading 3</option>
        </select>

        <div className='w-px h-5 bg-gray-300 mx-1' />

        <button
          type='button'
          title='Bold'
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`${TOOLBAR_CLASSES} ${editor.isActive('bold') ? ACTIVE_CLASSES : ''}`}
        >
          <strong>B</strong>
        </button>

        <button
          type='button'
          title='Italic'
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`${TOOLBAR_CLASSES} ${editor.isActive('italic') ? ACTIVE_CLASSES : ''}`}
        >
          <em>I</em>
        </button>

        <button
          type='button'
          title='Inline code'
          onClick={() => editor.chain().focus().toggleCode().run()}
          className={`${TOOLBAR_CLASSES} font-mono ${editor.isActive('code') ? ACTIVE_CLASSES : ''}`}
        >
          {'<>'}
        </button>

        <div className='w-px h-5 bg-gray-300 mx-1' />

        <button
          type='button'
          title='Code block'
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          className={`${TOOLBAR_CLASSES} font-mono text-xs ${editor.isActive('codeBlock') ? ACTIVE_CLASSES : ''}`}
        >
          {'{ }'}
        </button>

        <button
          type='button'
          title='Bullet list'
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`${TOOLBAR_CLASSES} ${editor.isActive('bulletList') ? ACTIVE_CLASSES : ''}`}
        >
          ≡
        </button>

        <button
          type='button'
          title='Horizontal rule'
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          className={TOOLBAR_CLASSES}
        >
          —
        </button>
      </div>

      {/* Editor area */}
      <EditorContent editor={editor} />
    </div>
  );
}
