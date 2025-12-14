import { z } from 'zod';

/**
 * The size of the generated images.
 */
export const ImageSize = z.union([
  z.literal('256x256'),
  z.literal('512x512'),
  z.literal('1024x1024'),
  z.literal('1792x1024'),
  z.literal('1024x1792'),
  z.literal('1024x1536'), // GPT-image-1 size option
  z.literal('1536x1024'), // GPT-image-1 size option
]);

export type ImageSize = z.infer<typeof ImageSize>;

/**
 * The quality of the image that will be generated.
 */
export const ImageQuality = z.union([
  z.literal('standard'),
  z.literal('hd'),
  z.literal('low'), // GPT-image-1 quality option
  z.literal('medium'), // GPT-image-1 quality option
  z.literal('high'), // GPT-image-1 quality option
]);

export type ImageQuality = z.infer<typeof ImageQuality>;

/**
 * The style of the generated images.
 */
export const ImageStyle = z.union([z.literal('vivid'), z.literal('natural')]);

export type ImageStyle = z.infer<typeof ImageStyle>;

/**
 * The format in which the generated images are returned.
 */
export const ImageResponseFormat = z.union([
  z.literal('url'),
  z.literal('b64_json'),
]);

export type ImageResponseFormat = z.infer<typeof ImageResponseFormat>;

/**
 * The output format for the generated images (GPT-image-1).
 */
export const ImageOutputFormat = z.union([z.literal('PNG'), z.literal('JPEG')]);

export type ImageOutputFormat = z.infer<typeof ImageOutputFormat>;

/**
 * The parameters for the image generation API request.
 * Used for the /v1/images/generations endpoint.
 */
export const GenerateImageRequestBody = z.object({
  /** A text description of the desired image(s). The maximum length is 4,000 characters. */
  prompt: z.string().max(4000),
  /** The model to use for image generation. */
  model: z.string(),
  /** The number of images to generate. Must be between 1 and 10. For dall-e-3, only n=1 is supported. */
  n: z.number().int().min(1).max(10).optional(),
  /** The quality of the image that will be generated. */
  quality: ImageQuality.optional(),
  /** The format in which the generated images are returned. */
  response_format: ImageResponseFormat.optional(),
  /** The size of the generated images. */
  size: ImageSize.optional(),
  /** The style of the generated images. */
  style: ImageStyle.optional(),
  /** A unique identifier representing your end-user, which can help to monitor and detect abuse. */
  user: z.string().optional(),
  /** The output format for the generated images (GPT-image-1). Supported formats are PNG and JPEG. */
  output_format: ImageOutputFormat.optional(),
  /** The compression level for the generated image (GPT-image-1). Integer between 0 and 100, where 0 is no compression and 100 is maximum compression. */
  output_compression: z.number().int().min(0).max(100).optional(),
});

export type GenerateImageRequestBody = z.infer<typeof GenerateImageRequestBody>;
