import type { InternalProviderAPIConfig } from '@shared/types/ai-providers/config';
import {
  FunctionName,
  type ReactiveAgentsTarget,
} from '@shared/types/api/request';
import { AIProvider } from '@shared/types/constants';
import { getAccessToken, getBucketAndFile, getModelAndProvider } from './utils';

const getApiVersion = (provider: string): string => {
  if (provider === 'meta') return 'v1beta1';
  return 'v1';
};

const getProjectRoute = (
  raTarget: ReactiveAgentsTarget,
  inputModel: string,
): string => {
  const { vertex_project_id, vertex_region, vertex_service_account_json } =
    raTarget;
  let projectId = vertex_project_id;
  if (vertex_service_account_json) {
    projectId = (
      vertex_service_account_json as unknown as { project_id: string }
    ).project_id;
  }

  const { provider } = getModelAndProvider(inputModel as string);
  const routeVersion = getApiVersion(provider);
  return `/${routeVersion}/projects/${projectId}/locations/${vertex_region}`;
};

const FILE_ENDPOINTS = [
  'uploadFile',
  'retrieveFileContent',
  'deleteFile',
  'listFiles',
  'retrieveFile',
];

const BATCH_ENDPOINTS = [
  'createBatch',
  'retrieveBatch',
  'getBatchOutput',
  'listBatches',
  'cancelBatch',
  'createFinetune',
  'retrieveFinetune',
  'listFinetunes',
  'cancelFinetune',
];
const NON_INFERENCE_ENDPOINTS = [...FILE_ENDPOINTS, ...BATCH_ENDPOINTS];

// Good reference for using REST: https://cloud.google.com/vertex-ai/generative-ai/docs/start/quickstarts/quickstart-multimodal#gemini-beginner-samples-drest
// Difference versus Studio AI: https://cloud.google.com/vertex-ai/docs/start/ai-platform-users
export const vertexAPIConfig: InternalProviderAPIConfig = {
  getBaseURL: ({ raTarget, raRequestData }) => {
    const { vertex_region } = raTarget;

    if (FILE_ENDPOINTS.includes(raRequestData.functionName as string)) {
      return `https://storage.googleapis.com`;
    }

    return `https://${vertex_region}-aiplatform.googleapis.com`;
  },
  headers: async ({ raTarget: providerOptions }) => {
    const { api_key, vertex_service_account_json } = providerOptions;
    let authToken = api_key;
    if (vertex_service_account_json) {
      authToken = await getAccessToken(
        vertex_service_account_json as unknown as Record<string, string>,
      );
    }

    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    };
  },
  getEndpoint: ({ raTarget, raRequestData }) => {
    const { vertex_project_id, vertex_region, vertex_service_account_json } =
      raTarget;

    if (NON_INFERENCE_ENDPOINTS.includes(raRequestData.functionName)) {
      const jobIdIndex = [
        'cancelBatch',
        'retrieveFileContent',
        'cancelFinetune',
      ].includes(raRequestData.functionName)
        ? -2
        : -1;
      const jobId = raRequestData.url.split('/').at(jobIdIndex);

      const url = new URL(raRequestData.url);
      const searchParams = url.searchParams;
      const pageSize = searchParams.get('limit') ?? 20;
      const after = searchParams.get('after') ?? '';

      let projectId = vertex_project_id;
      if (!projectId || vertex_service_account_json) {
        projectId = (
          vertex_service_account_json as unknown as { project_id: string }
        ).project_id;
      }
      switch (raRequestData.functionName) {
        case FunctionName.GET_BATCH_OUTPUT:
          return `/v1/projects/${projectId}/locations/${vertex_region}/batchPredictionJobs/${jobId}`;
        case FunctionName.LIST_BATCHES: {
          return `/v1/projects/${projectId}/locations/${vertex_region}/batchPredictionJobs?pageSize=${pageSize}&pageToken=${after}`;
        }
        case FunctionName.CANCEL_BATCH: {
          return `/v1/projects/${projectId}/locations/${vertex_region}/batchPredictionJobs/${jobId}:cancel`;
        }
        case FunctionName.UPLOAD_FILE:
          // We handle file upload in a separate request handler
          return '';
        case FunctionName.RETRIEVE_FILE:
          return '';
        case FunctionName.RETRIEVE_FILE_CONTENT: {
          const { bucket, file } = getBucketAndFile(jobId ?? '');
          return `/${bucket}/${file}`;
        }
        case FunctionName.CREATE_BATCH:
          return `/v1/projects/${projectId}/locations/${vertex_region}/batchPredictionJobs`;
        case FunctionName.CREATE_FINE_TUNING_JOB:
          return `/v1/projects/${projectId}/locations/${vertex_region}/tuningJobs`;
        case FunctionName.LIST_FINE_TUNING_JOBS: {
          const pageSize = searchParams.get('limit') ?? 20;
          const after = searchParams.get('after') ?? '';
          return `/v1/projects/${projectId}/locations/${vertex_region}/tuningJobs?pageSize=${pageSize}&pageToken=${after}`;
        }
        case FunctionName.RETRIEVE_FINE_TUNING_JOB:
          return `/v1/projects/${projectId}/locations/${vertex_region}/tuningJobs/${jobId}`;
        case FunctionName.CANCEL_FINE_TUNING_JOB: {
          return `/v1/projects/${projectId}/locations/${vertex_region}/tuningJobs/${jobId}:cancel`;
        }
      }
    }
    // Manually doing logic (over .includes) for better static typing
    else if (
      raRequestData.functionName === FunctionName.CHAT_COMPLETE ||
      raRequestData.functionName === FunctionName.STREAM_CHAT_COMPLETE ||
      raRequestData.functionName === FunctionName.EMBED ||
      raRequestData.functionName === FunctionName.GENERATE_IMAGE
    ) {
      const model = raRequestData.requestBody?.model;
      const innerProvider = raTarget.inner_provider;
      const projectRoute = getProjectRoute(raTarget, model as string);

      const googleUrlMap = new Map<string, string>([
        [
          'chatComplete',
          `${projectRoute}/publishers/${innerProvider}/models/${model}:generateContent`,
        ],
        [
          'stream-chatComplete',
          `${projectRoute}/publishers/${innerProvider}/models/${model}:streamGenerateContent?alt=sse`,
        ],
        [
          'embed',
          `${projectRoute}/publishers/${innerProvider}/models/${model}:predict`,
        ],
        [
          'imageGenerate',
          `${projectRoute}/publishers/${innerProvider}/models/${model}:predict`,
        ],
      ]);

      switch (innerProvider) {
        case AIProvider.GOOGLE: {
          return (
            googleUrlMap.get(raRequestData.functionName) || `${projectRoute}`
          );
        }

        case AIProvider.ANTHROPIC: {
          if (raRequestData.functionName === FunctionName.CHAT_COMPLETE) {
            return `${projectRoute}/publishers/${innerProvider}/models/${model}:rawPredict`;
          } else if (
            raRequestData.functionName === FunctionName.STREAM_CHAT_COMPLETE
          ) {
            return `${projectRoute}/publishers/${innerProvider}/models/${model}:streamRawPredict`;
          }
          return `${projectRoute}`;
        }

        // case AIProvider.META: {
        //   return `${projectRoute}/endpoints/openapi/chat/completions`;
        // }

        // case AIProvider.ENDPOINTS: {
        //   return `${projectRoute}/endpoints/${model}/chat/completions`;
        // }

        default:
          return `${projectRoute}`;
      }
    }
    throw new Error(`Unknown function name: ${raRequestData.functionName}`);
  },
};
