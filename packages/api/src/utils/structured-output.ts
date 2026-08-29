import { FunctionName } from '@shared/types/api/request';
import type { SuperAgentsRequestData } from '@shared/types/api/request/body';
import type { ChatCompletionRequestBody } from '@shared/types/api/routes/chat-completions-api';

/** Matches a markdown code fence and captures whatever sits inside it. */
const FENCED_BLOCK = /```[a-zA-Z0-9_-]*\r?\n?([\s\S]*?)```/g;

function isJson(text: string): boolean {
  try {
    JSON.parse(text);
    return true;
  } catch {
    return false;
  }
}

/**
 * Pulls the JSON out of a message that is *about* JSON rather than being JSON:
 * a markdown fence, or an object with commentary around it. Returns null when
 * the content is already valid JSON, or when nothing in it parses -- in both
 * cases the caller should leave the content alone.
 */
export function extractJsonFromContent(content: string): string | null {
  const trimmed = content.trim();
  if (trimmed === '' || isJson(trimmed)) return null;

  for (const match of trimmed.matchAll(FENCED_BLOCK)) {
    const fenced = match[1].trim();
    if (isJson(fenced)) return fenced;
  }

  // No usable fence: fall back to the outermost object or array in the text.
  const objectStart = trimmed.indexOf('{');
  const arrayStart = trimmed.indexOf('[');
  const start =
    objectStart === -1 || (arrayStart !== -1 && arrayStart < objectStart)
      ? arrayStart
      : objectStart;
  if (start === -1) return null;

  const end = trimmed.lastIndexOf(trimmed[start] === '{' ? '}' : ']');
  if (end <= start) return null;

  const candidate = trimmed.slice(start, end + 1);
  return isJson(candidate) ? candidate : null;
}

/**
 * Providers differ in how seriously they take `response_format`. The ones that
 * enforce a schema return bare JSON; the ones that only see the instruction in
 * the prompt -- self-hosted models through Ollama, most of all -- routinely
 * wrap it in a ```json fence. A client that asked for `json_schema` is entitled
 * to content it can hand to `JSON.parse` (the OpenAI SDK's `.parse()` does
 * exactly that and throws on the backticks), so the fence is stripped here, at
 * the boundary where the gateway makes providers look alike.
 *
 * Only chat completions that asked for a JSON response format are touched, and
 * only when the extracted text really is JSON; anything else is passed through
 * untouched so a provider's own reply still reaches the caller verbatim.
 */
export function unwrapJsonResponseContent(
  saRequestData: SuperAgentsRequestData,
  responseBody: Record<string, unknown>,
): Record<string, unknown> {
  if (saRequestData.functionName !== FunctionName.CHAT_COMPLETE) {
    return responseBody;
  }

  const responseFormat = (
    saRequestData.requestBody as ChatCompletionRequestBody
  )?.response_format;
  if (
    responseFormat?.type !== 'json_schema' &&
    responseFormat?.type !== 'json_object'
  ) {
    return responseBody;
  }

  const choices = responseBody.choices;
  if (!Array.isArray(choices)) return responseBody;

  let unwrapped = false;
  const nextChoices = choices.map((choice) => {
    const message = (choice as { message?: { content?: unknown } })?.message;
    if (typeof message?.content !== 'string') return choice;

    const json = extractJsonFromContent(message.content);
    if (json === null) return choice;

    unwrapped = true;
    return { ...choice, message: { ...message, content: json } };
  });

  return unwrapped ? { ...responseBody, choices: nextChoices } : responseBody;
}
