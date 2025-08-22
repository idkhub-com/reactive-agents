import { z } from 'zod';

/**
 * Word-level transcription with timestamps.
 */
export const TranscriptionWord = z.object({
  /** The transcribed word. */
  word: z.string(),
  /** Start time of the word in seconds. */
  start: z.number(),
  /** End time of the word in seconds. */
  end: z.number(),
});

export type TranscriptionWord = z.infer<typeof TranscriptionWord>;

/**
 * Segment of transcription with timestamps and metadata.
 */
export const TranscriptionSegment = z.object({
  /** Unique identifier of the segment. */
  id: z.number(),
  /** Seek position of the segment. */
  seek: z.number(),
  /** Start time of the segment in seconds. */
  start: z.number(),
  /** End time of the segment in seconds. */
  end: z.number(),
  /** Text content of the segment. */
  text: z.string(),
  /** Array of tokens in the segment. */
  tokens: z.array(z.number()),
  /** Temperature parameter used for the segment. */
  temperature: z.number(),
  /** Average log probability of the segment. */
  avg_logprob: z.number(),
  /** Compression ratio of the segment. */
  compression_ratio: z.number(),
  /** Probability that the segment contains no speech. */
  no_speech_prob: z.number(),
  /** Words in the segment with timestamps (only if requested). */
  words: z.array(TranscriptionWord).optional(),
});

export type TranscriptionSegment = z.infer<typeof TranscriptionSegment>;

/**
 * Response for create speech API - returns audio data directly
 * The actual response is binary audio data, not JSON
 */
export const CreateSpeechResponseBody = z.instanceof(Blob); // Binary audio data

export type CreateSpeechResponseBody = z.infer<typeof CreateSpeechResponseBody>;

/**
 * Response for create transcription API (json format)
 */
export const CreateTranscriptionResponseBody = z.object({
  /** The transcribed text. */
  text: z.string(),
});

export type CreateTranscriptionResponseBody = z.infer<
  typeof CreateTranscriptionResponseBody
>;

/**
 * Response for create transcription API (verbose_json format)
 */
export const CreateTranscriptionVerboseResponseBody = z.object({
  /** The task performed. Always "transcribe" for transcriptions. */
  task: z.literal('transcribe').optional(),
  /** The language of the input audio. */
  language: z.string(),
  /** The duration of the input audio. */
  duration: z.number(),
  /** The transcribed text. */
  text: z.string(),
  /** The total number of words in the transcription. */
  word_count: z.number().optional(),
  /** Segments of the transcription with timestamps and metadata. */
  segments: z.array(TranscriptionSegment).optional(),
  /** Words of the transcription with timestamps (only if requested). */
  words: z.array(TranscriptionWord).optional(),
});

export type CreateTranscriptionVerboseResponseBody = z.infer<
  typeof CreateTranscriptionVerboseResponseBody
>;

/**
 * Response for create translation API (json format)
 */
export const CreateTranslationResponseBody = z.object({
  /** The translated text. */
  text: z.string(),
});

export type CreateTranslationResponseBody = z.infer<
  typeof CreateTranslationResponseBody
>;

/**
 * Response for create translation API (verbose_json format)
 */
export const CreateTranslationVerboseResponseBody = z.object({
  /** The task performed. Always "translate" for translations. */
  task: z.literal('translate').optional(),
  /** The language of the input audio. */
  language: z.string(),
  /** The duration of the input audio. */
  duration: z.number(),
  /** The translated text. */
  text: z.string(),
  /** The total number of words in the translation. */
  word_count: z.number().optional(),
  /** Segments of the translation with timestamps and metadata. */
  segments: z.array(TranscriptionSegment).optional(),
});

export type CreateTranslationVerboseResponseBody = z.infer<
  typeof CreateTranslationVerboseResponseBody
>;
