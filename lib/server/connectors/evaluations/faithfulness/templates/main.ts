import type {
  FaithfulnessTemplateConfig,
  FaithfulnessTemplateData,
} from '@server/connectors/evaluations/faithfulness/types';
import { faithfulnessScoringText } from '@server/connectors/evaluations/faithfulness/types';

export function getFaithfulnessTemplate(
  data: FaithfulnessTemplateData,
): FaithfulnessTemplateConfig {
  const verboseInstruction = data.verbose_mode
    ? '\nPlease provide detailed step-by-step reasoning for your evaluation, including specific examples from the context and answer.'
    : '';

  const jsonStructure = data.include_reason
    ? `{
  "criteria": {
    "faithfulness_score": <number between 0.0 and 1.0>,
    "supported_by_context": <true|false>,
    "no_contradictions": <true|false>,
    "consistent_facts": <true|false>,
    "unsupported_claims": <true|false>
  },
  "score": <number between 0.0 and 1.0>,
  "reasoning": "<detailed explanation of your evaluation>",
  "overall_success": <true|false>
}`
    : `{
  "criteria": {
    "faithfulness_score": <number between 0.0 and 1.0>,
    "supported_by_context": <true|false>,
    "no_contradictions": <true|false>,
    "consistent_facts": <true|false>,
    "unsupported_claims": <true|false>
  },
  "score": <number between 0.0 and 1.0>,
  "overall_success": <true|false>
}`;

  const systemPrompt = `You are an expert evaluator assessing whether an AI assistant's answer is faithful to the provided context.

Evaluate faithfulness based on the following criteria:
1. Context Support: Is the answer supported by the information in the context?
2. No Contradictions: Does the answer contradict any information in the context?
3. Consistent Facts: Are the facts in the answer consistent with the context?
4. Unsupported Claims: Does the answer make claims not supported by the context?${verboseInstruction}

Faithfulness Scoring Guidelines:
${faithfulnessScoringText}

Provide your evaluation as a JSON object with this exact structure:
${jsonStructure}`;

  const retrievalContextSection = data.retrieval_context
    ? `\n\nRetrieval Context:\n${data.retrieval_context}`
    : '';

  const userPrompt = `Context: ${data.context}

Answer: ${data.answer}${retrievalContextSection}

Please evaluate how faithful the answer is to the context.`;

  return {
    systemPrompt,
    userPrompt,
    outputFormat: 'json',
  };
}

export default getFaithfulnessTemplate;
