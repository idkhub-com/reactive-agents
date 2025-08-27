export interface AgentConfig {
  model: string;
  maxTokens: number;
  temperature: number;
  llmAnalyzeTopN: number; // analyze only top-N vehicles with LLM to control cost
}

export const config: AgentConfig = {
  model: process.env.IDK_MODEL || 'gpt-4',
  maxTokens: Number(process.env.IDK_MAX_TOKENS || 1000),
  temperature: Number(process.env.IDK_TEMPERATURE || 0.3),
  llmAnalyzeTopN: Number(process.env.IDK_LLM_TOP_N || 10),
};
