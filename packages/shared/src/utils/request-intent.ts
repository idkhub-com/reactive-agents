import { FunctionName } from '@shared/types/api/request';
import type { SuperAgentsRequestData } from '@shared/types/api/request/body';
import { ChatCompletionMessageRole } from '@shared/types/api/routes/shared/messages';
import { extractSystemPrompt } from '@shared/utils/system-prompt';

/** Enough of a prompt to identify the job; embedding models have input limits. */
const MAX_INTENT_LENGTH = 6000;
const MAX_USER_MESSAGE_LENGTH = 1000;

function toolName(tool: unknown): string | null {
  if (typeof tool !== 'object' || tool === null) {
    return null;
  }
  const record = tool as Record<string, unknown>;
  // Chat completions nest the name under `function`; the Responses API puts
  // it on the tool itself, and its built-in tools have only a type.
  const fn = record.function;
  if (typeof fn === 'object' && fn !== null) {
    const name = (fn as Record<string, unknown>).name;
    if (typeof name === 'string') {
      return name;
    }
  }
  if (typeof record.name === 'string') {
    return record.name;
  }
  if (typeof record.type === 'string') {
    return record.type;
  }
  return null;
}

function messageText(content: unknown): string {
  if (typeof content === 'string') {
    return content;
  }
  if (Array.isArray(content)) {
    return content
      .map((part) =>
        typeof part === 'object' &&
        part !== null &&
        typeof (part as { text?: unknown }).text === 'string'
          ? ((part as { text: string }).text as string)
          : '',
      )
      .filter(Boolean)
      .join('\n');
  }
  return '';
}

function firstUserMessage(
  saRequestData: SuperAgentsRequestData,
): string | null {
  let messages: unknown[];
  switch (saRequestData.functionName) {
    case FunctionName.CHAT_COMPLETE:
    case FunctionName.STREAM_CHAT_COMPLETE:
      messages = saRequestData.requestBody.messages;
      break;
    case FunctionName.CREATE_MODEL_RESPONSE: {
      const { input } = saRequestData.requestBody;
      if (typeof input === 'string') {
        return input || null;
      }
      messages = input;
      break;
    }
    default:
      return null;
  }

  for (const message of messages) {
    if (typeof message !== 'object' || message === null) {
      continue;
    }
    const { role, content } = message as { role?: unknown; content?: unknown };
    if (role !== ChatCompletionMessageRole.USER) {
      continue;
    }
    const text = messageText(content);
    if (text) {
      return text;
    }
  }
  return null;
}

/**
 * A short description of what a request is asking for, used to route it to a
 * skill.
 *
 * The system prompt is the strongest signal -- a tool sends the same one on
 * every request, whatever the user says -- so it comes first, followed by the
 * names of the tools on offer. Only a request with neither falls back to its
 * first user message. Returns `null` when there is nothing to go on, which
 * includes every endpoint that has no messages.
 */
export function describeRequestIntent(
  saRequestData: SuperAgentsRequestData,
): string | null {
  const parts: string[] = [];

  const systemPrompt = extractSystemPrompt(saRequestData);
  if (systemPrompt) {
    parts.push(systemPrompt);
  }

  const tools = (saRequestData.requestBody as { tools?: unknown }).tools;
  if (Array.isArray(tools)) {
    const names = tools.map(toolName).filter((name) => name !== null);
    if (names.length > 0) {
      parts.push(`Tools: ${names.join(', ')}`);
    }
  }

  if (parts.length === 0) {
    const first = firstUserMessage(saRequestData);
    if (first) {
      parts.push(first.slice(0, MAX_USER_MESSAGE_LENGTH));
    }
  }

  const intent = parts.join('\n\n').slice(0, MAX_INTENT_LENGTH);
  return intent || null;
}
