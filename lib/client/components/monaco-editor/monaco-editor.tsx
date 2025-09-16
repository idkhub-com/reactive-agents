'use client';

import { Editor } from '@monaco-editor/react';
import type { RawSchema } from '@shared/types/api/routes/shared/tools';
import type * as monacoEditor from 'monaco-editor';
import type { editor } from 'monaco-editor';
import { useCallback, useEffect, useRef, useState } from 'react';

export interface MonacoEditorProps {
  path: string;
  language: string;
  value: string;
  className?: string;
  theme?: 'light' | 'vs-dark';
  readOnly?: boolean;
  onChange?: (
    value: string | undefined,
    event: monacoEditor.editor.IModelContentChangedEvent,
  ) => void;
  wordWrap?: boolean;
  rawSchema?: RawSchema;
  onSave?: (value: string) => void;
  onSelect?: (value: string) => void;
}

export function MonacoEditor({
  path,
  language,
  value,
  className,
  theme = 'light',
  readOnly = false,
  onChange,
  onSave,
  wordWrap = true,
  rawSchema,
  onSelect,
}: MonacoEditorProps): React.ReactElement {
  const [content, setContent] = useState(value);
  const editorRef = useRef<editor.IStandaloneCodeEditor>(null);

  const [monaco, setMonaco] = useState<typeof monacoEditor>();

  useEffect(() => {
    setContent(value);
  }, [value]);

  function handleEditorChange(
    value: string | undefined,
    event: monacoEditor.editor.IModelContentChangedEvent,
  ): void {
    onChange?.(value, event);
    setContent(value ?? '');
  }

  const setSchema = useCallback(
    (monaco: typeof monacoEditor): void => {
      if (rawSchema) {
        try {
          if (!rawSchema) {
            return;
          }

          const prevSchemas =
            monaco.languages.json.jsonDefaults.diagnosticsOptions.schemas;

          const cleanSchemas = prevSchemas?.filter(
            (schema) => !schema.fileMatch?.includes(path),
          );

          const newSchema = {
            uri: `http://myserver/schema-${path}.json`,
            fileMatch: [path],
            schema: {
              description: rawSchema.description,
              type: 'object',
              properties: rawSchema.properties,
              additionalProperties: rawSchema.additionalProperties,
              required: rawSchema.required,
            },
          };

          const newSchemas = [...(cleanSchemas ?? []), newSchema];

          monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
            validate: true,
            schemas: newSchemas,
          });
        } catch (error) {
          console.error('Failed to set diagnostics options', error);
        }
      }
    },
    [rawSchema, path],
  );

  useEffect(() => {
    if (monaco) {
      setSchema(monaco);
    }
  }, [monaco, setSchema]);

  function handleEditorDidMount(
    editor: editor.IStandaloneCodeEditor,
    monaco: typeof monacoEditor,
  ): void {
    editorRef.current = editor;
    setMonaco(monaco);
  }

  return (
    <div
      role="application"
      aria-label="Code editor"
      onKeyDown={async (
        event: React.KeyboardEvent<HTMLDivElement>,
      ): Promise<void> => {
        if ((event.ctrlKey || event.metaKey) && event.key === 's') {
          event.preventDefault();
          event.stopPropagation();

          if (onSave) {
            // Auto format the document on save
            await editorRef.current
              ?.getAction('editor.action.formatDocument')
              ?.run();

            onSave(content);
          }
        }

        if ((event.ctrlKey || event.metaKey) && event.key === 'b') {
          event.preventDefault();
          event.stopPropagation();

          const selection = editorRef.current?.getSelection();
          if (selection) {
            const selectedText = editorRef.current
              ?.getModel()
              ?.getValueInRange(selection);
            onSelect?.(selectedText ?? '');
          }
        }
      }}
      className={className}
    >
      <Editor
        key={path}
        path={path}
        height={'100%'}
        language={language}
        value={content}
        theme={theme}
        options={{
          fontFamily: 'monospace',
          readOnly: readOnly,
          domReadOnly: readOnly,
          lineNumbers: 'on',
          minimap: {
            enabled: false,
          },
          scrollbar: {
            alwaysConsumeMouseWheel: false,
          },
          scrollBeyondLastColumn: 0,
          scrollBeyondLastLine: false,
          wordWrap: wordWrap ? 'bounded' : 'off',
          wordWrapColumn: 88,
        }}
        onChange={handleEditorChange}
        onMount={handleEditorDidMount}
      />
    </div>
  );
}
