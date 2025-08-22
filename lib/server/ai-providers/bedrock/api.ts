import type { InternalProviderAPIConfig } from '@shared/types/ai-providers/config';
import { FunctionName } from '@shared/types/api/request';
import type { IdkTarget } from '@shared/types/api/request/headers';
import type { endpointStrings } from '@shared/types/api/response/body';
import type { CompletionRequestBody } from '@shared/types/api/routes/completions-api/request';
import { GatewayError } from '../../errors/gateway';
import { bedrockInvokeModels } from './constants';
import { generateAWSHeaders, providerAssumedRoleCredentials } from './utils';

const AWS_CONTROL_PLANE_ENDPOINTS: FunctionName[] = [
  FunctionName.CREATE_BATCH,
  FunctionName.RETRIEVE_BATCH,
  FunctionName.CANCEL_BATCH,
  FunctionName.LIST_BATCHES,
  FunctionName.RETRIEVE_FILE_CONTENT,
  FunctionName.GET_BATCH_OUTPUT,
  FunctionName.CANCEL_BATCH,
  FunctionName.LIST_FINE_TUNING_JOBS,
  FunctionName.RETRIEVE_FINE_TUNING_JOB,
  FunctionName.CANCEL_FINE_TUNING_JOB,
  FunctionName.CREATE_FINE_TUNING_JOB,
];

const AWS_GET_METHODS: FunctionName[] = [
  FunctionName.LIST_BATCHES,
  FunctionName.RETRIEVE_BATCH,
  FunctionName.RETRIEVE_FILE_CONTENT,
  FunctionName.GET_BATCH_OUTPUT,
  FunctionName.RETRIEVE_FILE,
  FunctionName.RETRIEVE_FILE_CONTENT,
  FunctionName.LIST_FINE_TUNING_JOBS,
  FunctionName.RETRIEVE_FINE_TUNING_JOB,
];

// Endpoints that does not require model parameter
const BEDROCK_NO_MODEL_ENDPOINTS: endpointStrings[] = [
  'listFinetunes',
  'retrieveFinetune',
  'cancelFinetune',
  'listBatches',
  'retrieveBatch',
  'getBatchOutput',
  'cancelBatch',
];

const ENDPOINTS_TO_ROUTE_TO_S3 = [
  'retrieveFileContent',
  'getBatchOutput',
  'retrieveFile',
  'retrieveFileContent',
  'uploadFile',
  'initiateMultipartUpload',
];

const getMethod = (fn: FunctionName, transformedRequestUrl: string): string => {
  if (fn === FunctionName.UPLOAD_FILE) {
    const url = new URL(transformedRequestUrl);
    return url.searchParams.get('partNumber') ? 'PUT' : 'POST';
  }
  return AWS_GET_METHODS.includes(fn) ? 'GET' : 'POST';
};

const getService = (fn: FunctionName): string => {
  return ENDPOINTS_TO_ROUTE_TO_S3.includes(fn) ? 's3' : 'bedrock';
};

const setRouteSpecificHeaders = (
  fn: FunctionName,
  headers: Record<string, string>,
  idkTarget: IdkTarget,
): void => {
  if (fn === FunctionName.RETRIEVE_FILE) {
    headers['x-amz-object-attributes'] = 'ObjectSize';
  }
  if (fn === FunctionName.INITIATE_MULTIPART_UPLOAD) {
    if (idkTarget.aws_server_side_encryption_kms_key_id) {
      headers['x-amz-server-side-encryption-aws-kms-key-id'] =
        idkTarget.aws_server_side_encryption_kms_key_id;
      headers['x-amz-server-side-encryption'] = 'aws:kms';
    }
    if (idkTarget.aws_server_side_encryption) {
      headers['x-amz-server-side-encryption'] =
        idkTarget.aws_server_side_encryption;
    }
  }
};

