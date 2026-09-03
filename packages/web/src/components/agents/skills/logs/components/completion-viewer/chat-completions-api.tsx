'use client';

import type {
  ChatCompletionRequestBody,
  ChatCompletionResponseBody,
} from '@shared/types/api/routes/chat-completions-api';
import { PrettyChatCompletionMessageRole } from '@shared/types/api/routes/shared/messages';
import type { RawSchema } from '@shared/types/api/routes/shared/tools';
import { FunctionCallCard } from '@web/components/agents/skills/logs/components/function-call-card';
import { GenericViewer } from '@web/components/agents/skills/logs/components/generic-viewer';
import { isArray } from 'lodash';

export function ChatCompletionsAPIViewer({
  logId,
  saRequestBody,
  saResponseBody,
}: {
  logId: string;
  saRequestBody: ChatCompletionRequestBody;
  saResponseBody: ChatCompletionResponseBody;
}): React.ReactElement {
  const language =
    'response_format' in saRequestBody
      ? saRequestBody.response_format?.type === 'json_object' ||
        saRequestBody.response_format?.type === 'json_schema'
        ? 'json'
        : 'text'
      : 'text';

  const rawSchema =
    'response_format' in saRequestBody
      ? saRequestBody.response_format?.type === 'json_schema'
        ? saRequestBody.response_format.json_schema.schema
        : undefined
      : undefined;

  const message = saResponseBody.choices[0].message;
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
          variant="response"
        >
          <div className="text-sm font-normal text-right">
            {PrettyChatCompletionMessageRole[message.role]}
          </div>
        </GenericViewer>
      )}
      {hasToolCalls &&
        message.tool_calls?.map((tc) => (
          <FunctionCallCard
            key={tc.id}
            name={tc.function.name}
            callId={tc.id}
            args={tc.function.arguments}
            variant="response"
          />
        ))}
    </div>
  );
}
