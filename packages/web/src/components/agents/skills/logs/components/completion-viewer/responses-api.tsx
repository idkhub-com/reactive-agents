'use client';

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
import { FunctionCallCard } from '@web/components/agents/skills/logs/components/function-call-card';
import { GenericViewer } from '@web/components/agents/skills/logs/components/generic-viewer';
import { useMemo } from 'react';

export function ResponsesAPIViewer({
  logId,
  saRequestBody,
  saResponseBody,
}: {
  logId: string;
  saRequestBody: ResponsesRequestBody;
  saResponseBody: ResponsesResponseBody;
}): React.ReactElement {
  const language =
    'text' in saRequestBody
      ? saRequestBody.text?.format?.type === 'json_schema'
        ? 'json'
        : 'text'
      : 'text';

  const rawSchema =
    'text' in saRequestBody ? saRequestBody.text?.format?.schema : undefined;

  const reasoningOutput = useMemo((): string | undefined => {
    for (const output of saResponseBody.output) {
      if (output.type === 'reasoning' && 'summary' in output) {
        // Handle reasoning output if it exists
        return output.summary.join('\n');
      }
    }
    return undefined;
  }, [saResponseBody.output]);

  const messageOutput = useMemo((): string => {
    for (const message of saResponseBody.output) {
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
  }, [saResponseBody.output]);

  const functionCalls = useMemo((): ResponsesAPIFunctionCall[] => {
    const calls: ResponsesAPIFunctionCall[] = [];
    for (const output of saResponseBody.output) {
      if (output.type === 'function_call' && 'name' in output) {
        calls.push(output as ResponsesAPIFunctionCall);
      }
    }
    return calls;
  }, [saResponseBody.output]);

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
          variant="response"
        >
          <div className="text-sm font-normal">
            {
              PrettyChatCompletionMessageRole[
                saResponseBody.output[0].type === 'message' &&
                'role' in saResponseBody.output[0]
                  ? saResponseBody.output[0].role
                  : saResponseBody.output[0].type === 'reasoning'
                    ? 'reasoning'
                    : ChatCompletionMessageRole.ASSISTANT
              ]
            }
          </div>
        </GenericViewer>
      )}
      {functionCalls.map((fc) => (
        <FunctionCallCard
          key={fc.call_id}
          name={fc.name}
          callId={fc.call_id}
          args={fc.arguments}
          variant="response"
        />
      ))}
    </div>
  );
}
