'use client';

import { GenericViewer } from '@client/components/agents/skills/logs/components/generic-viewer';
import { Badge } from '@client/components/ui/badge';
import { Button } from '@client/components/ui/button';
import { Separator } from '@client/components/ui/separator';
import { FunctionName } from '@shared/types/api/request';
import type { ReactiveAgentsRequestData } from '@shared/types/api/request/body';
import type {
  ResponsesAPIFunctionCall,
  ResponsesAPIFunctionCallOutput,
} from '@shared/types/api/routes/responses-api';
import {
  type ChatCompletionMessage,
  ChatCompletionMessageRole,
  PrettyChatCompletionMessageRole,
} from '@shared/types/api/routes/shared/messages';
import { Code, CopyIcon, Wrench } from 'lucide-react';
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
          // Convert Responses API input items to ChatCompletionMessage format
          const convertedMessages: ChatCompletionMessage[] = [];

          for (const item of raRequestData.requestBody.input) {
            if (typeof item !== 'object' || item === null) continue;

            // Regular chat messages
            if ('role' in item && 'content' in item) {
              convertedMessages.push(item as ChatCompletionMessage);
            }
            // Responses API function_call
            else if (
              'type' in item &&
              item.type === 'function_call' &&
              'name' in item
            ) {
              const functionCall = item as ResponsesAPIFunctionCall;
              convertedMessages.push({
                role: ChatCompletionMessageRole.ASSISTANT,
                content: null,
                tool_calls: [
                  {
                    id: functionCall.call_id,
                    type: 'function',
                    function: {
                      name: functionCall.name,
                      arguments: functionCall.arguments || '{}',
                    },
                  },
                ],
              });
            }
            // Responses API function_call_output
            else if (
              'type' in item &&
              item.type === 'function_call_output' &&
              'output' in item
            ) {
              const functionOutput = item as ResponsesAPIFunctionCallOutput;
              convertedMessages.push({
                role: ChatCompletionMessageRole.TOOL,
                content: functionOutput.output,
                tool_call_id: functionOutput.call_id,
              });
            }
            // Skip reasoning and other special types
          }

          setMessages(convertedMessages);
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

        // Handle tool role messages specially
        if (
          message.role === ChatCompletionMessageRole.TOOL &&
          'tool_call_id' in message
        ) {
          const toolContent =
            typeof message.content === 'string'
              ? message.content
              : JSON.stringify(message.content, null, 2);

          return (
            <div
              key={key}
              className="flex flex-col h-fit w-full gap-2 border rounded-lg overflow-hidden shrink-0 bg-card"
            >
              <div className="flex flex-col items-center border-b">
                <div className="flex flex-row gap-2 w-full justify-between items-center h-10 px-2">
                  <div className="text-sm font-normal">Tool</div>
                  <Separator orientation="vertical" />
                  <div className="flex flex-row gap-2 w-full justify-between items-center">
                    <div className="text-sm font-normal">Response</div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(): void => {
                        navigator.clipboard.writeText(toolContent);
                      }}
                    >
                      <CopyIcon size={16} />
                    </Button>
                  </div>
                </div>
              </div>
              <div className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Code className="h-4 w-4 text-green-600" />
                  <Badge variant="outline" className="font-mono text-xs">
                    {message.tool_call_id}
                  </Badge>
                </div>
                <div className="font-mono text-sm whitespace-pre-wrap">
                  {toolContent}
                </div>
              </div>
            </div>
          );
        }

        // Handle messages with tool calls
        if (
          'tool_calls' in message &&
          message.tool_calls &&
          message.tool_calls.length > 0
        ) {
          return (
            <div key={key} className="flex flex-col gap-3">
              {message.content && (
                <GenericViewer
                  path={`${key}-content`}
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
                  <div className="text-sm font-normal">
                    {PrettyChatCompletionMessageRole[message.role]}
                  </div>
                </GenericViewer>
              )}
              {message.tool_calls.map((tc) => {
                const args =
                  typeof tc.function.arguments === 'string'
                    ? tc.function.arguments
                    : JSON.stringify(tc.function.arguments, null, 2);

                return (
                  <div
                    key={`${key}-tc-${tc.id}`}
                    className="flex flex-col h-fit w-full gap-2 border rounded-lg overflow-hidden shrink-0 bg-card"
                  >
                    <div className="flex flex-col items-center border-b">
                      <div className="flex flex-row gap-2 w-full justify-between items-center h-10 px-2">
                        <div className="text-sm font-normal">Assistant</div>
                        <Separator orientation="vertical" />
                        <div className="flex flex-row gap-2 w-full justify-between items-center">
                          <div className="text-sm font-normal">
                            Function Call
                          </div>
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
                        <Badge
                          variant="secondary"
                          className="font-mono text-xs"
                        >
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

        // Regular messages (no tool calls)
        return (
          <GenericViewer
            key={key}
            path={key}
            language={'text'}
            defaultValue={(message.content as string) || ''}
            readOnly={true}
            onSave={async (): Promise<void> => {
              //pass
            }}
            onSelect={(): void => {
              //pass
            }}
          >
            <div className="text-sm font-normal">
              {PrettyChatCompletionMessageRole[message.role]}
            </div>
          </GenericViewer>
        );
      })}
    </>
  );
}
