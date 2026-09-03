import { ReasoningEffort } from '@shared/types/api/routes/shared/thinking';
import type { SystemSettings } from '@shared/types/data/system-settings';
import { SystemSettingsOptions } from '@shared/types/data/system-settings';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import {
  buildOptionsPatch,
  type FormValues,
  SystemSettingsView,
} from '@web/components/settings/system-settings-view';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The settings page edits the skill arbiter's timeout in seconds while the
 * setting is stored in milliseconds. What matters here: the conversion both
 * ways, and that an impossible value never reaches the API.
 */

const { mockUpdate, mockToast } = vi.hoisted(() => ({
  mockUpdate: vi.fn(),
  mockToast: vi.fn(),
}));

const settings: SystemSettings = {
  id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  system_prompt_reflection_model_id: null,
  evaluation_generation_model_id: null,
  embedding_model_id: null,
  judge_model_id: null,
  skill_arbiter_model_id: null,
  intent_compaction_model_id: null,
  options: SystemSettingsOptions.parse({
    intent_compaction: { timeout_ms: 15_000 },
  }),
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z',
};

vi.mock('@web/providers/system-settings', () => ({
  useSystemSettings: () => ({
    settings,
    isLoading: false,
    error: null,
    update: mockUpdate,
    isUpdating: false,
    refetch: vi.fn(),
  }),
}));

// No models: the model selectors stay empty and nothing counts as missing,
// so the save button exercises the timeout alone.
vi.mock('@web/providers/models', () => ({
  useModels: () => ({
    models: [],
    isLoading: false,
    setQueryParams: vi.fn(),
  }),
}));

vi.mock('@web/providers/ai-providers', () => ({
  useAIProviders: () => ({ aiProviderConfigs: [] }),
}));

vi.mock('@web/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

describe('SystemSettingsView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdate.mockResolvedValue(settings);
  });

  it('shows the arbiter timeout in seconds and saves it in milliseconds', async () => {
    render(<SystemSettingsView />);

    const timeout = screen.getByLabelText('Arbiter Timeout');
    expect(timeout).toHaveValue(15);

    fireEvent.change(timeout, { target: { value: '120' } });
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith({
        options: { skill_arbiter: { timeout_ms: 120_000 } },
      });
    });
  });

  it('shows the compaction timeout in seconds and saves it in milliseconds', async () => {
    render(<SystemSettingsView />);

    const timeout = screen.getByLabelText('Compaction Timeout');
    expect(timeout).toHaveValue(15);

    fireEvent.change(timeout, { target: { value: '120' } });
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith({
        options: { intent_compaction: { timeout_ms: 120_000 } },
      });
    });
  });

  it('refuses a compaction timeout outside the allowed range', async () => {
    render(<SystemSettingsView />);

    fireEvent.change(screen.getByLabelText('Compaction Timeout'), {
      target: { value: '0' },
    });
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Invalid compaction timeout',
          variant: 'destructive',
        }),
      );
    });
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('shows every internal timeout, and saves the ones that changed', async () => {
    render(<SystemSettingsView />);

    // Each timeout sits beside the model it bounds, in seconds.
    expect(screen.getByLabelText('Reflection Timeout')).toHaveValue(120);
    expect(screen.getByLabelText('Evaluation Generation Timeout')).toHaveValue(
      120,
    );
    expect(screen.getByLabelText('Embedding Timeout')).toHaveValue(30);
    expect(screen.getByLabelText('Judge Timeout')).toHaveValue(60);

    fireEvent.change(screen.getByLabelText('Judge Timeout'), {
      target: { value: '90' },
    });
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith({
        options: { judge: { timeout_ms: 90_000 } },
      });
    });
  });

  it('shows the judge token budget and saves it beside the judge timeout', async () => {
    render(<SystemSettingsView />);

    const budget = screen.getByLabelText('Judge Token Budget');
    expect(budget).toHaveValue(4000);

    fireEvent.change(budget, { target: { value: '16000' } });
    fireEvent.change(screen.getByLabelText('Judge Timeout'), {
      target: { value: '90' },
    });
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    // One patch for the judge, carrying both of its changed fields.
    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith({
        options: { judge: { timeout_ms: 90_000, max_tokens: 16_000 } },
      });
    });
  });

  it('refuses a judge token budget outside the allowed range', async () => {
    render(<SystemSettingsView />);

    fireEvent.change(screen.getByLabelText('Judge Token Budget'), {
      target: { value: '10' },
    });
    expect(
      screen.getByText(/whole number of tokens between 256 and 1000000/),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Invalid judge token budget',
          variant: 'destructive',
        }),
      );
    });
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('saves developer mode as an option', async () => {
    render(<SystemSettingsView />);

    fireEvent.click(screen.getByRole('switch'));
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith({
        options: { developer_mode: true },
      });
    });
  });

  it('names the timeout it refuses', async () => {
    render(<SystemSettingsView />);

    fireEvent.change(screen.getByLabelText('Embedding Timeout'), {
      target: { value: '0' },
    });
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Invalid embedding timeout',
          variant: 'destructive',
        }),
      );
    });
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('refuses a timeout outside the allowed range', async () => {
    render(<SystemSettingsView />);

    fireEvent.change(screen.getByLabelText('Arbiter Timeout'), {
      target: { value: '0' },
    });
    // The "no models" notice is an alert too, so find the message by text.
    expect(
      screen.getByText(/whole number of seconds between 1 and 600/),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Invalid arbiter timeout',
          variant: 'destructive',
        }),
      );
    });
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('gives every text model a reasoning effort, at the model default', () => {
    render(<SystemSettingsView />);

    for (const label of [
      'Reflection Reasoning Effort',
      'Evaluation Generation Reasoning Effort',
      'Judge Reasoning Effort',
      'Arbiter Reasoning Effort',
      'Compaction Reasoning Effort',
    ]) {
      expect(screen.getByLabelText(label)).toHaveTextContent('Model default');
    }
  });

  it('offers no reasoning effort for the embedding model', () => {
    render(<SystemSettingsView />);

    expect(screen.getByLabelText('Embedding Timeout')).toBeInTheDocument();
    expect(
      screen.queryByLabelText('Embedding Reasoning Effort'),
    ).not.toBeInTheDocument();
  });
});

