import type {
  GoogleBatchRecord,
  GoogleErrorResponse,
  GoogleFinetuneRecord,
  GoogleResponseCandidate,
} from '@server/ai-providers/google/types';
import {
  generateErrorResponse,
  generateInvalidProviderResponseError,
} from '@server/utils/ai-provider';

import type {
  CompletionParameterTransformFunction,
  ErrorResponseBody,
} from '@shared/types/api/response/body';
import {
  BatchStatus,
  type CreateBatchResponseBody,
} from '@shared/types/api/routes/batch-api';
import type { ChatCompletionTokenLogprob } from '@shared/types/api/routes/chat-completions-api';
import {
  type CreateFineTuningJobRequestBody,
  type CreateFineTuningJobResponseBody,
  FineTuningJobStatus,
} from '@shared/types/api/routes/fine-tuning-api';
import { AIProvider, fileExtensionMimeTypeMap } from '@shared/types/constants';

// Type aliases for missing imports
type CreateBatchResponse = CreateBatchResponseBody;
type ParameterTransformFunction = CompletionParameterTransformFunction;

/**
 * Encodes an object as a Base64 URL-encoded string.
 * @param obj The object to encode.
 * @returns The Base64 URL-encoded string.
 */
function base64UrlEncode(obj: Record<string, unknown>): string {
  return btoa(JSON.stringify(obj))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

const createJWT = async (
  header: Record<string, unknown>,
  payload: Record<string, unknown>,
  privateKey: CryptoKey,
): Promise<string> => {
  const encodedHeader = base64UrlEncode(header);
  const encodedPayload = base64UrlEncode(payload);

  const data = new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`);

  const signature = await crypto.subtle.sign(
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: { name: 'SHA-256' },
    },
    privateKey,
    data,
  );

  const encodedSignature = btoa(
    String.fromCharCode(...new Uint8Array(signature)),
  )
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${encodedHeader}.${encodedPayload}.${encodedSignature}`;
};

/**
 * Imports a PEM-formatted private key into a CryptoKey object.
 * @param pem The PEM-formatted private key.
 * @returns The imported private key.
 */
export function importPrivateKey(pem: string): Promise<CryptoKey> {
  const pemContents = pem
    .replace(/-----BEGIN PRIVATE KEY-----/g, '')
    .replace(/-----END PRIVATE KEY-----/g, '')
    .replace(/\s+/g, '');

  const binaryDerString = atob(pemContents);
  const binaryDer = new Uint8Array(binaryDerString.length);

  for (let i = 0; i < binaryDerString.length; i++) {
    binaryDer[i] = binaryDerString.charCodeAt(i);
  }

  return crypto.subtle.importKey(
    'pkcs8',
    binaryDer.buffer,
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: { name: 'SHA-256' },
    },
    false,
    ['sign'],
  );
}

export const getAccessToken = async (
  serviceAccountInfo: Record<string, string>,
): Promise<string> => {
  try {
    // const cacheKey = `${serviceAccountInfo.project_id}/${serviceAccountInfo.private_key_id}/${serviceAccountInfo.client_email}`;
    // // try to get from cache
    // try {
    //   const getFromCacheByKey = c.get('getFromCacheByKey');
    //   const resp = getFromCacheByKey
    //     ? await getFromCacheByKey(env(c), cacheKey)
    //     : null;
    //   if (resp) {
    //     return resp;
    //   }
    // } catch (err) {
    //   console.error(err);
    // } // TODO: fix this

    const scope = 'https://www.googleapis.com/auth/cloud-platform';
    const iat = Math.floor(Date.now() / 1000);
    const exp = iat + 3600; // Token expiration time (1 hour)

    const payload = {
      iss: serviceAccountInfo.client_email,
      sub: serviceAccountInfo.client_email,
      aud: 'https://oauth2.googleapis.com/token',
      iat: iat,
      exp: exp,
      scope: scope,
    };

    const header = {
      alg: 'RS256',
      typ: 'JWT',
      kid: serviceAccountInfo.private_key_id,
    };

    const privateKey = await importPrivateKey(serviceAccountInfo.private_key);

    const jwtToken = await createJWT(header, payload, privateKey);

    const tokenUrl = 'https://oauth2.googleapis.com/token';
    const tokenHeaders = {
      'Content-Type': 'application/x-www-form-urlencoded',
    };
    const tokenData = new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwtToken,
    });

    const tokenResponse = await fetch(tokenUrl, {
      headers: tokenHeaders,
      body: tokenData,
      method: 'POST',
    });

    const tokenJson: Record<string, unknown> = await tokenResponse.json();
    // const putInCacheWithValue = c.get('putInCacheWithValue');
    // if (putInCacheWithValue && cacheKey) {
    //   await putInCacheWithValue(env(c), cacheKey, tokenJson.access_token, 3000); // 50 minutes
    // } // TODO: fix this

    return tokenJson.access_token as string;
  } catch (_e) {
    return '';
  }
};

