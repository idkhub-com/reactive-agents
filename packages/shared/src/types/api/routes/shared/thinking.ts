export enum ReasoningEffort {
  /**
   * No reasoning at all. OpenAI's newer models take it, and Ollama's
   * OpenAI-compatible endpoint maps it to turning thinking off.
   */
  NONE = 'none',
  MINIMAL = 'minimal',
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

export enum ReasoningSummary {
  AUTO = 'auto',
  CONCISE = 'concise',
  DETAILED = 'detailed',
}
