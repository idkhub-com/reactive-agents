import { describe, expect, it } from 'vitest';

// Mock the extractTaskAndOutcome function
function extractTaskAndOutcome(extractionResult: {
  reasoning?: string;
  metadata?: Record<string, unknown>;
}): { task: string; outcome: string } {
  const reasoning = extractionResult.reasoning || '';
  const metadata = (extractionResult.metadata || {}) as Record<string, unknown>;

  // Check if this is a fallback result (API error, etc.)
  if (metadata.fallback === true) {
    return { task: '', outcome: '' };
  }

  // Try to get structured data from metadata first
  let task = typeof metadata.task === 'string' ? metadata.task : '';
  let outcome = typeof metadata.outcome === 'string' ? metadata.outcome : '';

  // If not found in top-level metadata, check nested metadata structure
  if (!task || !outcome) {
    const nestedMetadata = metadata.metadata as Record<string, unknown>;
    if (nestedMetadata) {
      if (!task && typeof nestedMetadata.task === 'string') {
        task = nestedMetadata.task;
      }
      if (!outcome && typeof nestedMetadata.outcome === 'string') {
        outcome = nestedMetadata.outcome;
      }
    }
  }

  // If still not found, try to extract from nested metadata reasoning
  if (!task || !outcome) {
    const nestedMetadata = metadata.metadata as Record<string, unknown>;
    if (nestedMetadata && typeof nestedMetadata.reasoning === 'string') {
      const nestedReasoning = nestedMetadata.reasoning;

      // Try to extract task and outcome from the reasoning text
      // Look for patterns like "The user was trying to..." and "However, the actual outcome was..."
      const taskMatch = nestedReasoning.match(
        /The user (?:was trying to|requested|wanted to|asked to) (.+?)(?:\.|,|;|however|but)/i,
      );
      const outcomeMatch = nestedReasoning.match(
        /(?:However, the actual outcome was|the outcome was|the result was) (.+?)(?:\.|,|;|therefore|so)/i,
      );

      if (!task && taskMatch) {
        task = taskMatch[1].trim();
      }
      if (!outcome && outcomeMatch) {
        outcome = outcomeMatch[1].trim();
      }
    }
  }

  // Fallback: try to parse JSON from reasoning
  if (!task || !outcome) {
    try {
      const parsed = JSON.parse(reasoning) as Record<string, unknown>;
      if (!task && typeof parsed.task === 'string') task = parsed.task;
      if (!outcome && typeof parsed.outcome === 'string')
        outcome = parsed.outcome;
    } catch {
      console.warn(
        'Failed to parse JSON from extraction reasoning:',
        reasoning,
      );
    }
  }

  return { task, outcome };
}

describe('extractTaskAndOutcome', () => {
  it('should extract task and outcome from nested metadata reasoning', () => {
    const extractionResult = {
      score: 1,
      reasoning: 'Structured data extracted successfully',
      metadata: {
        score: 0.9,
        reasoning:
          'The user was trying to obtain the current time for New York, as indicated by the function call to `get_current_time` with the specified location and timezone. However, the actual outcome was that a function call was prepared to get the current time for New York, but no actual time was returned.',
        metadata: {},
      },
    };

    const result = extractTaskAndOutcome(extractionResult);

    expect(result.task).toBe('obtain the current time for New York');
    expect(result.outcome).toBe(
      'a function call was prepared to get the current time for New York, but no actual time was returned',
    );
  });

  it('should extract task and outcome from weather example', () => {
    const extractionResult = {
      score: 1,
      reasoning: 'Structured data extracted successfully',
      metadata: {
        score: 0.9,
        reasoning:
          'The user was trying to obtain the current weather information for Paris. However, the actual outcome was that a function call was prepared to get the current weather for Paris, but no actual weather data was returned or displayed.',
        metadata: {},
      },
    };

    const result = extractTaskAndOutcome(extractionResult);

    expect(result.task).toBe(
      'obtain the current weather information for Paris',
    );
    expect(result.outcome).toBe(
      'a function call was prepared to get the current weather for Paris, but no actual weather data was returned or displayed',
    );
  });

  it('should extract task and outcome from battery creation example', () => {
    const extractionResult = {
      score: 1,
      reasoning: 'Structured data extracted successfully',
      metadata: {
        score: 0.9,
        reasoning:
          'The user requested the creation of a battery with specific attributes: name, capacity, voltage, and current. However, no tools were called to perform this task, and the output was null, indicating that the task was not completed.',
        metadata: {},
      },
    };

    const result = extractTaskAndOutcome(extractionResult);

    expect(result.task).toBe(
      'the creation of a battery with specific attributes: name, capacity, voltage, and current',
    );
    expect(result.outcome).toBe(
      'no tools were called to perform this task, and the output was null, indicating that the task was not completed',
    );
  });

  it('should handle empty input gracefully', () => {
    const extractionResult = {
      score: 1,
      reasoning: 'Structured data extracted successfully',
      metadata: {
        score: 0.8,
        reasoning:
          "The interaction provided does not contain explicit information about the user's task. The input is empty, suggesting that the user has not yet specified their task. The assistant's response is a generic greeting, indicating readiness to assist but not addressing a specific task. Therefore, the task is inferred as the user seeking assistance, and the outcome is the assistant offering help.",
        metadata: {},
      },
    };

    const result = extractTaskAndOutcome(extractionResult);

    // This case doesn't have clear task/outcome patterns, so should return empty strings
    expect(result.task).toBe('');
    expect(result.outcome).toBe('');
  });
});
