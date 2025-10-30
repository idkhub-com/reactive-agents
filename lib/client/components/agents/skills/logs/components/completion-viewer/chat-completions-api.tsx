'use client';

import { GenericViewer } from '@client/components/agents/skills/logs/components/generic-viewer';
import type {
  ChatCompletionRequestBody,
  ChatCompletionResponseBody,
} from '@shared/types/api/routes/chat-completions-api';
import { PrettyChatCompletionMessageRole } from '@shared/types/api/routes/shared/messages';
import type { RawSchema } from '@shared/types/api/routes/shared/tools';
import { isArray } from 'lodash';

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

  return (
    <div className="">
      <GenericViewer
        path={`${logId}-completion`}
        language={language}
        defaultValue={
          raResponseBody.choices[0].message.content
            ? isArray(raResponseBody.choices[0].message.content)
              ? raResponseBody.choices[0].message.content
                  .map((c) => c.text)
                  .join('')
              : raResponseBody.choices[0].message.content
            : ''
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
          {
            PrettyChatCompletionMessageRole[
              raResponseBody.choices[0].message.role
            ]
          }
        </div>
      </GenericViewer>
    </div>
  );
}
