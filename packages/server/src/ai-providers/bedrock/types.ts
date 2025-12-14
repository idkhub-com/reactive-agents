import type { ErrorResponseBody } from '@shared/types/api/response';
import type { ChatCompletionRequestBody } from '@shared/types/api/routes/chat-completions-api/request';
import { z } from 'zod';

export const StreamContentBlock = z.object({
  cache_control: z.object({ type: z.literal('ephemeral') }).optional(),
  index: z.number(),
  delta: z.object({
    text: z.string().optional(),
    thinking: z.string().optional(),
    signature: z.string().optional(),
    data: z.string().optional(),
  }),
});

export type StreamContentBlock = z.infer<typeof StreamContentBlock>;

/** Batches */
interface BedrockBatch {
  clientRequestToken: string;
  endTime: string;
  inputDataConfig: {
    s3InputDataConfig: {
      s3Uri: string;
      s3BucketOwner: string;
      s3InputFormat: string;
    };
  };
  jobArn: string;
  jobExpirationTime: string;
  jobName: string;
  lastModifiedTime: string;
  message: string;
  modelId: string;
  outputDataConfig: {
    s3OutputDataConfig: {
      s3Uri: string;
      s3BucketOwner: string;
      s3EncryptionKeyId: string;
    };
  };
  roleArn: string;
  status: string;
  submitTime: string;
  timeoutDurationInHours: number;
  vpcConfig: {
    securityGroupIds: string[];
    subnetIds: string[];
  };
}

export interface BedrockGetBatchResponse extends BedrockBatch {}

export interface BedrockListBatchesResponse {
  invocationJobSummaries: BedrockBatch[];
  nextToken: string;
}

/** Finetunes */

export interface BedrockFinetuneRecord {
  baseModelArn: string;
  creationTime: string;
  customModelArn: string;
  customModelName: string;
  customizationType: string;
  endTime: string;
  jobArn: string;
  jobName: string;
  lastModifiedTime: string;
  status: 'Completed' | 'Failed' | 'InProgress' | 'Stopping' | 'Stopped';
  failureMessage?: string;
  validationDataConfig?: {
    s3Uri: string;
  };
  trainingDataConfig?: {
    s3Uri: string;
  };
  hyperParameters?: {
    learningRate: number;
    batchSize: number;
    epochCount: number;
  };
  outputModelName?: string;
  outputModelArn?: string;
}

// Define BatchRequest interface
export interface BedrockCreateBatchRequest {
  role_arn: string;
  input_file_id: string;
  endpoint?: string;
  completion_window?: string;
  model?: string;
  [key: string]: unknown;
}

export interface BedrockLlamaCompleteResponse {
  generation: string;
  prompt_token_count: number;
  generation_token_count: number;
  stop_reason: string;
}

export interface BedrockTitanCompleteResponse {
  inputTextTokenCount: number;
  results: {
    tokenCount: number;
    outputText: string;
    completionReason: string;
  }[];
}

export interface BedrockAI21CompleteResponse {
  id: number;
  prompt: {
    text: string;
    tokens: Record<string, unknown>[];
  };
  completions: [
    {
      data: {
        text: string;
        tokens: Record<string, unknown>[];
      };
      finishReason: {
        reason: string;
        length: number;
      };
    },
  ];
}

export interface BedrockAnthropicCompleteResponse {
  completion: string;
  stop_reason: string;
  stop: null | string;
}

export interface BedrockAnthropicStreamChunk {
  completion: string;
  stop_reason: string | null;
  stop: string | null;
  'amazon-bedrock-invocationMetrics': {
    inputTokenCount: number;
    outputTokenCount: number;
    invocationLatency: number;
    firstByteLatency: number;
  };
}

export interface BedrocMistralStreamChunk {
  outputs: {
    text: string;
    stop_reason: string | null;
  }[];
  'amazon-bedrock-invocationMetrics': {
    inputTokenCount: number;
    outputTokenCount: number;
    invocationLatency: number;
    firstByteLatency: number;
  };
}

export interface BedrockCohereCompleteResponse {
  id: string;
  generations: {
    id: string;
    text: string;
    finish_reason: string;
  }[];
  prompt: string;
}

export interface BedrockMistralCompleteResponse {
  outputs: {
    text: string;
    stop_reason: string;
  }[];
}