export const getModelAndProvider = (
  modelString: string,
): { provider: string; model: string } => {
  let provider = 'google';
  let model = modelString;
  const modelStringParts = modelString.split('.');
  if (
    modelStringParts.length > 1 &&
    ['google', 'anthropic', 'meta', 'endpoints'].includes(modelStringParts[0])
  ) {
    provider = modelStringParts[0];
    model = modelStringParts.slice(1).join('.');
  }

  return { provider, model };
};

export const getMimeType = (url: string): string | undefined => {
  const urlParts = url.split('.');
  const extension = urlParts[
    urlParts.length - 1
  ] as keyof typeof fileExtensionMimeTypeMap;
  return fileExtensionMimeTypeMap[extension];
};

export function GoogleErrorResponseTransform(
  response: GoogleErrorResponse,
  provider = AIProvider.GOOGLE_VERTEX_AI,
): ErrorResponseBody {
  if ('error' in response) {
    return generateErrorResponse(
      {
        message: response.error.message,
        type: response.error.status,
        code: response.error.status,
      },
      provider,
    );
  }

  return generateInvalidProviderResponseError(response, provider);
}

const getDefFromRef = (ref: string): string | undefined => {
  const refParts = ref.split('/');
  return refParts.at(-1);
};

const getRefParts = (spec: Record<string, unknown>, ref: string): unknown => {
  return spec?.[ref];
};

export const derefer = (
  spec: Record<string, unknown>,
  defs: Record<string, unknown> | null = null,
): Record<string, unknown> => {
  const original = { ...spec };

  const finalDefs: Record<string, unknown> | undefined =
    defs ?? (original?.$defs as Record<string, unknown>);
  const entries = Object.entries(original);

  for (const [key, object] of entries) {
    if (key === '$defs') {
      continue;
    }
    if (typeof object === 'string' || Array.isArray(object)) {
      continue;
    }
    const ref = (object as Record<string, unknown>).$ref as string;
    if (ref) {
      const def = getDefFromRef(ref);
      const defData = getRefParts(finalDefs, def ?? '') as Record<
        string,
        unknown
      >;
      const newValue = derefer(defData, finalDefs);
      original[key] = newValue;
    } else {
      const newValue = derefer(object as Record<string, unknown>, finalDefs);
      original[key] = newValue;
    }
  }
  return original;
};

// Vertex AI does not support additionalProperties in JSON Schema
// https://cloud.google.com/vertex-ai/docs/reference/rest/v1/Schema
export const recursivelyDeleteUnsupportedParameters = (
  obj: Record<string, unknown>,
): void => {
  if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) return;
  delete obj.additional_properties;
  delete obj.additionalProperties;
  delete obj.$schema;
  for (const key in obj) {
    if (obj[key] !== null && typeof obj[key] === 'object') {
      recursivelyDeleteUnsupportedParameters(
        obj[key] as Record<string, unknown>,
      );
    }
    if (key === 'anyOf' && Array.isArray(obj[key])) {
      obj[key].forEach((item: Record<string, unknown>) => {
        recursivelyDeleteUnsupportedParameters(item);
      });
    }
  }
};

