import type { AppContext } from '@server/types/hono';
import type {
  FunctionName,
  IdkRequestBody,
  IdkRequestData,
} from '@shared/types/api/request';
import type { IdkTarget } from '@shared/types/api/request/headers';
import type {
  IdkResponseBody,
  ParameterConfig,
} from '@shared/types/api/response/body';
import type { AIProvider } from '@shared/types/constants';
import { z } from 'zod';

/**
 * Configuration for an AI provider.
 */
export interface AIProviderFunctionConfig {
  [key: string]: ParameterConfig | ParameterConfig[];
}

/**
 * Configuration for an AI provider's API.
 */
export interface InternalProviderAPIConfig {
  /** A function to generate the headers for the API request. */
  headers: (args: {
    c: AppContext;
    idkTarget: IdkTarget;
    idkRequestData: IdkRequestData;
  }) => Promise<Record<string, string>> | Record<string, string>;
  /** A function to generate the baseURL based on parameters */
  getBaseURL: (args: {
    c: AppContext;
    idkTarget: IdkTarget;
    idkRequestData: IdkRequestData;
  }) => Promise<string> | string;
  /** A function to generate the endpoint based on parameters */
  getEndpoint: (args: {
    c: AppContext;
    idkTarget: IdkTarget;
    idkRequestData: IdkRequestData;
  }) => string;
  /** A function to determine if the request body should be transformed to form data */
  transformToFormData?: (args: { idkRequestData: IdkRequestData }) => boolean;
  getProxyEndpoint?: (args: {
    idkTarget: IdkTarget;
    reqPath: string;
    reqQuery: string;
  }) => string;
  customFieldsSchema?: z.ZodType;
  /** Whether an API key is required for this provider. Defaults to true if not specified. */
  isAPIKeyRequired?: boolean;
}

/**
 * A collection of API configurations for multiple AI providers.
 */
export interface InternalProviderAPIConfigs {
  /** The API configuration for each provider, indexed by provider name. */
  [key: string]: InternalProviderAPIConfig;
}

export type RequestHandlerFunction = (params: {
  c: AppContext;
  idkTarget: IdkTarget;
  idkRequestData: IdkRequestData;
}) => Promise<Response>;

export type CustomTransformer<T, U> = (response: T, isError?: boolean) => U;

export type FunctionNameToFunctionConfig = {
  [K in FunctionName]?: AIProviderFunctionConfig;
};

export type ResponseTransformFunction = (
  aiProviderResponseBody: Record<string, unknown>,
  aiProviderResponseStatus: number,
  aiProviderResponseHeaders: Headers,
  strictOpenAiCompliance: boolean,
  idkRequestData: IdkRequestData,
) => IdkResponseBody;

export type StreamResponseTransformFunction = (
  aiProviderResponseBody: Record<string, unknown>,
  fallbackId: string,
  streamState: Record<string, unknown>,
  strictOpenAiCompliance: boolean,
) => string[];

export type ResponseChunkStreamTransformFunction = (
  responseChunk: string,
  fallbackId: string,
  streamState: Record<string, unknown>,
  strictOpenAiCompliance: boolean,
  idkRequestData: IdkRequestData,
) => string | string[];

export type JSONToStreamGeneratorTransformFunction = (
  aiProviderResponseBody: Record<string, unknown>,
  provider: AIProvider,
) => Generator<string, void, unknown>;

export type ResponseTransformFunctionType =
  | ResponseTransformFunction
  | StreamResponseTransformFunction
  | JSONToStreamGeneratorTransformFunction
  | ResponseChunkStreamTransformFunction;

/**
 * Configuration structure for AI providers.
 *
 * If the key is not defined here, it should be a mapping of FunctionName to InternalProviderConfig.
 */
export interface AIProviderConfig extends FunctionNameToFunctionConfig {
  api: InternalProviderAPIConfig;
  getConfig?: (
    idkRequestBody?: IdkRequestBody | ReadableStream | FormData | ArrayBuffer,
  ) => AIProviderConfig;
  requestTransforms?: {
    [K in FunctionName]?: (body: ReadableStream) => ReadableStream;
  };
  requestHandlers?: {
    [key in FunctionName]?: RequestHandlerFunction;
  };
  responseTransforms?: {
    [K in FunctionName]?: ResponseTransformFunctionType;
  };
  forward_headers?: string[];
}

export const GatewayProvider = z.object({
  id: z.string(),
  name: z.string(),
  object: z.string(),
  description: z.string(),
  base_url: z.string(),
});

export type GatewayProvider = z.infer<typeof GatewayProvider>;
