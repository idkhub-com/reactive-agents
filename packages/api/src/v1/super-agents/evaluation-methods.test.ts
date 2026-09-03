import { taskCompletionEvaluationConnector } from '@api/connectors/evaluations/task-completion';
import { turnRelevancyEvaluationConnector } from '@api/connectors/evaluations/turn-relevancy';
import type { AppEnv } from '@api/types/hono';
import { evaluationMethodsRouter } from '@api/v1/super-agents/evaluation-methods';
import { Hono } from 'hono';
import { testClient } from 'hono/testing';
import { describe, expect, it } from 'vitest';

/**
 * The JSON schema this endpoint publishes is a contract, not a debug dump:
 * the dashboard's evaluation form builds every control from it. Which
 * parameters exist, which are optional, which are a choice rather than free
 * text, and what each one means all come from here.
 *
 * That contract is Zod's to keep, and Zod could change it -- so it is pinned
 * against the real schemas rather than assumed. Each expectation below is
 * something the form reads.
 */

const app = new Hono<AppEnv>()
  .use('*', async (c, next) => {
    c.set('evaluation_connectors_map', {
      turn_relevancy: turnRelevancyEvaluationConnector,
      task_completion: taskCompletionEvaluationConnector,
    } as never);
    await next();
  })
  .route('/', evaluationMethodsRouter);

interface Method {
  method: string;
  parameterSchema: {
    properties: Record<
      string,
      {
        type?: string;
        enum?: string[];
        description?: string;
        default?: unknown;
        exclusiveMinimum?: number;
      }
    >;
    required?: string[];
  };
}

const methods = async (): Promise<Method[]> => {
  const response = await testClient(app).index.$get();
  expect(response.status).toBe(200);
  return (await response.json()) as unknown as Method[];
};

describe('the parameter schema the dashboard builds its form from', () => {
  it('lists a parameter that always has a value as required', async () => {
    const [relevancy] = await methods();

    // A defaulted field is required in the emitted schema, because the parsed
    // value always carries it. The form reads `required` to decide which
    // parameters it may offer to clear -- get this backwards and it offers to
    // clear a parameter the API then rejects.
    expect(relevancy.parameterSchema.required).toEqual(
      expect.arrayContaining(['threshold', 'temperature', 'batch_size']),
    );
  });

  it('leaves the judge overrides out of required, which is what unset means', async () => {
    for (const method of await methods()) {
      const required = method.parameterSchema.required ?? [];

      // Absent from an evaluation means "follow the system setting", and the
      // form can only express that for a parameter the schema calls optional.
      expect(required).not.toContain('max_tokens');
      expect(required).not.toContain('reasoning_effort');
      expect(method.parameterSchema.properties.max_tokens).toBeDefined();
      expect(method.parameterSchema.properties.reasoning_effort).toBeDefined();
    }
  });

  it('publishes the reasoning effort as a choice, with its values', async () => {
    const [relevancy] = await methods();
    const effort = relevancy.parameterSchema.properties.reasoning_effort;

    // Without `enum` the form falls back to a text box, which accepts a typo
    // and fails only on save.
    expect(effort.enum).toEqual(['none', 'minimal', 'low', 'medium', 'high']);
  });

  it('publishes the token budget as a positive integer', async () => {
    const [relevancy] = await methods();
    const budget = relevancy.parameterSchema.properties.max_tokens;

    // The form turns the exclusive bound into the input's `min`; a `number`
    // here rather than an `integer` would also let a fraction through.
    expect(budget.type).toBe('integer');
    expect(budget.exclusiveMinimum).toBe(0);
  });

  it('carries the description each control shows beneath its label', async () => {
    const [relevancy, completion] = await methods();

    // This is how an unset parameter says what it falls back to.
    expect(relevancy.parameterSchema.properties.max_tokens.description).toMatch(
      /system setting/i,
    );
    expect(
      relevancy.parameterSchema.properties.reasoning_effort.description,
    ).toMatch(/system setting/i);
    expect(completion.parameterSchema.properties.task.description).toBeTruthy();
  });

  it('keeps the defaults the form resets to', async () => {
    const [relevancy] = await methods();

    expect(relevancy.parameterSchema.properties.threshold.default).toBe(0.7);
    expect(relevancy.parameterSchema.properties.temperature.default).toBe(0.1);
  });
});
