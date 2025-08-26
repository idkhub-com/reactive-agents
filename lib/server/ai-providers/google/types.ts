import { CreateEmbeddingsRequestBody } from '@shared/types/api/routes/embeddings-api';
import { ChatCompletionToolFunction } from '@shared/types/api/routes/shared/tools';
import { z } from 'zod';

export const GroundingMetadata = z.object({
  web_search_queries: z.array(z.string()).optional(),
  search_entry_point: z.object({
    rendered_content: z.string(),
  }),
  grounding_supports: z.array(
    z.object({
      segment: z.object({
        start_index: z.number(),
        end_index: z.number(),
        text: z.string(),
      }),
      grounding_chunk_indices: z.array(z.number()),
      confidence_scores: z.array(z.number()),
    }),
  ),
  retrieval_metadata: z
    .object({
      web_dynamic_retrieval_score: z.number(),
    })
    .optional(),
});

export type GroundingMetadata = z.infer<typeof GroundingMetadata>;

export interface GoogleImageGenInstanceData {
  prompt: string;
}

export interface GoogleErrorResponse {
  error: {
    code: string;
    message: string;
    status: string;
    details: Record<string, unknown>[];
  };
}

export interface GoogleGenerateFunctionCall {
  name: string;
  args: Record<string, unknown>;
}

export const GoogleResponseCandidateContentPart = z.object({
  text: z.string().optional(),
  thought: z.string().optional(), // for models like gemini-2.0-flash-thinking-exp refer: https://ai.google.dev/gemini-api/docs/thinking-mode#streaming_model_thinking
  functionCall: z
    .object({
      name: z.string(),
      args: z.record(z.string(), z.unknown()),
    })
    .optional(),
});
export type GoogleResponseCandidateContentPart = z.infer<
  typeof GoogleResponseCandidateContentPart
>;

export const GoogleResponseCandidateContent = z.object({
  parts: z.array(GoogleResponseCandidateContentPart),
});
export type GoogleResponseCandidateContent = z.infer<
  typeof GoogleResponseCandidateContent
>;

export interface GoogleResponseCandidate {
  content: GoogleResponseCandidateContent;
  logprobsResult?: {
    topCandidates: [
      {
        candidates: [
          {
            token: string;
            logProbability: number;
          },
        ];
      },
    ];
    chosenCandidates: [
      {
        token: string;
        logProbability: number;
      },
    ];
  };
  finishReason: string;
  index: 0;
  safetyRatings: {
    category: string;
    probability: string;
  }[];
  groundingMetadata?: GroundingMetadata;
}

export interface GoogleGenerateContentResponse {
  modelVersion: string;
  candidates: GoogleResponseCandidate[];
  promptFeedback: {
    safetyRatings: {
      category: string;
      probability: string;
      probabilityScore: number;
      severity: string;
      severityScore: number;
    }[];
  };
  usageMetadata: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}

export const TextEmbedInstance = z.object({
  task_type: z.string(),
  content: z.string(),
});
export type TextEmbedInstance = z.infer<typeof TextEmbedInstance>;

export const MultimodalEmbedInstance = z.object({
  image: z
    .object({
      gcsUri: z.string().optional(),
      bytesBase64Encoded: z.string().optional(),
    })
    .optional(),
  text: z.string().optional(),
  video: z
    .object({
      gcsUri: z.string().optional(),
      bytesBase64Encoded: z.string().optional(),
      startOffsetSec: z.number().optional(),
      endOffsetSec: z.number().optional(),
      intervalSec: z.number().optional(),
    })
    .optional(),
});
export type MultimodalEmbedInstance = z.infer<typeof MultimodalEmbedInstance>;

export const EmbedInstancesData = z.union([
  TextEmbedInstance,
  MultimodalEmbedInstance,
]);
export type EmbedInstancesData = z.infer<typeof EmbedInstancesData>;

interface EmbedPredictionsResponse {
  embeddings: {
    values: number[];
    statistics: {
      truncated: string;
      token_count: number;
    };
  };
  imageEmbedding?: number[];
  textEmbedding?: number[];
  videoEmbeddings?: {
    embedding: number[];
    endOffsetSec: number;
    startOffsetSec: number;
  }[];
}

