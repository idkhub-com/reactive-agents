'use client';

import { GenericViewer } from '@client/components/logs-view/components/log-view/components/generic-viewer';
import type {
  ResponsesRequestBody,
  ResponsesResponseBody,
} from '@shared/types/api/routes/responses-api';
import {
  ChatCompletionMessageRole,
  PrettyChatCompletionMessageRole,
} from '@shared/types/api/routes/shared/messages';
import type { RawSchema } from '@shared/types/api/routes/shared/tools';
import { useMemo } from 'react';

export function ResponsesAPIViewer({
  logId,
  idkRequestBody,
  idkResponseBody,
}: {
  logId: string;
  idkRequestBody: ResponsesRequestBody;
  idkResponseBody: ResponsesResponseBody;
}): React.ReactElement {
  const language =
    'text' in idkRequestBody
      ? idkRequestBody.text?.format?.type === 'json_schema'
        ? 'json'
        : 'text'
      : 'text';

  const rawSchema =
    'text' in idkRequestBody ? idkRequestBody.text?.format?.schema : undefined;

  const reasoningOutput = useMemo((): string | undefined => {
    for (const output of idkResponseBody.output) {
      if (output.type === 'reasoning' && 'summary' in output) {
        // Handle reasoning output if it exists
        return output.summary.join('\n');
      }
    }
    return undefined;
  }, [idkResponseBody.output]);

  const messageOutput = useMemo((): string => {
    for (const message of idkResponseBody.output) {
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
  }, [idkResponseBody.output]);

  return (
    <div className="">
      {reasoningOutput && (
        <div className="text-sm font-normal text-right">{reasoningOutput}</div>
      )}
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
        <div className="text-sm font-normal text-right">
          {
            PrettyChatCompletionMessageRole[
              idkResponseBody.output[0].type === 'message' &&
              'role' in idkResponseBody.output[0]
                ? idkResponseBody.output[0].role
                : idkResponseBody.output[0].type === 'reasoning'
                  ? 'reasoning'
                  : ChatCompletionMessageRole.ASSISTANT
            ]
          }
        </div>
      </GenericViewer>
    </div>
  );
}
