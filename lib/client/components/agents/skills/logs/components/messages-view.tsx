'use client';

import { GenericViewer } from '@client/components/agents/skills/logs/components/generic-viewer';
import { FunctionName } from '@shared/types/api/request';
import type { ReactiveAgentsRequestData } from '@shared/types/api/request/body';
import {
  type ChatCompletionMessage,
  ChatCompletionMessageRole,
  PrettyChatCompletionMessageRole,
} from '@shared/types/api/routes/shared/messages';
import { useEffect, useState } from 'react';

function getMessageValue(
  input: string | string[] | number[] | number[][],
): string {
  if (Array.isArray(input)) {
    if (typeof input[0] === 'string') {
      return input.join('\n');
    } else {
      return input.join(', ');
    }
  } else {
    return input;
  }
}

export function MessagesView({
  logId,
  raRequestData,
}: {
  logId: string;
  raRequestData: ReactiveAgentsRequestData;
}): React.ReactElement {
  const [messages, setMessages] = useState<ChatCompletionMessage[]>([]);

  useEffect(() => {
    if (raRequestData) {
      if (
        raRequestData.functionName === FunctionName.CHAT_COMPLETE ||
        raRequestData.functionName === FunctionName.STREAM_CHAT_COMPLETE
      ) {
        setMessages(raRequestData.requestBody.messages);
      } else if (
        raRequestData.functionName === FunctionName.COMPLETE ||
        raRequestData.functionName === FunctionName.STREAM_COMPLETE
      ) {
        const messageValue = getMessageValue(raRequestData.requestBody.prompt);
        setMessages([
          {
            role: ChatCompletionMessageRole.USER,
            content: messageValue,
          },
        ]);
      } else if (
        raRequestData.functionName === FunctionName.CREATE_MODEL_RESPONSE
      ) {
        if (typeof raRequestData.requestBody.input === 'string') {
          setMessages([
            {
              role: ChatCompletionMessageRole.USER,
              content: raRequestData.requestBody.input,
            },
          ]);
        } else {
          // Filter for message objects that have role property (ChatCompletionMessage)
          const messageInputs = raRequestData.requestBody.input.filter(
            (item): item is ChatCompletionMessage =>
              typeof item === 'object' && item !== null && 'role' in item,
          );
          setMessages(messageInputs);
        }
      } else if (raRequestData.functionName === FunctionName.EMBED) {
        const messageValue = getMessageValue(raRequestData.requestBody.input);
        setMessages([
          {
            role: ChatCompletionMessageRole.USER,
            content: messageValue,
          },
        ]);
      } else if (raRequestData.functionName === FunctionName.GENERATE_IMAGE) {
        setMessages([
          {
            role: ChatCompletionMessageRole.USER,
            content: raRequestData.requestBody.prompt,
          },
        ]);
      }
    }
  }, [raRequestData]);

  return (
    <>
      {messages.map((message, index) => {
        const key = `${logId}-${message.role}-${String(message.content).slice(0, 20)}-${index}`;
        return (
          <GenericViewer
            key={key}
            path={key}
            language={'text'}
            defaultValue={message.content as string}
            readOnly={true}
            onSave={async (): Promise<void> => {
              //pass
            }}
            onSelect={(): void => {
              //pass
            }}
          >
            <div className="text-sm font-normal text-right">
              {PrettyChatCompletionMessageRole[message.role]}
            </div>
          </GenericViewer>
        );
      })}
    </>
  );
}
