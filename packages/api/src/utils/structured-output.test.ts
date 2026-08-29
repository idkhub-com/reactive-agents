import {
  extractJsonFromContent,
  unwrapJsonResponseContent,
} from '@api/utils/structured-output';
import { FunctionName } from '@shared/types/api/request';
import type { SuperAgentsRequestData } from '@shared/types/api/request/body';
import { describe, expect, it } from 'vitest';

function requestData(
  responseFormat: unknown,
  functionName: FunctionName = FunctionName.CHAT_COMPLETE,
): SuperAgentsRequestData {
  return {
    functionName,
    requestBody: {
      model: 'glm-5.3-flash:cloud',
      messages: [{ role: 'user', content: 'Hello' }],
      ...(responseFormat ? { response_format: responseFormat } : {}),
    },
  } as unknown as SuperAgentsRequestData;
}

const jsonSchemaFormat = {
  type: 'json_schema',
  json_schema: {
    name: 'params',
    strict: true,
    schema: { type: 'object', properties: { task: { type: 'string' } } },
  },
};

function chatResponse(content: string): Record<string, unknown> {
  return {
    id: 'chatcmpl-1',
    object: 'chat.completion',
    created: 1,
    model: 'glm-5.3-flash',
    choices: [
      {
        index: 0,
        finish_reason: 'stop',
        message: { role: 'assistant', content },
      },
    ],
  };
}

function contentOf(body: Record<string, unknown>): unknown {
  const choices = body.choices as { message: { content: unknown } }[];
  return choices[0].message.content;
}

describe('extractJsonFromContent', () => {
  it('unwraps a ```json fence', () => {
    expect(
      extractJsonFromContent('```json\n{\n  "task": "review code"\n}\n```'),
    ).toBe('{\n  "task": "review code"\n}');
  });

  it('unwraps an unlabelled fence', () => {
    expect(extractJsonFromContent('```\n{"task": "review code"}\n```')).toBe(
      '{"task": "review code"}',
    );
  });

  it('unwraps a fence surrounded by commentary', () => {
    expect(
      extractJsonFromContent(
        'Here you go:\n\n```json\n{"task": "a"}\n```\n\nHope that helps!',
      ),
    ).toBe('{"task": "a"}');
  });

  it('falls back to the outermost object when there is no fence', () => {
    expect(extractJsonFromContent('Sure! {"task": "a"} Let me know.')).toBe(
      '{"task": "a"}',
    );
  });

  it('handles a top-level array', () => {
    expect(extractJsonFromContent('```json\n[1, 2, 3]\n```')).toBe('[1, 2, 3]');
  });

  it('leaves content that is already JSON alone', () => {
    expect(extractJsonFromContent('{"task": "a"}')).toBeNull();
  });

  it('gives up when nothing in the content parses', () => {
    expect(extractJsonFromContent('I cannot answer that.')).toBeNull();
    expect(extractJsonFromContent('```json\n{"task": \n```')).toBeNull();
    expect(extractJsonFromContent('')).toBeNull();
  });
});

describe('unwrapJsonResponseContent', () => {
  it('unwraps fenced content when json_schema was requested', () => {
    const body = unwrapJsonResponseContent(
      requestData(jsonSchemaFormat),
      chatResponse('```json\n{"task": "a", "threshold": 0.7}\n```'),
    );

    expect(contentOf(body)).toBe('{"task": "a", "threshold": 0.7}');
    expect(JSON.parse(contentOf(body) as string)).toEqual({
      task: 'a',
      threshold: 0.7,
    });
  });

  it('unwraps fenced content when json_object was requested', () => {
    const body = unwrapJsonResponseContent(
      requestData({ type: 'json_object' }),
      chatResponse('```json\n{"task": "a"}\n```'),
    );

    expect(contentOf(body)).toBe('{"task": "a"}');
  });

  it('leaves the response untouched when no JSON format was requested', () => {
    const original = chatResponse('```json\n{"task": "a"}\n```');
    const body = unwrapJsonResponseContent(requestData(undefined), original);

    expect(body).toBe(original);
  });

  it('leaves the response untouched for other endpoints', () => {
    const original = chatResponse('```json\n{"task": "a"}\n```');
    const body = unwrapJsonResponseContent(
      requestData(jsonSchemaFormat, FunctionName.EMBED),
      original,
    );

    expect(body).toBe(original);
  });

  it('leaves content that is already JSON untouched', () => {
    const original = chatResponse('{"task": "a"}');
    const body = unwrapJsonResponseContent(
      requestData(jsonSchemaFormat),
      original,
    );

    expect(body).toBe(original);
  });

  it('leaves a response the provider did not answer with JSON alone', () => {
    const original = chatResponse('I cannot answer that.');
    const body = unwrapJsonResponseContent(
      requestData(jsonSchemaFormat),
      original,
    );

    expect(body).toBe(original);
  });

  it('survives a body without usable choices', () => {
    const original = { id: 'chatcmpl-1', object: 'chat.completion' };
    expect(
      unwrapJsonResponseContent(requestData(jsonSchemaFormat), original),
    ).toBe(original);

    const noContent = {
      choices: [{ index: 0, message: { role: 'assistant', content: null } }],
    };
    expect(
      unwrapJsonResponseContent(requestData(jsonSchemaFormat), noContent),
    ).toBe(noContent);
  });
});
