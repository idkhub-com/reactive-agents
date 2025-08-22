import { z } from 'zod';

/**
 * Moderation categories schema
 * Represents OpenAI's content moderation model's policy compliance report categories
 */
export const ModerationCategories = z.object({
  /** Content that expresses, incites, or promotes hate based on race, gender, ethnicity, religion, nationality, sexual orientation, disability status, or caste. Hateful content aimed at non-protected groups (e.g., chess players) is harassment. */
  hate: z.boolean(),

  /** Hateful content that also includes violence or serious harm towards the targeted group based on race, gender, ethnicity, religion, nationality, sexual orientation, disability status, or caste. */
  'hate/threatening': z.boolean(),

  /** Content that expresses, incites, or promotes harassing language towards any target. */
  harassment: z.boolean(),

  /** Harassment content that also includes violence or serious harm towards any target. */
  'harassment/threatening': z.boolean(),

  /** Content that promotes, encourages, or depicts acts of self-harm, such as suicide, cutting, and eating disorders. */
  'self-harm': z.boolean(),

  /** Content where the speaker expresses that they are engaging or intend to engage in acts of self-harm, such as suicide or cutting. */
  'self-harm/intent': z.boolean(),

  /** Content that encourages performing acts of self-harm, such as suicide, cutting, and eating disorders, or that gives instructions or advice on how to commit such acts. */
  'self-harm/instructions': z.boolean(),

  /** Content meant to arouse sexual excitement, such as the description of sexual activity, or that promotes sexual services (excluding sex education and wellness). */
  sexual: z.boolean(),

  /** Sexual content that includes an individual who is under 18 years old. */
  'sexual/minors': z.boolean(),

  /** Content that depicts death, violence, or physical injury. */
  violence: z.boolean(),

  /** Content that depicts death, violence, or physical injury in graphic detail. */
  'violence/graphic': z.boolean(),

  /** Content that includes instructions or advice on how to commit wrongdoing (e.g., "how to shoplift"). Available with omni-moderation models. */
  illicit: z.boolean().optional(),

  /** Content that includes instructions or advice on committing wrongdoing that also involves violence. Available with omni-moderation models. */
  'illicit/violent': z.boolean().optional(),
});

export type ModerationCategories = z.infer<typeof ModerationCategories>;

/**
 * Moderation category scores schema
 * Represents the confidence scores for each moderation category
 */
export const ModerationCategoryScores = z.object({
  /** Score for hate content (0.0 to 1.0) */
  hate: z.number(),

  /** Score for hate/threatening content (0.0 to 1.0) */
  'hate/threatening': z.number(),

  /** Score for harassment content (0.0 to 1.0) */
  harassment: z.number(),

  /** Score for harassment/threatening content (0.0 to 1.0) */
  'harassment/threatening': z.number(),

  /** Score for self-harm content (0.0 to 1.0) */
  'self-harm': z.number(),

  /** Score for self-harm/intent content (0.0 to 1.0) */
  'self-harm/intent': z.number(),

  /** Score for self-harm/instructions content (0.0 to 1.0) */
  'self-harm/instructions': z.number(),

  /** Score for sexual content (0.0 to 1.0) */
  sexual: z.number(),

  /** Score for sexual/minors content (0.0 to 1.0) */
  'sexual/minors': z.number(),

  /** Score for violence content (0.0 to 1.0) */
  violence: z.number(),

  /** Score for violence/graphic content (0.0 to 1.0) */
  'violence/graphic': z.number(),

  /** Score for illicit content (0.0 to 1.0). Available with omni-moderation models. */
  illicit: z.number().optional(),

  /** Score for illicit/violent content (0.0 to 1.0). Available with omni-moderation models. */
  'illicit/violent': z.number().optional(),
});

export type ModerationCategoryScores = z.infer<typeof ModerationCategoryScores>;

/**
 * Category applied input types schema
 * Indicates which modalities of data were taken into account for each category
 */
export const ModerationCategoryAppliedInputTypes = z.object({
  /** Input types applied for hate category */
  hate: z.array(z.enum(['text', 'image'])).optional(),

  /** Input types applied for hate/threatening category */
  'hate/threatening': z.array(z.enum(['text', 'image'])).optional(),

  /** Input types applied for harassment category */
  harassment: z.array(z.enum(['text', 'image'])).optional(),

  /** Input types applied for harassment/threatening category */
  'harassment/threatening': z.array(z.enum(['text', 'image'])).optional(),

  /** Input types applied for self-harm category */
  'self-harm': z.array(z.enum(['text', 'image'])).optional(),

  /** Input types applied for self-harm/intent category */
  'self-harm/intent': z.array(z.enum(['text', 'image'])).optional(),

  /** Input types applied for self-harm/instructions category */
  'self-harm/instructions': z.array(z.enum(['text', 'image'])).optional(),

  /** Input types applied for sexual category */
  sexual: z.array(z.enum(['text', 'image'])).optional(),

  /** Input types applied for sexual/minors category */
  'sexual/minors': z.array(z.enum(['text', 'image'])).optional(),

  /** Input types applied for violence category */
  violence: z.array(z.enum(['text', 'image'])).optional(),

  /** Input types applied for violence/graphic category */
  'violence/graphic': z.array(z.enum(['text', 'image'])).optional(),

  /** Input types applied for illicit category */
  illicit: z.array(z.enum(['text', 'image'])).optional(),

  /** Input types applied for illicit/violent category */
  'illicit/violent': z.array(z.enum(['text', 'image'])).optional(),
});

export type ModerationCategoryAppliedInputTypes = z.infer<
  typeof ModerationCategoryAppliedInputTypes
>;

/**
 * Moderation result for a single input
 */
export const ModerationResult = z.object({
  /** Whether the content violates OpenAI's usage policies */
  flagged: z.boolean(),

  /** A dictionary of per-category binary content policy violation flags */
  categories: ModerationCategories,

  /** A dictionary of per-category raw scores output by the model */
  category_scores: ModerationCategoryScores,

  /**
   * Indicates which modalities of data were taken into account for each category.
   * Available with omni-moderation models when using multimodal input.
   */
  category_applied_input_types: ModerationCategoryAppliedInputTypes.optional(),
});

export type ModerationResult = z.infer<typeof ModerationResult>;

/**
 * OpenAI Moderation API Response Schema
 * Represents OpenAI's content moderation model's policy compliance report for given input(s)
 */
export const ModerationResponseBody = z.object({
  /** The unique identifier for the moderation request */
  id: z.string(),

  /** The model used to generate the moderation results */
  model: z.string(),

  /** A list of moderation objects */
  results: z.array(ModerationResult),
});

export type ModerationResponseBody = z.infer<typeof ModerationResponseBody>;
