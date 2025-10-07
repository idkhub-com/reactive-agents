import type {
  AnswerRelevancyTemplateConfig,
  AnswerRelevancyTemplateData,
} from '@server/connectors/evaluations/answer-relevancy/types';
import { answerRelevancyScoringText } from '@server/connectors/evaluations/answer-relevancy/types';

export function getAnswerRelevancyTemplate(
  data: AnswerRelevancyTemplateData,
): AnswerRelevancyTemplateConfig {
  const verboseInstruction = data.verbose_mode
    ? '\nPlease provide detailed step-by-step reasoning for your evaluation, including specific examples from the question and answer.'
    : '';

  const jsonStructure = data.include_reason
    ? `{
  "criteria": {
    "relevance_score": <number between 0.0 and 1.0>,
    "directly_addresses": <true|false>,
    "useful_information": <true|false>,
    "stays_on_topic": <true|false>,
    "irrelevant_content": <true|false>
  },
  "score": <number between 0.0 and 1.0>,
  "reasoning": "<detailed explanation of your evaluation>",
  "overall_success": <true|false>
}`
    : `{
  "criteria": {
    "relevance_score": <number between 0.0 and 1.0>,
    "directly_addresses": <true|false>,
    "useful_information": <true|false>,
    "stays_on_topic": <true|false>,
    "irrelevant_content": <true|false>
  },
  "score": <number between 0.0 and 1.0>,
  "overall_success": <true|false>
}`;

  const systemPrompt = `You are an expert evaluator assessing whether an AI assistant's answer is relevant to the user's question.

Evaluate answer relevancy based on the following criteria:
1. Direct Addressing: Does the answer directly address what was asked?
2. Useful Information: Is the information provided useful for answering the question?
3. Topic Consistency: Does the answer stay on topic throughout?
4. Irrelevant Content: Are there irrelevant details that don't help answer the question?${verboseInstruction}

Answer Relevancy Scoring Guidelines:
${answerRelevancyScoringText}

Provide your evaluation as a JSON object with this exact structure:
${jsonStructure}`;

  const contextSection = data.context ? `\n\nContext:\n${data.context}` : '';

  const userPrompt = `Question: ${data.question}

Answer: ${data.answer}${contextSection}

Please evaluate how relevant the answer is to the question.`;

  return {
    systemPrompt,
    userPrompt,
    outputFormat: 'json',
  };
}

// Export as default for template loader compatibility
export default getAnswerRelevancyTemplate;
