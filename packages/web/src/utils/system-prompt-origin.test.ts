import {
  describeSystemPromptOrigin,
  readServedConfiguration,
} from '@web/utils/system-prompt-origin';
import { describe, expect, it } from 'vitest';

describe('readServedConfiguration', () => {
  it('reads the configuration a log was served by', () => {
    expect(
      readServedConfiguration({
        served_configuration: {
          id: '11111111-1111-4111-8111-111111111111',
          name: '7',
        },
      }),
    ).toEqual({ id: '11111111-1111-4111-8111-111111111111', name: '7' });
  });

  it('returns null for a log written before it was recorded', () => {
    expect(readServedConfiguration({ skill_routing: {} })).toBeNull();
    expect(readServedConfiguration(null)).toBeNull();
  });
});

describe('describeSystemPromptOrigin', () => {
  const configuration = {
    id: '11111111-1111-4111-8111-111111111111',
    name: '7',
  };

  const unoptimized = { partition: null, configuration: null };

  it('names the partition and the configuration that served the request', () => {
    expect(
      describeSystemPromptOrigin({
        partition: '2',
        configuration,
        clientPrompt: 'You are the caller.',
        sentPrompt: 'You are the arm.',
      })?.label,
    ).toBe('partition 2 · configuration 7');
  });

  it('falls back to the partition when the configuration was not recorded', () => {
    expect(
      describeSystemPromptOrigin({
        partition: '2',
        configuration: null,
        clientPrompt: 'You are the caller.',
        sentPrompt: 'You are the arm.',
      })?.label,
    ).toBe('partition 2');
  });

  it('says so when the provider saw the prompt the client sent', () => {
    expect(
      describeSystemPromptOrigin({
        ...unoptimized,
        clientPrompt: 'You are the caller.',
        sentPrompt: 'You are the caller.',
      })?.label,
    ).toBe('as sent by the client');
  });

  it('says so when the gateway appended its own instructions', () => {
    expect(
      describeSystemPromptOrigin({
        ...unoptimized,
        clientPrompt: 'You are the caller.',
        sentPrompt: 'You are the caller.\n\nRespond with JSON alone.',
      })?.label,
    ).toBe('client prompt + gateway instructions');
  });

  it("says nothing when the prompt is neither the client's nor a partition's", () => {
    expect(
      describeSystemPromptOrigin({
        ...unoptimized,
        clientPrompt: 'You are the caller.',
        sentPrompt: 'Something else entirely.',
      }),
    ).toBeNull();
    expect(
      describeSystemPromptOrigin({
        ...unoptimized,
        clientPrompt: null,
        sentPrompt: 'You are the caller.',
      }),
    ).toBeNull();
  });
});
