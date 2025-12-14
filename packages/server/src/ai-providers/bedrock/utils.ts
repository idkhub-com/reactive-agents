import { Sha256 } from '@aws-crypto/sha256-js';
import type {
  BedrockChatCompletionsParams,
  BedrockConverseAI21ChatCompletionsParams,
  BedrockConverseAnthropicChatCompletionsParams,
  BedrockConverseCohereChatCompletionsParams,
  BedrockFinetuneRecord,
} from '@server/ai-providers/bedrock/types';
import type { ReactiveAgentsTarget } from '@shared/types/api/request/headers';

import type { CreateFineTuningJobRequestBody } from '@shared/types/api/routes/fine-tuning-api/request';
import { SignatureV4 } from '@smithy/signature-v4';

import { GatewayError } from '../../errors/gateway';

export const azureTransformFinetuneBody = (
  body: CreateFineTuningJobRequestBody,
): CreateFineTuningJobRequestBody => {
  const _body = { ...body } as CreateFineTuningJobRequestBody;

  // if (_body.method && !_body.hyperparameters) {
  //   const hyperparameters =
  //     _body.method[_body.method.type]?.hyperparameters ?? {};
  //   _body.hyperparameters = {
  //     ...hyperparameters,
  //   } as unknown as typeof _body.hyperparameters;

  //   delete _body.method;
  // }  // TODO: fix this

  return {
    ..._body,
  };
};

export const generateAWSHeaders = async (
  body: Record<string, unknown> | string | undefined,
  headers: Record<string, string>,
  url: string,
  method: string,
  awsService: string,
  awsRegion: string,
  awsAccessKeyID: string,
  awsSecretAccessKey: string,
  awsSessionToken: string | undefined,
): Promise<Record<string, string>> => {
  const signer = new SignatureV4({
    service: awsService,
    region: awsRegion || 'us-east-1',
    credentials: {
      accessKeyId: awsAccessKeyID,
      secretAccessKey: awsSecretAccessKey,
      ...(awsSessionToken && { sessionToken: awsSessionToken }),
    },
    sha256: Sha256,
  });

  const urlObj = new URL(url);
  const hostname = urlObj.hostname;
  headers.host = hostname;
  let requestBody: string | Uint8Array | Buffer | null | undefined;
  if (!body) {
    requestBody = null;
  } else if (
    body instanceof Uint8Array ||
    body instanceof Buffer ||
    typeof body === 'string'
  ) {
    requestBody = body;
  } else if (body && typeof body === 'object' && method !== 'GET') {
    requestBody = JSON.stringify(body);
  }
  const queryParams = Object.fromEntries(urlObj.searchParams.entries());
  let protocol = 'https';
  if (urlObj.protocol) {
    protocol = urlObj.protocol.replace(':', '');
  }
  const request = {
    method: method,
    path: urlObj.pathname,
    protocol: protocol,
    query: queryParams,
    hostname: urlObj.hostname,
    headers: headers,
    ...(requestBody && { body: requestBody }),
  };

  const signed = await signer.sign(request);
  return signed.headers;
};

export const transformInferenceConfig = (
  params: BedrockChatCompletionsParams,
): Record<string, unknown> => {
  const inferenceConfig: Record<string, unknown> = {};
  if (params.max_tokens || params.max_completion_tokens) {
    inferenceConfig.maxTokens =
      params.max_tokens || params.max_completion_tokens;
  }
  if (params.stop) {
    inferenceConfig.stopSequences = params.stop;
  }
  if (params.temperature) {
    inferenceConfig.temperature = params.temperature;
  }
  if (params.top_p) {
    inferenceConfig.topP = params.top_p;
  }
  return inferenceConfig;
};

export const transformAdditionalModelRequestFields = (
  params: BedrockChatCompletionsParams,
): Record<string, unknown> => {
  const additionalModelRequestFields: Record<string, unknown> =
    params.additionalModelRequestFields ||
    params.additional_model_request_fields ||
    {};
  // if (params.top_k) {
  //   additionalModelRequestFields.top_k = params.top_k;
  // } // TODO: fix this
  if (params.response_format) {
    additionalModelRequestFields.response_format = params.response_format;
  }
  return additionalModelRequestFields;
};

