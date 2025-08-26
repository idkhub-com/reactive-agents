import { IdkRequestBody } from '@shared/types/api/request/body';
import { AIProvider, RETRY_STATUS_CODES } from '@shared/types/constants';
import { CacheMode, CacheSettings } from '@shared/types/middleware/cache';
import { Hook } from '@shared/types/middleware/hooks';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

export enum HeaderKey {
  CONFIG = 'x-idk-config',
  CONTENT_TYPE = 'content-type',
}

/**
 * Settings for retrying requests.
 */
export const RetrySettings = z.object({
  /** The maximum number of retry attempts. */
  attempts: z.number(),
  /** The HTTP status codes on which to retry. */
  on_status_codes: z.array(z.number()).default(RETRY_STATUS_CODES).optional(),
  /** Whether to use the provider's retry wait. */
  use_retry_after_header: z.boolean().optional(),
});

export type RetrySettings = z.infer<typeof RetrySettings>;

export const IdkTarget = z.object({
  // Target Details
  id: z.string().optional(),
  index: z.number().optional(),

  // Target Settings
  weight: z.number().default(1),
  on_status_codes: z.array(z.number()).optional(),
  request_timeout: z.number().optional(),
  custom_host: z.string().optional(),
  forward_headers: z.array(z.string()).optional(),
  cache: CacheSettings.default({ mode: CacheMode.DISABLED }),
  retry: RetrySettings.default({ attempts: 0 }),

  // Provider Details
  provider: z.enum(AIProvider, {
    error: (err) => {
      if (err.input === undefined) {
        return 'Provider is required';
      }
      return `Invalid provider: ${err.input}`;
    },
  }),
  // model: z.string(), // TODO: Make use of this field
  inner_provider: z.enum(AIProvider).optional(),
  api_key: z
    .string()
    .optional()
    .describe('The API key for the provider if not defined through the UI'),

  // Anthropic specific
  anthropic_beta: z.string().optional(),
  anthropic_version: z.string().optional(),

  // AWS specific
  aws_secret_access_key: z.string().optional(),
  aws_access_key_id: z.string().optional(),
  aws_session_token: z.string().optional(),
  aws_region: z.string().optional(),
  aws_auth_type: z.string().optional(),
  aws_role_arn: z.string().optional(),
  aws_external_id: z.string().optional(),
  aws_s3_bucket: z.string().optional(),
  aws_s3_object_key: z.string().optional(),
  aws_bedrock_model: z.string().optional(),
  aws_server_side_encryption: z.string().optional(),
  aws_server_side_encryption_kms_key_id: z.string().optional(),

  // Azure OpenAI specific
  azure_model_name: z.string().optional(),
  azure_deployment_name: z.string().optional(),
  azure_deployment_id: z.string().optional(),
  azure_resource_name: z.string().optional(),
  azure_api_version: z.string().optional(),
  azure_extra_params: z.string().optional(),
  azure_foundry_url: z.string().optional(),
  azure_auth_mode: z.string().optional(),
  azure_managed_client_id: z.string().optional(),
  azure_entra_client_id: z.string().optional(),
  azure_entra_client_secret: z.string().optional(),
  azure_entra_tenant_id: z.string().optional(),
  azure_ad_auth: z.string().optional(),
  azure_ad_token: z.string().optional(),
  azure_url_to_fetch: z.string().optional(),

  // Cortex specific
  snowflake_account: z.string().optional(),

  // Fireworks fine-tune required fields
  fireworks_account_id: z.string().optional(),

  // Google specific
  vertex_service_account_json: z.string().optional(),
  vertex_region: z.string().optional(),
  vertex_project_id: z.string().optional(),
  vertex_storage_bucket_name: z.string().optional(),
  vertex_model_name: z.string().optional(),
  // Required for file uploads with google.
  filename: z.string().optional(),

  // Hugging Face specific
  huggingface_base_url: z.string().optional(),

  // Mistral specific
  // Parameter to determine if fim/completions endpoint is to be used
  mistral_fim_completion: z.string().optional(),

  // OpenAI specific
  openai_project: z.string().optional(),
  openai_organization: z.string().optional(),
  openai_beta: z.string().optional(),

  // Sagemaker specific
  amzn_sagemaker_custom_attributes: z.string().optional(),
  amzn_sagemaker_target_model: z.string().optional(),
  amzn_sagemaker_target_variant: z.string().optional(),
  amzn_sagemaker_target_container_hostname: z.string().optional(),
  amzn_sagemaker_inference_id: z.string().optional(),
  amzn_sagemaker_session_id: z.string().optional(),
  amzn_sagemaker_model_name: z.string().optional(),

  // Stability AI specific
  stability_client_id: z.string().optional(),
  stability_client_user_id: z.string().optional(),
  stability_client_version: z.string().optional(),
  stability_url_to_fetch: z.string().optional(),
});

export type IdkTarget = z.infer<typeof IdkTarget>;

export enum StrategyModes {
  LOADBALANCE = 'loadbalance',
  FALLBACK = 'fallback',
  SINGLE = 'single',
  CONDITIONAL = 'conditional',
}

export const Strategy = z.object({
  mode: z.enum(StrategyModes).describe('The strategy mode to use'),
  on_status_codes: z.array(z.number()).optional(),
  conditions: z
    .array(
      z.object({
        query: z.record(z.string(), z.unknown()),
        target: z.string(),
      }),
    )
    .optional(),
  default: z.string().optional(),
});

export type Strategy = z.infer<typeof Strategy>;

export const BaseIdkConfig = z.object({
  agent_name: z.string({ error: 'Agent name is required' }),
  skill_name: z.string({ error: 'Skill name is required' }),
  override_params: IdkRequestBody.optional(),
  request_timeout: z.number().optional(),
  forward_headers: z.array(z.string()).optional(),
  force_refresh: z.boolean().optional(),
  force_hook_refresh: z.boolean().optional(),
  strict_open_ai_compliance: z.boolean().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type BaseIdkConfig = z.infer<typeof BaseIdkConfig>;

export const IdkConfig = BaseIdkConfig.extend({
  strategy: Strategy.default({
    mode: StrategyModes.SINGLE,
  }),
  targets: z.array(IdkTarget),
  hooks: z.array(Hook).default([]),

  // Observability
  app_id: z.string().optional(),
  trace_id: z.string().default(uuidv4()),
  span_id: z.string().optional(),
  span_name: z.string().optional(),
  parent_span_id: z.string().optional(),
  user_human_name: z.string().optional(),
})
  // Validate Google Vertex AI specific fields
  .refine(
    (value) => {
      for (const target of value.targets) {
        const isGoogleVertexAIProvider =
          target.provider === AIProvider.GOOGLE_VERTEX_AI;
        const hasGoogleVertexAIFields =
          (target.vertex_project_id && target.vertex_region) ||
          (target.vertex_region && target.vertex_service_account_json);
        if (isGoogleVertexAIProvider && !hasGoogleVertexAIFields) {
          return false;
        }
      }
      return true;
    },
    {
      message: `Invalid configuration. ('vertex_project_id' and 'vertex_region') or ('vertex_service_account_json' and 'vertex_region') are required for Google Vertex AI provider. Example: { 'provider': 'vertex-ai', 'vertex_project_id': 'my-project-id', 'vertex_region': 'us-central1', api_key: 'ya29...' }`,
    },
  );

export type IdkConfig = z.infer<typeof IdkConfig>;