describe('buildOptionsPatch', () => {
  // What the form holds when nothing has been touched: the stored settings.
  const untouched: FormValues = {
    system_prompt_reflection_model_id: null,
    evaluation_generation_model_id: null,
    embedding_model_id: null,
    judge_model_id: null,
    skill_arbiter_model_id: null,
    intent_compaction_model_id: null,
    timeouts: {
      system_prompt_reflection: 120,
      evaluation_generation: 120,
      embedding: 30,
      judge: 60,
      skill_arbiter: 15,
      intent_compaction: 15,
    },
    reasoningEfforts: {
      system_prompt_reflection: null,
      evaluation_generation: null,
      judge: null,
      skill_arbiter: null,
      intent_compaction: null,
    },
    judge_max_tokens: 4_000,
    developer_mode: false,
  };

  it('sends nothing when nothing changed', () => {
    expect(buildOptionsPatch(untouched, settings)).toEqual({});
  });

  it('sends a chosen reasoning effort for any role, and null to clear one', () => {
    expect(
      buildOptionsPatch(
        {
          ...untouched,
          reasoningEfforts: {
            ...untouched.reasoningEfforts,
            skill_arbiter: ReasoningEffort.NONE,
            system_prompt_reflection: ReasoningEffort.HIGH,
          },
        },
        settings,
      ),
    ).toEqual({
      skill_arbiter: { reasoning_effort: 'none' },
      system_prompt_reflection: { reasoning_effort: 'high' },
    });

    const stored = {
      ...settings,
      options: {
        ...settings.options,
        judge: {
          ...settings.options.judge,
          reasoning_effort: ReasoningEffort.LOW,
        },
      },
    };
    expect(buildOptionsPatch(untouched, stored)).toEqual({
      judge: { reasoning_effort: null },
    });
  });

  it("folds every changed field of one role into that role's object", () => {
    expect(
      buildOptionsPatch(
        {
          ...untouched,
          timeouts: { ...untouched.timeouts, judge: 90 },
          judge_max_tokens: 16_000,
          reasoningEfforts: {
            ...untouched.reasoningEfforts,
            judge: ReasoningEffort.LOW,
          },
          developer_mode: true,
        },
        settings,
      ),
    ).toEqual({
      judge: {
        timeout_ms: 90_000,
        max_tokens: 16_000,
        reasoning_effort: 'low',
      },
      developer_mode: true,
    });
  });

  it('never sends an effort for the embedding role', () => {
    // It has none to send: an embedding is one forward pass.
    const patch = buildOptionsPatch(
      { ...untouched, timeouts: { ...untouched.timeouts, embedding: 45 } },
      settings,
    );

    expect(patch.embedding).toEqual({ timeout_ms: 45_000 });
  });
});
