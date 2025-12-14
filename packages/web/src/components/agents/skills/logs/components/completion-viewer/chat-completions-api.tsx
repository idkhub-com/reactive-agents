'use client';

import { GenericViewer } from '@client/components/agents/skills/logs/components/generic-viewer';
import { Badge } from '@client/components/ui/badge';
import { Button } from '@client/components/ui/button';
import { Separator } from '@client/components/ui/separator';
import type {
  ChatCompletionRequestBody,
  ChatCompletionResponseBody,
} from '@shared/types/api/routes/chat-completions-api';
import { PrettyChatCompletionMessageRole } from '@shared/types/api/routes/shared/messages';
import type { RawSchema } from '@shared/types/api/routes/shared/tools';
import { isArray } from 'lodash';
import { CopyIcon, Wrench } from 'lucide-react';

export function ChatCompletionsAPIViewer({
  logId,
  raRequestBody,
  raResponseBody,
}: {
  logId: string;
  raRequestBody: ChatCompletionRequestBody;
  raResponseBody: ChatCompletionResponseBody;
}): React.ReactElement {
  const language =
    'response_format' in raRequestBody
      ? raRequestBody.response_format?.type === 'json_object' ||
        raRequestBody.response_format?.type === 'json_schema'
        ? 'json'
        : 'text'
      : 'text';

  const rawSchema =
    'response_format' in raRequestBody
      ? raRequestBody.response_format?.type === 'json_schema'
        ? raRequestBody.response_format.json_schema.schema
        : undefined
      : undefined;

  const message = raResponseBody.choices[0].message;
  const hasToolCalls =
    'tool_calls' in message &&
    message.tool_calls &&
    message.tool_calls.length > 0;

  return (
    <div className="flex flex-col gap-3">
      {message.content && (
        <GenericViewer
          path={`${logId}-completion`}
          language={language}
          defaultValue={
            isArray(message.content)
              ? message.content.map((c) => c.text).join('')
              : message.content
          }
          readOnly={false}
          onSave={async (): Promise<void> => {
            //pass
          }}
          onSelect={(): void => {
            //pass
          }}
          rawSchema={rawSchema as RawSchema}
          className="border-green-500"
        >
          <div className="text-sm font-normal text-right">
            {PrettyChatCompletionMessageRole[message.role]}
          </div>
        </GenericViewer>
      )}
      {hasToolCalls &&
        message.tool_calls?.map((tc) => {
          const args =
            typeof tc.function.arguments === 'string'
              ? tc.function.arguments
              : JSON.stringify(tc.function.arguments, null, 2);

          return (
            <div
              key={tc.id}
              className="flex flex-col h-fit w-full gap-2 border rounded-lg overflow-hidden shrink-0 bg-card"
            >
              <div className="flex flex-col items-center border-b">
                <div className="flex flex-row gap-2 w-full justify-between items-center h-10 px-2">
                  <div className="text-sm font-normal">Assistant</div>
                  <Separator orientation="vertical" />
                  <div className="flex flex-row gap-2 w-full justify-between items-center">
                    <div className="text-sm font-normal">Function Call</div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(): void => {
                        navigator.clipboard.writeText(args);
                      }}
                    >
                      <CopyIcon size={16} />
                    </Button>
                  </div>
                </div>
              </div>
              <div className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Wrench className="h-4 w-4 text-blue-600" />
                  <Badge variant="secondary" className="font-mono text-xs">
                    {tc.function.name}
                  </Badge>
                  <Badge variant="outline" className="font-mono text-xs">
                    {tc.id}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground mb-2">
                  Arguments:
                </div>
                <pre className="text-xs font-mono overflow-x-auto whitespace-pre-wrap">
                  {args}
                </pre>
              </div>
            </div>
          );
        })}
    </div>
  );
}