// Generate Gateway specific response.
export const GoogleResponseHandler = (
  response: Response | string | Record<string, unknown>,
  status: number,
): Response => {
  if (status !== 200) {
    return new Response(
      JSON.stringify({
        success: false,
        error: response,
        param: null,
        provider: AIProvider.GOOGLE_VERTEX_AI,
      }),
      {
        status: status || 500,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }

  if (!(response instanceof Response)) {
    const _response =
      typeof response === 'object' ? JSON.stringify(response) : response;
    return new Response(_response as string, {
      status: status || 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return response as Response;
};

export const googleBatchStatusToOpenAI = (
  status: GoogleBatchRecord['state'],
): BatchStatus => {
  switch (status) {
    case 'JOB_STATE_CANCELLING':
      return BatchStatus.CANCELLING;
    case 'JOB_STATE_CANCELLED':
      return BatchStatus.CANCELLED;
    case 'JOB_STATE_EXPIRED':
      return BatchStatus.EXPIRED;
    case 'JOB_STATE_FAILED':
      return BatchStatus.FAILED;
    case 'JOB_STATE_PARTIALLY_SUCCEEDED':
    case 'JOB_STATE_SUCCEEDED':
      return BatchStatus.COMPLETED;
    case 'JOB_STATE_RUNNING':
    case 'JOB_STATE_UPDATING':
      return BatchStatus.IN_PROGRESS;
    default:
      return BatchStatus.VALIDATING;
  }
};

export const googleFinetuneStatusToOpenAI = (
  status: GoogleFinetuneRecord['state'],
): FineTuningJobStatus => {
  switch (status) {
    case 'JOB_STATE_CANCELLED':
    case 'JOB_STATE_CANCELLING':
    case 'JOB_STATE_EXPIRED':
      return FineTuningJobStatus.CANCELLED;
    case 'JOB_STATE_FAILED':
      return FineTuningJobStatus.FAILED;
    case 'JOB_STATE_PARTIALLY_SUCCEEDED':
    case 'JOB_STATE_SUCCEEDED':
      return FineTuningJobStatus.SUCCEEDED;
    case 'JOB_STATE_PAUSED':
    case 'JOB_STATE_PENDING':
    case 'JOB_STATE_QUEUED':
      return FineTuningJobStatus.QUEUED;
    case 'JOB_STATE_RUNNING':
    case 'JOB_STATE_UPDATING':
      return FineTuningJobStatus.RUNNING;
    case 'JOB_STATE_UNSPECIFIED':
      return FineTuningJobStatus.QUEUED;
    default:
      return FineTuningJobStatus.QUEUED;
  }
};

const getTimeKey = (
  status: GoogleBatchRecord['state'],
  value: string,
): Record<string, number> => {
  if (status === 'JOB_STATE_FAILED') {
    return { failed_at: new Date(value).getTime() };
  }

  if (status === 'JOB_STATE_SUCCEEDED') {
    return { completed_at: new Date(value).getTime() };
  }

  if (status === 'JOB_STATE_CANCELLED') {
    return { cancelled_at: new Date(value).getTime() };
  }

  if (status === 'JOB_STATE_EXPIRED') {
    return { failed_at: new Date(value).getTime() };
  }
  return {};
};

export const GoogleToOpenAIBatch = (
  response: GoogleBatchRecord,
): CreateBatchResponse => {
  const jobId = response.name.split('/').at(-1);
  const total = Object.values(response.completionsStats ?? {}).reduce(
    (acc, current) => acc + Number.parseInt(current),
    0,
  );

  const outputFileId = response.outputInfo
    ? `${response.outputInfo?.gcsOutputDirectory}/predictions.jsonl`
    : response.outputConfig.gcsDestination.outputUriPrefix;

  const createBatchResponse: CreateBatchResponse = {
    id: jobId ?? '',
    object: 'batch',
    endpoint: '/generateContent',
    input_file_id: encodeURIComponent(
      response.inputConfig.gcsSource?.uris?.at(0) ?? '',
    ),
    status: googleBatchStatusToOpenAI(response.state),
    output_file_id: outputFileId,
    // Same as output_file_id
    error_file_id: response.outputConfig.gcsDestination.outputUriPrefix,
    created_at: new Date(response.createTime).getTime(),
    ...getTimeKey(response.state, response.endTime),
    in_progress_at: new Date(response.startTime).getTime(),
    ...getTimeKey(response.state, response.updateTime),
    request_counts: {
      total: total,
      completed: Number.parseInt(
        response.completionsStats?.successfulCount ?? '0',
      ),
      failed: Number.parseInt(response.completionsStats?.failedCount ?? '0'),
    },
    ...(response.error && {
      errors: {
        object: 'list',
        data: [response.error],
      },
    }),
  };

  return createBatchResponse;
};

export const fetchGoogleCustomEndpoint = async ({
  authorization,
  method,
  url,
  body,
}: {
  url: string;
  body?: ReadableStream | Record<string, unknown>;
  authorization: string;
  method: string;
}): Promise<{
  response: unknown;
  error: string | null;
  status: number | null;
}> => {
  const result: {
    response: unknown;
    error: string | null;
    status: number | null;
  } = { response: null, error: null, status: null };
  try {
    const options = {
      ...(method !== 'GET' &&
        body && {
          body: typeof body === 'object' ? JSON.stringify(body) : body,
        }),
      method: method,
      headers: {
        Authorization: authorization,
        'Content-Type': 'application/json',
      },
    };

    const request = await fetch(url, options);
    if (!request.ok) {
      const error = await request.text();
      result.error = error;
      result.status = request.status;
    }

    const response = await request.json();
    result.response = response as unknown;
  } catch (error) {
    result.error = error as string;
  }
  return result;
};

export const transformVertexLogprobs = (
  generation: GoogleResponseCandidate,
): ChatCompletionTokenLogprob[] | null => {
  const logprobsContent: ChatCompletionTokenLogprob[] = [];
  if (!generation.logprobsResult) return null;
  if (generation.logprobsResult?.chosenCandidates) {
    generation.logprobsResult.chosenCandidates.forEach((candidate) => {
      const bytes = [];
      for (const char of candidate.token) {
        bytes.push(char.charCodeAt(0));
      }
      logprobsContent.push({
        token: candidate.token,
        logprob: candidate.logProbability,
        bytes: bytes,
        top_logprobs: [],
      });
    });
  }
  if (generation.logprobsResult?.topCandidates) {
    generation.logprobsResult.topCandidates.forEach(
      (topCandidatesForIndex, index) => {
        const topLogprobs = [];
        for (const candidate of topCandidatesForIndex.candidates) {
          const bytes = [];
          for (const char of candidate.token) {
            bytes.push(char.charCodeAt(0));
          }
          topLogprobs.push({
            token: candidate.token,
            logprob: candidate.logProbability,
            bytes: bytes,
          });
        }
        logprobsContent[index].top_logprobs = topLogprobs;
      },
    );
  }
  return logprobsContent;
};

const populateHyperparameters = (
  idkRequestBody: CreateFineTuningJobRequestBody,
): Record<string, unknown> => {
  const hyperParameters = idkRequestBody.hyperparameters;

  return {
    epochCount: hyperParameters?.n_epochs,
    learningRateMultiplier: hyperParameters?.learning_rate_multiplier,
    adapterSize: hyperParameters?.batch_size,
  };
};

export const transformVertexFinetune: ParameterTransformFunction = (
  idkRequestBody,
) => {
  const createFineTuningJobRequestBody =
    idkRequestBody as unknown as CreateFineTuningJobRequestBody;
  const parameterSpec = {
    training_dataset_uri: decodeURIComponent(
      (createFineTuningJobRequestBody.training_file as string) ?? '',
    ),
    ...((createFineTuningJobRequestBody.validation_file as string) && {
      validation_dataset_uri: decodeURIComponent(
        createFineTuningJobRequestBody.validation_file as string,
      ),
    }),
    hyperParameters: populateHyperparameters(createFineTuningJobRequestBody),
  };
  return parameterSpec;
};

export const getBucketAndFile = (
  uri: string,
): { bucket: string; file: string } => {
  if (!uri) return { bucket: '', file: '' };
  let _url = decodeURIComponent(uri);
  _url = _url.replaceAll('gs://', '');
  const parts = _url.split('/');
  const bucket = parts[0];
  const file = parts.slice(1).join('/');
  return { bucket, file };
};

export const googleToOpenAIFinetune = (
  response: GoogleFinetuneRecord,
): CreateFineTuningJobResponseBody => {
  const createFineTuningJobResponseBody: CreateFineTuningJobResponseBody = {
    id: response.name.split('/').at(-1) ?? '',
    object: 'fine_tuning.job',
    status: googleFinetuneStatusToOpenAI(response.state),
    created_at: new Date(response.createTime).getTime(),
    error: response.error,
    fine_tuned_model: response.tunedModel?.model,
    ...(response.endTime && {
      finished_at: new Date(response.endTime).getTime(),
    }),
    hyperparameters: {
      batch_size: response.supervisedTuningSpec.hyperParameters?.adapterSize,
      learning_rate_multiplier:
        response.supervisedTuningSpec.hyperParameters.learningRateMultiplier,
      n_epochs: response.supervisedTuningSpec.hyperParameters.epochCount,
    },
    model: response.baseModel ?? response.source_model?.baseModel,
    trained_tokens:
      response.tuningDataStats?.supervisedTuningDataStats
        .totalBillableTokenCount,
    training_file: encodeURIComponent(
      response.supervisedTuningSpec.trainingDatasetUri,
    ),
    ...(response.supervisedTuningSpec.validationDatasetUri && {
      validation_file: encodeURIComponent(
        response.supervisedTuningSpec.validationDatasetUri,
      ),
    }),
  };

  return createFineTuningJobResponseBody;
};