export interface BedrockCohereStreamChunk {
  text: string;
  is_finished: boolean;
  index?: number;
  finish_reason?: string;
  'amazon-bedrock-invocationMetrics': {
    inputTokenCount: number;
    outputTokenCount: number;
    invocationLatency: number;
    firstByteLatency: number;
  };
}

export interface BedrockTitanStreamChunk {
  outputText: string;
  index: number;
  totalOutputTextTokenCount: number;
  completionReason: string | null;
  'amazon-bedrock-invocationMetrics': {
    inputTokenCount: number;
    outputTokenCount: number;
    invocationLatency: number;
    firstByteLatency: number;
  };
}

export interface BedrockLlamaStreamChunk {
  generation: string;
  prompt_token_count: number;
  generation_token_count: number;
  stop_reason: string | null;
  'amazon-bedrock-invocationMetrics': {
    inputTokenCount: number;
    outputTokenCount: number;
    invocationLatency: number;
    firstByteLatency: number;
  };
}

/** Chat Completions */

export interface BedrockChatCompletionsParams
  extends ChatCompletionRequestBody {
  additionalModelRequestFields?: Record<string, unknown>;
  additional_model_request_fields?: Record<string, unknown>;
  additionalModelResponseFieldPaths?: string[];
  guardrailConfig?: {
    guardrailIdentifier: string;
    guardrailVersion: string;
    trace?: string;
  };
  guardrail_config?: {
    guardrailIdentifier: string;
    guardrailVersion: string;
    trace?: string;
  };
  anthropic_version?: string;
  countPenalty?: number;
}

export interface BedrockConverseAnthropicChatCompletionsParams
  extends Omit<BedrockChatCompletionsParams, 'anthropic_beta'> {
  anthropic_version?: string;
  user?: string;
  thinking?: {
    type: string;
    budget_tokens: number;
  };
  anthropic_beta?: string | string[];
}

export interface BedrockConverseCohereChatCompletionsParams
  extends BedrockChatCompletionsParams {
  frequency_penalty?: number;
  presence_penalty?: number;
  logit_bias?: Record<string, number>;
  n?: number;
}

export interface BedrockConverseAI21ChatCompletionsParams
  extends BedrockChatCompletionsParams {
  frequency_penalty?: number;
  presence_penalty?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  countPenalty?: number;
}

export interface BedrockChatCompleteStreamChunk {
  contentBlockIndex?: number;
  delta?: {
    text: string;
    toolUse: {
      toolUseId: string;
      name: string;
      input: object;
    };
    reasoningContent?: {
      text?: string;
      signature?: string;
      redactedContent?: string;
    };
  };
  start?: {
    toolUse: {
      toolUseId: string;
      name: string;
      input?: object;
    };
  };
  stopReason?: string;
  metrics?: {
    latencyMs: number;
  };
  usage?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    cacheReadInputTokenCount?: number;
    cacheReadInputTokens?: number;
    cacheWriteInputTokenCount?: number;
    cacheWriteInputTokens?: number;
  };
}

export type BedrockContentItem = {
  text?: string;
  toolUse?: {
    toolUseId: string;
    name: string;
    input: object;
  };
  toolResult?: {
    toolUseId: string;
    content: unknown[];
  };
  reasoningContent?: {
    reasoningText?: {
      signature: string;
      text: string;
    };
    redactedContent?: string;
  };
  image?: {
    source: {
      bytes: string;
    };
    format: string;
  };
  document?: {
    format: string;
    name: string;
    source: {
      bytes?: string;
      s3Location?: {
        uri: string;
      };
    };
  };
  cachePoint?: {
    type: string;
  };
};

export interface BedrockChatCompletionResponse {
  metrics: {
    latencyMs: number;
  };
  output: {
    message: {
      role: string;
      content: BedrockContentItem[];
    };
  };
  stopReason: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    cacheReadInputTokenCount?: number;
    cacheReadInputTokens?: number;
    cacheWriteInputTokenCount?: number;
    cacheWriteInputTokens?: number;
  };
}

/** Embeddings */

export interface BedrockTitanEmbedResponse {
  embedding: number[];
  inputTextTokenCount: number;
}

export interface BedrockErrorResponse extends ErrorResponseBody {
  message: string;
}
