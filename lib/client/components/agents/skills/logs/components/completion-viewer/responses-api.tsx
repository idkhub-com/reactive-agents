'use client';

import { GenericViewer } from '@client/components/agents/skills/logs/components/generic-viewer';
import { Badge } from '@client/components/ui/badge';
import { Button } from '@client/components/ui/button';
import { Separator } from '@client/components/ui/separator';
import type {
  ResponsesAPIFunctionCall,
  ResponsesRequestBody,
  ResponsesResponseBody,
} from '@shared/types/api/routes/responses-api';
import {
  ChatCompletionMessageRole,
  PrettyChatCompletionMessageRole,
} from '@shared/types/api/routes/shared/messages';
import type { RawSchema } from '@shared/types/api/routes/shared/tools';
import { CopyIcon, Wrench } from 'lucide-react';
import { useMemo } from 'react';

export function ResponsesAPIViewer({
  logId,
  raRequestBody,
  raResponseBody,
}: {
  logId: string;
  raRequestBody: ResponsesRequestBody;
  raResponseBody: ResponsesResponseBody;
}): React.ReactElement {
  const language =
    'text' in raRequestBody
      ? raRequestBody.text?.format?.type === 'json_schema'
        ? 'json'
        : 'text'
      : 'text';

  const rawSchema =
    'text' in raRequestBody ? raRequestBody.text?.format?.schema : undefined;

  const reasoningOutput = useMemo((): string | undefined => {
    for (const output of raResponseBody.output) {
      if (output.type === 'reasoning' && 'summary' in output) {
        // Handle reasoning output if it exists
        return output.summary.join('\n');
      }
    }
    return undefined;
  }, [raResponseBody.output]);

  const messageOutput = useMemo((): string => {
    for (const message of raResponseBody.output) {
      if (message.type === 'message' && 'role' in message) {
        if (message.role === ChatCompletionMessageRole.ASSISTANT) {
          // Check if this is a structured output with content
          if (
            'content' in message &&
            message.content &&
            message.content.length > 0
          ) {
            return message.content[0].text;
          }
          // Check if this is a refusal
          if ('refusal' in message && message.refusal) {
            return message.refusal;
          }
        }
      }
    }
    return '';
  }, [raResponseBody.output]);

  const functionCalls = useMemo((): ResponsesAPIFunctionCall[] => {
    const calls: ResponsesAPIFunctionCall[] = [];
    for (const output of raResponseBody.output) {
      if (output.type === 'function_call' && 'name' in output) {
        calls.push(output as ResponsesAPIFunctionCall);
      }
    }
    return calls;
  }, [raResponseBody.output]);

  return (
    <div className="flex flex-col gap-3">
      {reasoningOutput && (
        <div className="text-sm font-normal text-right">{reasoningOutput}</div>
      )}
      {messageOutput && (
        <GenericViewer
          path={`${logId}-completion`}
          language={language}
          defaultValue={messageOutput}
          readOnly={false}
          onSave={async (): Promise<void> => {
            //pass
          }}
          onSelect={(): void => {
            //pass
          }}
          rawSchema={rawSchema as RawSchema | undefined}
          className="border-green-500"
        >
          <div className="text-sm font-normal">
            {
              PrettyChatCompletionMessageRole[
                raResponseBody.output[0].type === 'message' &&
                'role' in raResponseBody.output[0]
                  ? raResponseBody.output[0].role
                  : raResponseBody.output[0].type === 'reasoning'
                    ? 'reasoning'
                    : ChatCompletionMessageRole.ASSISTANT
              ]
            }
          </div>
        </GenericViewer>
      )}
      {functionCalls.map((fc) => {
        const args =
          typeof fc.arguments === 'string'
            ? fc.arguments
            : JSON.stringify(fc.arguments, null, 2);

        return (
          <div
            key={fc.call_id}
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
                  {fc.name}
                </Badge>
                <Badge variant="outline" className="font-mono text-xs">
                  {fc.call_id}
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
