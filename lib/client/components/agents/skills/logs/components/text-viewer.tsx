import { defaultExtensions } from '@client/components/text-editor/extensions';
import { cn } from '@client/utils/ui/utils';
import { EditorContent, useEditor } from '@tiptap/react';
import { type ReactElement, useEffect } from 'react';

export const TextViewer = ({
  content,
  defaultContent,
  readOnly = false,
  className,
}: {
  content?: string;
  defaultContent?: string;
  readOnly?: boolean;
  className?: string;
}): ReactElement | null => {
  const editor = useEditor({
    extensions: [...defaultExtensions()],
    editorProps: {
      attributes: {
        class:
          'prose-base prose-stone dark:prose-invert prose-headings:font-title font-default focus:outline-none max-w-full w-full h-full',
      },
    },
    content: content ?? defaultContent,
    immediatelyRender: true,
    editable: !readOnly,
  });

  useEffect(() => {
    if (defaultContent) {
      if (editor) {
        editor.commands.setContent(defaultContent);
      }
    }
  }, [defaultContent, editor]);

  useEffect(() => {
    if (content) {
      if (editor) {
        editor.commands.setContent(content);
      }
    }
  }, [content, editor]);

  if (!editor) {
    return null;
  }
  return (
    <>
      {/* biome-ignore lint/a11y/useSemanticElements: Wrapper uses role button semantics to be focusable and clickable */}
      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e): void => {
          if (e.key === 'Enter' || e.key === ' ') {
            if (!readOnly) {
              editor?.chain().focus().run();
            }
          }
        }}
        onClick={(): void => {
          if (!readOnly) {
            editor?.chain().focus().run();
          }
        }}
        className={cn('flex w-full h-full overflow-hidden', className)}
      >
        <EditorContent
          editor={editor}
          className="flex editor viewer-user w-full h-fit font-editor antialiased break-keep"
        />
      </div>
    </>
  );
};