export interface GoogleEmbedResponse {
  predictions: EmbedPredictionsResponse[];
  metadata: {
    billableCharacterCount: number;
  };
  embedding: {
    values: number[];
  };
}

export const GoogleSearchTool = z.object({
  googleSearch: z.record(z.string(), z.unknown()),
});
export type GoogleSearchTool = z.infer<typeof GoogleSearchTool>;

export const GoogleFunctionsTool = z.object({
  functionDeclarations: z.array(ChatCompletionToolFunction),
});
export type GoogleFunctionsTool = z.infer<typeof GoogleFunctionsTool>;

export const GoogleSearchRetrievalTool = z.object({
  googleSearchRetrieval: z.object({
    dynamicRetrievalConfig: z
      .object({
        mode: z.string(),
        dynamicThreshold: z.string().optional(),
      })
      .optional(),
  }),
});
export type GoogleSearchRetrievalTool = z.infer<
  typeof GoogleSearchRetrievalTool
>;

export const GoogleTool = z.union([
  GoogleSearchTool,
  GoogleFunctionsTool,
  GoogleSearchRetrievalTool,
]);
export type GoogleTool = z.infer<typeof GoogleTool>;

type GoogleBatchJobStatus =
  | 'JOB_STATE_UNSPECIFIED'
  | 'JOB_STATE_QUEUED'
  | 'JOB_STATE_PENDING'
  | 'JOB_STATE_RUNNING'
  | 'JOB_STATE_SUCCEEDED'
  | 'JOB_STATE_FAILED'
  | 'JOB_STATE_CANCELLING'
  | 'JOB_STATE_CANCELLED'
  | 'JOB_STATE_PAUSED'
  | 'JOB_STATE_EXPIRED'
  | 'JOB_STATE_UPDATING'
  | 'JOB_STATE_PARTIALLY_SUCCEEDED';

export const GoogleBatchRecordInputConfig = z.object({
  instancesFormat: z.literal('jsonl'),
  gcsSource: z.object({
    uris: z.string(),
  }),
});
export type GoogleBatchRecordInputConfig = z.infer<
  typeof GoogleBatchRecordInputConfig
>;

export const GoogleBatchRecordOutputConfig = z.object({
  predictionsFormat: z.literal('jsonl'),
  gcsDestination: z.object({
    outputUriPrefix: z.string(),
  }),
});
export type GoogleBatchRecordOutputConfig = z.infer<
  typeof GoogleBatchRecordOutputConfig
>;

export interface GoogleBatchRecord {
  /**
   * @example projects/562188160088/locations/us-east4/batchPredictionJobs/{id}
   */
  name: string;
  displayName: string;
  /**
   * @example projects/562188160088/locations/us-east4/models/{model}
   */
  model: string;
  inputConfig: GoogleBatchRecordInputConfig;
  outputConfig: GoogleBatchRecordOutputConfig;
  outputInfo?: {
    gcsOutputDirectory: string;
  };
  state: GoogleBatchJobStatus;
  createTime: string;
  updateTime: string;
  modelVersionId: string;
  error?: {
    code: string;
    message: string;
  };
  startTime: string;
  endTime: string;
  completionsStats?: {
    successfulCount: string;
    failedCount: string;
    incompleteCount: string;
    successfulForecastPointCount: string;
  };
}

export interface GoogleListBatchesResponse {
  batchPredictionJobs: GoogleBatchRecord[];
  nextPageToken?: string;
}

export interface GoogleListFinetuneJobsResponse {
  tuningJobs: GoogleFinetuneRecord[];
  nextPageToken?: string;
}

