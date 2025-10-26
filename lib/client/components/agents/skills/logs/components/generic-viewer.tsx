'use client';

import { TextViewer } from '@client/components/agents/skills/logs/components/text-viewer';
import { MonacoEditor } from '@client/components/monaco-editor';
import { Button } from '@client/components/ui/button';
import { Separator } from '@client/components/ui/separator';
import { cn } from '@client/utils/ui/utils';
import type { RawSchema } from '@shared/types/api/routes/shared/tools';
import Ajv, { type ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';
import { AlertTriangleIcon, CopyIcon, SaveIcon } from 'lucide-react';
import { useTheme } from 'next-themes';
import { type ReactNode, useEffect, useState } from 'react';

export const PrettyLanguage: Record<string, string> = {
  json: 'JSON',
  text: 'Text',
};

export interface DataCardProps {
  path: string;
  children?: ReactNode;
  language: string;
  defaultValue: string;
  rawSchema?: RawSchema;
  readOnly?: boolean;
  onSave?: (value: string) => Promise<void>;
  onDelete?: () => Promise<void>;
  onSelect?: (selectedText: string) => void;
  wordWrap?: boolean;
  className?: string;
}
export function GenericViewer({
  path,
  children,
  language,
  defaultValue,
  rawSchema,
  readOnly = false,
  onSave,
  onSelect,
  wordWrap = true,
  className,
}: DataCardProps): React.ReactElement {
  const { resolvedTheme } = useTheme();
  const [isValid, setIsValid] = useState(true);
  const [isModified, setIsModified] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [value, setValue] = useState(defaultValue);
  const [schemaError, setSchemaError] = useState<string | null>(null);

  const [validateFunction, setValidateFunction] =
    useState<ValidateFunction | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: ✖ formatValue changes on every re-render and should not be used as a hook dependency.
  useEffect(() => {
    if (rawSchema) {
      const ajv = new Ajv({ allErrors: true });
      addFormats(ajv);
      try {
        const validateFunction_ = ajv.compile(rawSchema);
        setValidateFunction(validateFunction_);
        const formattedValue = formatValue(validateFunction_, defaultValue);
        setValue(formattedValue);
      } catch (error) {
        if (error instanceof Error) {
          setSchemaError(error.message);
        } else {
          setSchemaError('An unknown error occurred');
        }
      }
    } else {
      setValidateFunction(null);
      setValue(defaultValue);
    }
  }, [defaultValue, rawSchema]);

  function formatValue(
    validateFunction: ValidateFunction | null,
    value: string,
  ): string {
    if (!validateFunction) {
      return value;
    }

    try {
      const data = JSON.parse(value);
      const valid = validateFunction(data);
      if (!valid) {
        return defaultValue;
      }
      return JSON.stringify(data, null, 2);
    } catch (_error) {
      return defaultValue;
    }
  }

  function validateData(value: string): boolean {
    if (!validateFunction) {
      return true;
    }

    let valid = false;
    try {
      const data = JSON.parse(value);
      valid = validateFunction(data);
    } catch (_error) {
      return false;
    }
    return valid;
  }

  function handleEditorChange(newValue: string | undefined): void {
    if (newValue !== defaultValue) {
      setIsModified(true);
    } else {
      setIsModified(false);
    }
    setValue(newValue ?? '');
    const valid = validateData(newValue ? newValue : '');
    setIsValid(valid);
  }

  async function handleSave(value: string, autoFormat = false): Promise<void> {
    setIsSaving(true);
    const formattedValue = formatValue(validateFunction, value);
    if (onSave) {
      await onSave(formattedValue);
    }
    if (autoFormat) {
      setValue(formattedValue);
    }
    setIsModified(false);
    setIsSaving(false);
  }

  return (
    <div
      className={cn(
        'flex flex-col h-fit w-full gap-2 border rounded-lg overflow-hidden shrink-0 bg-card shadow-sm',
        className,
      )}
    >
      <div className="flex flex-col items-center p-2 border-b">
        <div className="flex flex-row gap-2 w-full justify-between items-center h-10">
          {children}
          <Separator orientation="vertical" />
          <div className="flex flex-row gap-2 w-full justify-between items-center">
            <div className="text-sm font-normal">
              {PrettyLanguage[language] || language}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={(): void => {
                navigator.clipboard.writeText(value);
              }}
            >
              <CopyIcon size={16} />
            </Button>
          </div>
        </div>
        {schemaError && (
          <div className="w-full text-orange-500 text-xs text-left flex flex-row items-center gap-2">
            <AlertTriangleIcon size={16} />
            {schemaError}
          </div>
        )}
      </div>
      {language === 'text' ? (
        <TextViewer
          readOnly={readOnly}
          content={value}
          className="h-fit w-full p-2 pb-4"
        />
      ) : (
        <div className="flex flex-row justify-center items-start h-[400px] gap-2">
          <div className="flex-1 h-full">
            <MonacoEditor
              path={path}
              className="h-[400px]"
              language={language}
              value={value}
              onChange={handleEditorChange}
              readOnly={readOnly}
              wordWrap={wordWrap}
              rawSchema={rawSchema}
              onSave={handleSave}
              onSelect={onSelect}
              theme={resolvedTheme === 'dark' ? 'vs-dark' : 'light'}
            />
          </div>
          {!readOnly && (
            <div className="flex flex-col justify-end gap-2 w-fit">
              <Button
                className={cn('h-7 px-2', !isValid && 'bg-red-500')}
                disabled={!isValid || !isModified || isSaving}
                onClick={(): Promise<void> => handleSave(value, true)}
              >
                <SaveIcon size={16} />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
