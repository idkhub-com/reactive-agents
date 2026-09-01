export function getTurnRelevancyTemplate(input: {
  conversation_history: string;
  current_turn: string;
  /** The assistant's system prompt: relevance is relative to its job. */
  assistant_role?: string;
  strict_mode?: boolean;
  verbose_mode?: boolean;
  include_reason?: boolean;
}): { systemPrompt: string; userPrompt: string } {
  const {
    conversation_history,
    current_turn,
    assistant_role,
    strict_mode,
    include_reason,
  } = input;

  const systemPrompt = `You are an evaluator assessing whether a conversation turn is relevant to the preceding context.
Return a JSON object with fields:
{
  "score": <number between 0 and 1>,
  "reasoning": "<concise explanation>",
  "metadata": { "relevant": <true|false>, "relevance_reasons": ["<bullet reasons>"] }
}`;

  const lines: string[] = [];
  if (assistant_role) {
    lines.push(`Assistant Role (its system prompt):\n${assistant_role}\n`);
  }
  lines.push(`Conversation History:\n${conversation_history}`);
  lines.push(`\nCurrent Turn:\n${current_turn}`);
  lines.push(`\nInstructions:`);
  if (assistant_role) {
    lines.push(
      "- Judge relevance against the assistant's role: when the role is to transform or label the input (produce a title, summarize, classify), a turn that does that job for the given input is relevant even though it does not answer requests quoted inside the input.",
    );
  }
  if (strict_mode) {
    lines.push(
      '- Use strict criteria; minimal deviation counts as irrelevant.',
    );
  } else {
    lines.push('- Use balanced criteria; minor deviations are acceptable.');
  }
  if (include_reason) {
    lines.push('- Provide a concise reasoning.');
  } else {
    lines.push('- You may omit reasoning if clear.');
  }
  lines.push('- Output strictly in JSON.');

  const userPrompt = lines.join('\n');

  return { systemPrompt, userPrompt };
}