export interface GoogleFinetuneRecord {
  name: string;
  state: GoogleBatchJobStatus;
  tunedModelDisplayName: string;
  description: string;
  createTime: string;
  startTime: string;
  endTime: string;
  updateTime: string;
  error: {
    code: string;
    message: string;
  };
  tunedModel?: {
    model: string;
    endpoint: string;
  };
  tuningDataStats?: {
    supervisedTuningDataStats: {
      tuningDatasetExampleCount: number;
      totalTuningCharacterCount: number;
      totalBillableTokenCount: number;
      tuningStepCount: number;
      userInputTokenDistribution: number;
    };
  };
  baseModel: string;
  source_model?: {
    baseModel: string;
  };
  supervisedTuningSpec: {
    trainingDatasetUri: string;
    validationDatasetUri: string;
    hyperParameters: {
      learningRateMultiplier: number;
      epochCount: number;
      adapterSize: number;
    };
  };
}

export interface embedding {
  value: number[];
}

export interface PalmEmbedResponse {
  embedding: embedding;
}

export enum GoogleMessageRole {
  USER = 'user',
  MODEL = 'model',
  SYSTEM = 'system',
  FUNCTION = 'function',
}

export interface GoogleFunctionCallMessagePart {
  functionCall: GoogleGenerateFunctionCall;
}

export interface GoogleFunctionResponseMessagePart {
  functionResponse: {
    name: string;
    response: {
      name?: string;
      content: string;
    };
  };
}

export interface GoogleInlineDataMessagePart {
  inlineData: {
    mimeType: string;
    data: string;
  };
}

export interface GoogleFileDataMessagePart {
  fileData: {
    mimeType: string;
    fileUri: string;
  };
}

export type GoogleMessagePart =
  | GoogleFunctionCallMessagePart
  | GoogleFunctionResponseMessagePart
  | GoogleInlineDataMessagePart
  | GoogleFileDataMessagePart
  | { text: string };
export const GoogleMessage = z.object({
  role: z.enum(GoogleMessageRole),
  parts: z.array(z.unknown()), // You may want to replace z.unknown() with a more specific schema for GoogleMessagePart if available
});
export type GoogleMessage = z.infer<typeof GoogleMessage>;

export enum GoogleToolChoiceType {
  AUTO = 'AUTO',
  ANY = 'ANY',
  NONE = 'NONE',
}

export const GoogleToolConfig = z.object({
  function_calling_config: z.object({
    mode: z.enum(GoogleToolChoiceType).optional(),
    allowed_function_names: z.array(z.string()).optional(),
  }),
});

export type GoogleToolConfig = z.infer<typeof GoogleToolConfig>;

export enum TaskType {
  RETRIEVAL_QUERY = 'RETRIEVAL_QUERY',
  RETRIEVAL_DOCUMENT = 'RETRIEVAL_DOCUMENT',
  SEMANTIC_SIMILARITY = 'SEMANTIC_SIMILARITY',
  CLASSIFICATION = 'CLASSIFICATION',
  CLUSTERING = 'CLUSTERING',
  QUESTION_ANSWERING = 'QUESTION_ANSWERING',
  FACT_VERIFICATION = 'FACT_VERIFICATION',
  CODE_RETRIEVAL_QUERY = 'CODE_RETRIEVAL_QUERY',
}

export const GoogleEmbedParams = CreateEmbeddingsRequestBody.extend({
  task_type: z.union([z.enum(TaskType), z.string()]),
  parameters: z
    .object({
      outputDimensionality: z.number(),
    })
    .optional(),
  dimensions: z.number().optional(),
  input: z.union([
    z.string(),
    z.array(z.string()),
    z.array(
      z.object({
        text: z.string(),
        image: z.object({ url: z.string(), base64: z.string() }).optional(),
        video: z
          .object({
            url: z.string(),
            base64: z.string(),
            start_offset: z.number().optional(),
            end_offset: z.number().optional(),
            interval: z.number().optional(),
          })
          .optional(),
      }),
    ),
  ]),
});

export type GoogleEmbedParams = z.infer<typeof GoogleEmbedParams>;

export interface GoogleImageGenResponse {
  predictions: {
    bytesBase64Encoded?: string;
    mimeType: string;
    raiFilteredReason?: string;
    safetyAttributes: {
      categories: string | string[];
      scores: unknown;
    };
  }[];
}
