import { z } from 'zod';

/**
 * OpenAI Moderation API Request Body Schema
 *
 * The moderation endpoint is a tool you can use to check whether content complies with OpenAI's usage policies.
 * Developers can integrate the moderation endpoint into their applications to warn or block certain types of unsafe content.
 */
/**
 * Moderation input content schema for multimodal support
 */
export const ModerationInputContent = z.object({
  /** The type of the input - either text or image_url */
  type: z.enum(['text', 'image_url']),

  /** The text content to moderate (when type is 'text') */
  text: z.string().optional(),

  /** The image URL content to moderate (when type is 'image_url') */
  image_url: z
    .object({
      /** Either a URL of the image or the base64 encoded image data */
      url: z.string(),
    })
    .optional(),
});

export type ModerationInputContent = z.infer<typeof ModerationInputContent>;

export const ModerationRequestBody = z.object({
  /**
   * The input text to classify for content policy violations.
   * Can be a single string, an array of strings, or an array of content objects for multimodal support.
   *
   * For text-only: string | string[]
   * For multimodal (with omni-moderation-latest): Array of objects with type and content
   */
  input: z.union([
    z.string(),
    z.array(z.string()),
    z.array(ModerationInputContent),
  ]),

  /**
   * The content moderation model to use. Available options:
   * - text-moderation-latest: Latest text-only model (default)
   * - text-moderation-stable: Stable text-only model
   * - omni-moderation-latest: Latest multimodal model (supports both text and images)
   * - omni-moderation-2024-09-26: Specific version of the multimodal model
   *
   * The omni-moderation models support both text and image inputs and include
   * additional categories like 'illicit' and 'illicit/violent'.
   */
  model: z.string().optional().default('text-moderation-latest'),
});

export type ModerationRequestBody = z.infer<typeof ModerationRequestBody>;