export const transformAnthropicAdditionalModelRequestFields = (
  params: BedrockConverseAnthropicChatCompletionsParams,
): Record<string, unknown> => {
  const additionalModelRequestFields: Record<string, unknown> =
    params.additionalModelRequestFields ||
    params.additional_model_request_fields ||
    {};
  // if (params.top_k) {
  //   additionalModelRequestFields.top_k = params.top_k;
  // } // TODO: fix this
  if (params.anthropic_version) {
    additionalModelRequestFields.anthropic_version = params.anthropic_version;
  }
  if (params.user) {
    additionalModelRequestFields.metadata = {
      user_id: params.user,
    };
  }
  if (params.thinking) {
    additionalModelRequestFields.thinking = params.thinking;
  }
  if (params.anthropic_beta) {
    if (typeof params.anthropic_beta === 'string') {
      additionalModelRequestFields.anthropic_beta = [params.anthropic_beta];
    } else {
      additionalModelRequestFields.anthropic_beta = params.anthropic_beta;
    }
  }
  return additionalModelRequestFields;
};

export const transformCohereAdditionalModelRequestFields = (
  params: BedrockConverseCohereChatCompletionsParams,
): Record<string, unknown> => {
  const additionalModelRequestFields: Record<string, unknown> =
    params.additionalModelRequestFields ||
    params.additional_model_request_fields ||
    {};
  // if (params.top_k) {
  //   additionalModelRequestFields.top_k = params.top_k;
  // } // TODO: fix this
  if (params.n) {
    additionalModelRequestFields.n = params.n;
  }
  if (params.frequency_penalty) {
    additionalModelRequestFields.frequency_penalty = params.frequency_penalty;
  }
  if (params.presence_penalty) {
    additionalModelRequestFields.presence_penalty = params.presence_penalty;
  }
  if (params.logit_bias) {
    additionalModelRequestFields.logitBias = params.logit_bias;
  }
  return additionalModelRequestFields;
};

export const transformAI21AdditionalModelRequestFields = (
  params: BedrockConverseAI21ChatCompletionsParams,
): Record<string, unknown> => {
  const additionalModelRequestFields: Record<string, unknown> =
    params.additionalModelRequestFields ||
    params.additional_model_request_fields ||
    {};
  // if (params.top_k) {
  //   additionalModelRequestFields.top_k = params.top_k;
  // } // TODO: fix this
  if (params.frequency_penalty) {
    additionalModelRequestFields.frequencyPenalty = {
      scale: params.frequency_penalty,
    };
  }
  if (params.presence_penalty) {
    additionalModelRequestFields.presencePenalty = {
      scale: params.presence_penalty,
    };
  }
  if (params.frequencyPenalty) {
    additionalModelRequestFields.frequencyPenalty = params.frequencyPenalty;
  }
  if (params.presencePenalty) {
    additionalModelRequestFields.presencePenalty = params.presencePenalty;
  }
  if (params.countPenalty) {
    additionalModelRequestFields.countPenalty = params.countPenalty;
  }
  return additionalModelRequestFields;
};

export async function getAssumedRoleCredentials(
  awsRoleArn: string,
  awsExternalId: string,
  awsRegion: string,
  creds: {
    accessKeyId: string;
    secretAccessKey: string;
    sessionToken?: string;
  },
): Promise<{
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
  expiration?: string;
} | null> {
  // const cacheKey = `${awsRoleArn}/${awsExternalId}/${awsRegion}`;
  // const getFromCacheByKey = c.get('getFromCacheByKey');
  // const putInCacheWithValue = c.get('putInCacheWithValue');

  // const resp = getFromCacheByKey
  //   ? await getFromCacheByKey(env(c), cacheKey)
  //   : null;
  // if (resp) {
  //   return resp;
  // } // TODO: fix this

  // Determine which credentials to use
  const accessKeyId: string = creds.accessKeyId;
  const secretAccessKey: string = creds.secretAccessKey;
  const sessionToken: string | undefined = creds.sessionToken;

  const region = awsRegion || 'us-east-1';
  const service = 'sts';
  const hostname = `sts.${region}.amazonaws.com`;
  const signer = new SignatureV4({
    service,
    region,
    credentials: {
      accessKeyId,
      secretAccessKey,
      sessionToken,
    },
    sha256: Sha256,
  });
  const date = new Date();
  const sessionName = `${date.getFullYear()}${date.getMonth()}${date.getDay()}`;
  const url = `https://${hostname}?Action=AssumeRole&Version=2011-06-15&RoleArn=${awsRoleArn}&RoleSessionName=${sessionName}${awsExternalId ? `&ExternalId=${awsExternalId}` : ''}`;
  const urlObj = new URL(url);
  const requestHeaders = { host: hostname };
  const options = {
    method: 'GET',
    path: urlObj.pathname,
    protocol: urlObj.protocol,
    hostname: urlObj.hostname,
    headers: requestHeaders,
    query: Object.fromEntries(urlObj.searchParams),
  };
  const { headers } = await signer.sign(options);

  let credentials: {
    accessKeyId: string;
    secretAccessKey: string;
    sessionToken?: string;
    expiration?: string;
  } | null = null;
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: headers,
    });

    if (!response.ok) {
      const resp = await response.text();
      console.error({ message: resp });
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const xmlData = await response.text();
    credentials = parseXml(xmlData);
    // if (putInCacheWithValue) {
    //   await putInCacheWithValue(env(c), cacheKey, credentials, 300); //5 minutes
    // } // TODO: fix this
  } catch (error) {
    console.error({ message: `Error assuming role:, ${error}` });
  }
  return credentials;
}

