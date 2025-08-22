'use client';

import { GenericViewer } from '@client/components/logs-view/components/log-view/components/generic-viewer';
import type {
  ChatCompletionRequestBody,
  ChatCompletionResponseBody,
} from '@shared/types/api/routes/chat-completions-api';
import { PrettyChatCompletionMessageRole } from '@shared/types/api/routes/shared/messages';
import type { RawSchema } from '@shared/types/api/routes/shared/tools';
import { isArray } from 'lodash';

export function ChatCompletionsAPIViewer({
  logId,
  idkRequestBody,
  idkResponseBody,
}: {
  logId: string;
  idkRequestBody: ChatCompletionRequestBody;
  idkResponseBody: ChatCompletionResponseBody;
}): React.ReactElement {
  const language =
    'response_format' in idkRequestBody
      ? idkRequestBody.response_format?.type === 'json_object' ||
        idkRequestBody.response_format?.type === 'json_schema'
        ? 'json'
        : 'text'
      : 'text';

  const rawSchema =
    'response_format' in idkRequestBody
      ? idkRequestBody.response_format?.type === 'json_schema'
        ? idkRequestBody.response_format.json_schema.schema
        : undefined
      : undefined;

  return (
    <div className="">
      <GenericViewer
        path={`${logId}-completion`}
        language={language}
        defaultValue={
          idkResponseBody.choices[0].message.content
            ? isArray(idkResponseBody.choices[0].message.content)
              ? idkResponseBody.choices[0].message.content
                  .map((c) => c.text)
                  .join('')
              : idkResponseBody.choices[0].message.content
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
              idkResponseBody.choices[0].message.role
            ]
          }
        </div>
      </GenericViewer>
    </div>
  );
}