const bedrockAPIConfig: InternalProviderAPIConfig = {
  getBaseURL: ({ idkTarget, idkRequestData }) => {
    if (idkRequestData.functionName === FunctionName.RETRIEVE_FILE) {
      const s3URL = decodeURIComponent(
        idkRequestData.url.split('/v1/files/')[1],
      );
      const bucketName = s3URL.replace('s3://', '').split('/')[0];
      return `https://${bucketName}.s3.${idkTarget.aws_region || 'us-east-1'}.amazonaws.com`;
    }
    if (idkRequestData.functionName === FunctionName.RETRIEVE_FILE_CONTENT) {
      const s3URL = decodeURIComponent(
        idkRequestData.url.split('/v1/files/')[1],
      );
      const bucketName = s3URL.replace('s3://', '').split('/')[0];
      return `https://${bucketName}.s3.${idkTarget.aws_region || 'us-east-1'}.amazonaws.com`;
    }
    if (idkRequestData.functionName === FunctionName.UPLOAD_FILE)
      return `https://${idkTarget.aws_s3_bucket}.s3.${idkTarget.aws_region || 'us-east-1'}.amazonaws.com`;
    const isAWSControlPlaneEndpoint =
      idkRequestData.functionName &&
      AWS_CONTROL_PLANE_ENDPOINTS.includes(idkRequestData.functionName);
    return `https://${isAWSControlPlaneEndpoint ? 'bedrock' : 'bedrock-runtime'}.${idkTarget.aws_region || 'us-east-1'}.amazonaws.com`;
  },
  headers: async ({ idkTarget, idkRequestData }) => {
    const method = getMethod(idkRequestData.functionName, idkRequestData.url);
    const service = getService(idkRequestData.functionName);

    const headers: Record<string, string> = {
      'content-type': 'application/json',
    };

    if (method === 'PUT' || method === 'GET') {
      delete headers['content-type'];
    }

    setRouteSpecificHeaders(idkRequestData.functionName, headers, idkTarget);

    if (idkTarget.aws_auth_type === 'assumedRole') {
      await providerAssumedRoleCredentials(idkTarget);
    }

    let finalRequestBody = idkRequestData.requestBody;

    if (
      ['cancelFinetune', 'cancelBatch'].includes(
        idkRequestData.functionName as endpointStrings,
      )
    ) {
      // Cancel doesn't require any body, but fetch is sending empty body, to match the signature this block is required.
      finalRequestBody = {};
    }

    return generateAWSHeaders(
      finalRequestBody,
      headers,
      idkRequestData.url,
      method,
      service,
      idkTarget.aws_region || '',
      idkTarget.aws_access_key_id || '',
      idkTarget.aws_secret_access_key || '',
      idkTarget.aws_session_token || '',
    );
  },
  getEndpoint: ({ idkRequestData }) => {
    if (idkRequestData.functionName === FunctionName.RETRIEVE_FILE) {
      const fileId = decodeURIComponent(
        idkRequestData.url.split('/v1/files/')[1],
      );
      const s3ObjectKeyParts = fileId.replace('s3://', '').split('/');
      const s3ObjectKey = s3ObjectKeyParts.slice(1).join('/');
      return `/${s3ObjectKey}?attributes`;
    }
    if (idkRequestData.functionName === FunctionName.RETRIEVE_FILE_CONTENT) {
      const fileId = decodeURIComponent(
        idkRequestData.url.split('/v1/files/')[1],
      );
      const s3ObjectKeyParts = fileId
        .replace('s3://', '')
        .replace('/content', '')
        .split('/');
      const s3ObjectKey = s3ObjectKeyParts.slice(1).join('/');
      return `/${s3ObjectKey}`;
    }
    if (idkRequestData.functionName === FunctionName.UPLOAD_FILE) return '';
    if (idkRequestData.functionName === FunctionName.CANCEL_BATCH) {
      const batchId = idkRequestData.url.split('/v1/batches/')[1].split('/')[0];
      return `/model-invocation-job/${batchId}/stop`;
    }
    const { model, stream } =
      idkRequestData.requestBody as CompletionRequestBody;
    const uriEncodedModel = encodeURIComponent(decodeURIComponent(model ?? ''));
    if (
      !model &&
      !BEDROCK_NO_MODEL_ENDPOINTS.includes(
        idkRequestData.functionName as endpointStrings,
      )
    ) {
      throw new GatewayError('Model is required');
    }
    let mappedFn: string = idkRequestData.functionName;
    if (stream) {
      mappedFn = `stream-${idkRequestData.functionName}`;
    }
    let endpoint = `/model/${uriEncodedModel}/invoke`;
    let streamEndpoint = `/model/${uriEncodedModel}/invoke-with-response-stream`;
    if (
      (mappedFn === 'chatComplete' || mappedFn === 'stream-chatComplete') &&
      model &&
      !bedrockInvokeModels.includes(model)
    ) {
      endpoint = `/model/${uriEncodedModel}/converse`;
      streamEndpoint = `/model/${uriEncodedModel}/converse-stream`;
    }

    const jobIdIndex =
      idkRequestData.functionName === FunctionName.CANCEL_FINE_TUNING_JOB
        ? -2
        : -1;
    const jobId = idkRequestData.url.split('/').at(jobIdIndex);

    switch (mappedFn) {
      case 'chatComplete': {
        return endpoint;
      }
      case 'stream-chatComplete': {
        return streamEndpoint;
      }
      case 'complete': {
        return endpoint;
      }
      case 'stream-complete': {
        return streamEndpoint;
      }
      case 'embed': {
        return endpoint;
      }
      case 'imageGenerate': {
        return endpoint;
      }
      case 'createBatch': {
        return '/model-invocation-job';
      }
      case 'cancelBatch': {
        return `/model-invocation-job/${idkRequestData.url.split('/').pop()}/stop`;
      }
      case 'retrieveBatch': {
        return `/model-invocation-job/${idkRequestData.url.split('/v1/batches/')[1]}`;
      }
      case 'listBatches': {
        return '/model-invocation-jobs';
      }
      case 'listFinetunes': {
        return '/model-customization-jobs';
      }
      case 'retrieveFinetune': {
        return `/model-customization-jobs/${jobId}`;
      }
      case 'createFinetune': {
        return '/model-customization-jobs';
      }
      case 'cancelFinetune': {
        return `/model-customization-jobs/${jobId}/stop`;
      }
      default:
        return '';
    }
  },
};

export default bedrockAPIConfig;
