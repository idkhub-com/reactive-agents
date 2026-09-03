import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { EvaluationEditView } from '@web/components/agents/skills/evaluations/evaluation-edit-view';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The parameters an evaluation may not have.
 *
 * The judge's token budget and reasoning effort are optional with no default:
 * absent means the evaluation follows system settings, and only a value
 * actually stored on it overrides them. A form that rendered whatever was in
 * `params` could therefore never show them, and never set one -- which is the
 * shape of every optional parameter, not just these two.
 */

const { mockUpdateEvaluation, mockToast, parameterSchema } = vi.hoisted(() => ({
  mockUpdateEvaluation: vi.fn(),
  mockToast: vi.fn(),
  /** The shape `z.toJSONSchema` produces for a method's parameters. */
  parameterSchema: {
    type: 'object',
    properties: {
      threshold: { type: 'number', default: 0.7, minimum: 0, maximum: 1 },
      temperature: { type: 'number', default: 0.1 },
      max_tokens: {
        type: 'integer',
        exclusiveMinimum: 0,
        description: 'Completion tokens one attempt may spend.',
      },
      reasoning_effort: {
        type: 'string',
        enum: ['none', 'low', 'high'],
        description: 'How hard the model may think first.',
      },
    },
    // Zod lists a defaulted field as required: what is missing here is what
    // is genuinely optional.
    required: ['threshold', 'temperature'],
  },
}));

const evaluation = {
  id: 'eval-1',
  skill_id: 'skill-1',
  evaluation_method: 'turn_relevancy',
  weight: 1,
  model_id: null,
  // What an evaluation created before these parameters existed looks like.
  params: { threshold: 0.7, temperature: 0.1 },
};

vi.mock('@web/api/v1/super-agents/skills', () => ({
  getEvaluationMethods: vi.fn().mockResolvedValue([
    {
      method: 'turn_relevancy',
      name: 'Turn Relevancy',
      description: 'Scores the turn.',
      parameterSchema,
    },
  ]),
}));

vi.mock('@web/providers/skills', () => ({
  useSkills: () => ({ selectedSkill: { id: 'skill-1', name: 'reviewer' } }),
}));

vi.mock('@web/providers/navigation', () => ({
  useNavigation: () => ({
    navigationState: { selectedEvaluationId: 'eval-1' },
  }),
}));

vi.mock('@web/providers/skill-optimization-evaluations', () => ({
  useSkillOptimizationEvaluations: () => ({
    evaluations: [evaluation],
    updateEvaluation: mockUpdateEvaluation,
    setSkillId: vi.fn(),
  }),
}));

vi.mock('@web/providers/models', () => ({
  useModels: () => ({ models: [], setQueryParams: vi.fn() }),
}));

vi.mock('@web/providers/ai-providers', () => ({
  useAIProviders: () => ({ aiProviderConfigs: [] }),
}));

vi.mock('@web/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock('@web/hooks/use-smart-back', () => ({ useSmartBack: () => vi.fn() }));

/** The params the form last saved. */
const savedParams = (): Record<string, unknown> =>
  (mockUpdateEvaluation.mock.calls[0][2] as { params: Record<string, unknown> })
    .params;

const save = () =>
  fireEvent.click(screen.getAllByRole('button', { name: /save changes/i })[0]);

describe('EvaluationEditView parameters', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateEvaluation.mockResolvedValue(undefined);
  });

  it('shows a parameter the evaluation does not have', async () => {
    render(<EvaluationEditView />);

    // Absent from `params`, and the only way to ever set one is to render it.
    const budget = await screen.findByLabelText('max tokens');
    expect(budget).toHaveValue(null);
    expect(budget).toHaveAttribute('placeholder', 'Not set');
  });

  it('renders an enum as a choice, not a text box', async () => {
    render(<EvaluationEditView />);

    const effort = await screen.findByLabelText('reasoning effort');
    // A Radix select trigger, showing the unset state.
    expect(effort).toHaveAttribute('role', 'combobox');
    expect(effort).toHaveTextContent('Not set');
  });

  it("explains itself with the schema's description", async () => {
    render(<EvaluationEditView />);

    expect(
      await screen.findByText('Completion tokens one attempt may spend.'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('How hard the model may think first.'),
    ).toBeInTheDocument();
  });

  it('saves a value typed into an unset parameter', async () => {
    render(<EvaluationEditView />);

    fireEvent.change(await screen.findByLabelText('max tokens'), {
      target: { value: '16000' },
    });
    save();

    await waitFor(() => expect(mockUpdateEvaluation).toHaveBeenCalled());
    expect(savedParams()).toMatchObject({ max_tokens: 16_000 });
  });

  it('leaves an untouched optional parameter out of the save', async () => {
    // Absent has to stay absent: the evaluation keeps following the settings
    // as they change, which storing today's value would end.
    render(<EvaluationEditView />);
    await screen.findByLabelText('max tokens');

    save();

    await waitFor(() => expect(mockUpdateEvaluation).toHaveBeenCalled());
    expect(savedParams()).not.toHaveProperty('max_tokens');
    expect(savedParams()).not.toHaveProperty('reasoning_effort');
    // The parameters it does have are untouched.
    expect(savedParams()).toMatchObject({ threshold: 0.7, temperature: 0.1 });
  });

  it('emptying the field clears the parameter rather than storing a zero', async () => {
    render(<EvaluationEditView />);
    const budget = await screen.findByLabelText('max tokens');

    fireEvent.change(budget, { target: { value: '16000' } });
    fireEvent.change(budget, { target: { value: '' } });
    save();

    await waitFor(() => expect(mockUpdateEvaluation).toHaveBeenCalled());
    expect(savedParams()).not.toHaveProperty('max_tokens');
  });

  it('offers a clear button only once the parameter has a value', async () => {
    render(<EvaluationEditView />);
    const budget = await screen.findByLabelText('max tokens');

    expect(
      screen.queryByRole('button', { name: /clear, leaving it unset/i }),
    ).not.toBeInTheDocument();

    fireEvent.change(budget, { target: { value: '16000' } });
    fireEvent.click(
      screen.getByRole('button', { name: /clear, leaving it unset/i }),
    );
    save();

    await waitFor(() => expect(mockUpdateEvaluation).toHaveBeenCalled());
    expect(savedParams()).not.toHaveProperty('max_tokens');
  });

  it('keeps a required parameter without a clear button', async () => {
    // `threshold` has a default and always exists; clearing it would mean
    // saving an evaluation the API would reject.
    render(<EvaluationEditView />);
    await screen.findByLabelText('threshold');

    expect(
      screen.queryByRole('button', { name: /clear, leaving it unset/i }),
    ).not.toBeInTheDocument();
  });
});
