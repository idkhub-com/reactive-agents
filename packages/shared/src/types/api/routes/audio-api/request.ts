import { z } from 'zod';

/**
 * The parameters for the create speech API request.
 * Used for the /v1/audio/speech endpoint.
 */
export const CreateSpeechRequestBody = z.object({
  /** ID of the model to use. */
  model: z.string(),
  /** The text to generate audio for. The maximum length is 4096 characters. */
  input: z.string(),
  /** The voice to use when generating the audio. */
  voice: z.union([
    z.literal('alloy'),
    z.literal('echo'),
    z.literal('fable'),
    z.literal('onyx'),
    z.literal('nova'),
    z.literal('shimmer'),
  ]),
  /** The format to audio in. Supported formats are mp3, opus, aac, flac, wav, and pcm. */
  response_format: z
    .union([
      z.literal('mp3'),
      z.literal('opus'),
      z.literal('aac'),
      z.literal('flac'),
      z.literal('wav'),
      z.literal('pcm'),
    ])
    .optional(),
  /** The speed of the generated audio. Select a value from 0.25 to 4.0. 1.0 is the default. */
  speed: z.number().min(0.25).max(4.0).optional(),
});

export type CreateSpeechRequestBody = z.infer<typeof CreateSpeechRequestBody>;

/**
 * The parameters for the create transcription API request.
 * Used for the /v1/audio/transcriptions endpoint.
 */
export const CreateTranscriptionRequestBody = z.object({
  /** The audio file object (not file name) to transcribe, in one of these formats: flac, m4a, mp3, mp4, mpeg, mpga, oga, ogg, wav, or webm. */
  file: z.any(), // File object - will be handled as multipart/form-data
  /** ID of the model to use. Only whisper-1 (which is powered by our open source Whisper V2 model) is currently available. */
  model: z.string(),
  /** The language of the input audio. Supplying the input language in ISO-639-1 format will improve accuracy and latency. */
  language: z.string().optional(),
  /** An optional text to guide the model's style or continue a previous audio segment. The prompt should match the audio language. */
  prompt: z.string().optional(),
  /** The format of the transcript output, in one of these options: json, text, srt, verbose_json, or vtt. */
  response_format: z
    .union([
      z.literal('json'),
      z.literal('text'),
      z.literal('srt'),
      z.literal('verbose_json'),
      z.literal('vtt'),
    ])
    .optional(),
  /** The sampling temperature, between 0 and 1. Higher values like 0.8 will make the output more random, while lower values like 0.2 will make it more focused and deterministic. If set to 0, the model will use log probability to automatically increase the temperature until certain thresholds are hit. */
  temperature: z.number().min(0).max(1).optional(),
  /** The timestamp granularities to return. Currently supports 'word' and 'segment'. */
  timestamp_granularities: z
    .array(z.union([z.literal('word'), z.literal('segment')]))
    .optional(),
});

export type CreateTranscriptionRequestBody = z.infer<
  typeof CreateTranscriptionRequestBody
>;

/**
 * The parameters for the create translation API request.
 * Used for the /v1/audio/translations endpoint.
 */
export const CreateTranslationRequestBody = z.object({
  /** The audio file object (not file name) to translate, in one of these formats: flac, m4a, mp3, mp4, mpeg, mpga, oga, ogg, wav, or webm. */
  file: z.any(), // File object - will be handled as multipart/form-data
  /** ID of the model to use. Only whisper-1 (which is powered by our open source Whisper V2 model) is currently available. */
  model: z.string(),
  /** An optional text to guide the model's style or continue a previous audio segment. The prompt should be in English. */
  prompt: z.string().optional(),
  /** The format of the transcript output, in one of these options: json, text, srt, verbose_json, or vtt. */
  response_format: z
    .union([
      z.literal('json'),
      z.literal('text'),
      z.literal('srt'),
      z.literal('verbose_json'),
      z.literal('vtt'),
    ])
    .optional(),
  /** The sampling temperature, between 0 and 1. Higher values like 0.8 will make the output more random, while lower values like 0.2 will make it more focused and deterministic. If set to 0, the model will use log probability to automatically increase the temperature until certain thresholds are hit. */
  temperature: z.number().min(0).max(1).optional(),
});

export type CreateTranslationRequestBody = z.infer<
  typeof CreateTranslationRequestBody
>;