function parseXml(xml: string): {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
  expiration?: string;
} {
  // Simple XML parser for this specific use case
  const getTagContent = (tag: string): string | null => {
    const regex = new RegExp(`<${tag}>(.*?)</${tag}>`, 's');
    const match = xml.match(regex);
    return match ? match[1] : null;
  };

  const credentials = getTagContent('Credentials');
  if (!credentials) {
    throw new Error('Failed to parse Credentials from XML response');
  }

  return {
    accessKeyId: getTagContent('AccessKeyId') || '',
    secretAccessKey: getTagContent('SecretAccessKey') || '',
    sessionToken: getTagContent('SessionToken') || undefined,
    expiration: getTagContent('Expiration') || undefined,
  };
}

export const bedrockFinetuneToOpenAI = (
  finetune: BedrockFinetuneRecord,
): Record<string, unknown> => {
  let status = 'running';
  switch (finetune.status) {
    case 'Completed':
      status = 'succeeded';
      break;
    case 'Failed':
      status = 'failed';
      break;
    case 'InProgress':
      status = 'running';
      break;
    case 'Stopping':
    case 'Stopped':
      status = 'cancelled';
      break;
  }
  return {
    id: encodeURIComponent(finetune.jobArn),
    job_name: finetune.jobName,
    object: 'finetune',
    status: status,
    created_at: new Date(finetune.creationTime).getTime(),
    finished_at: new Date(finetune.endTime).getTime(),
    fine_tuned_model:
      finetune.outputModelArn ||
      finetune.outputModelName ||
      finetune.customModelArn,
    suffix: finetune.customModelName,
    training_file: encodeURIComponent(
      finetune?.trainingDataConfig?.s3Uri ?? '',
    ),
    validation_file: encodeURIComponent(
      finetune?.validationDataConfig?.s3Uri ?? '',
    ),
    hyperparameters: {
      learning_rate_multiplier: Number(finetune?.hyperParameters?.learningRate),
      batch_size: Number(finetune?.hyperParameters?.batchSize),
      n_epochs: Number(finetune?.hyperParameters?.epochCount),
    },
    error: finetune?.failureMessage ?? {},
  };
};

export async function providerAssumedRoleCredentials(
  raTarget: ReactiveAgentsTarget,
): Promise<void> {
  try {
    // Assume the role in the source account
    const sourceRoleCredentials = await getAssumedRoleCredentials(
      raTarget.aws_role_arn || '', // Role ARN in the source account
      raTarget.aws_external_id || '', // External ID for source role (if needed)
      raTarget.aws_region || '',
      {
        accessKeyId: raTarget.aws_access_key_id || '',
        secretAccessKey: raTarget.aws_secret_access_key || '',
        sessionToken: raTarget.aws_session_token || '',
      },
    );

    if (!sourceRoleCredentials) {
      throw new Error('Server Error while assuming internal role');
    }

    // Assume role in destination account using temporary creds obtained in first step
    const { accessKeyId, secretAccessKey, sessionToken } =
      (await getAssumedRoleCredentials(
        raTarget.aws_role_arn || '',
        raTarget.aws_external_id || '',
        raTarget.aws_region || '',
        {
          accessKeyId: sourceRoleCredentials.accessKeyId,
          secretAccessKey: sourceRoleCredentials.secretAccessKey,
          sessionToken: sourceRoleCredentials.sessionToken,
        },
      )) || {};
    raTarget.aws_access_key_id = accessKeyId;
    raTarget.aws_secret_access_key = secretAccessKey;
    raTarget.aws_session_token = sessionToken;
  } catch (e: unknown) {
    if (e instanceof Error) {
      throw new GatewayError(e.message);
    }
    throw new GatewayError('Error while assuming bedrock role');
  }
}

export const populateHyperParameters = (
  raRequestBody: CreateFineTuningJobRequestBody,
): Record<string, unknown> => {
  const hyperParameters = raRequestBody.hyperparameters ?? {};

  // if (raRequestBody.method) {
  //   const method = raRequestBody.method.type;
  //   hyperParameters = raRequestBody.method?.[method]?.hyperparameters ?? {};
  // }  // TODO: fix this

  return hyperParameters;
};
