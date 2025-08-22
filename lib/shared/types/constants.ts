import { FunctionName } from '@shared/types/api/request';
import z from 'zod';

export const POWERED_BY = 'portkey';

export enum AIProvider {
  OPENAI = 'openai',
  COHERE = 'cohere',
  AZURE_OPENAI = 'azure-openai',
  AZURE_AI = 'azure-ai',
  ANTHROPIC = 'anthropic',
  ANYSCALE = 'anyscale',
  PALM = 'palm',
  TOGETHER_AI = 'together-ai',
  GOOGLE = 'google',
  GOOGLE_VERTEX_AI = 'vertex-ai',
  HUGGINGFACE = 'huggingface',
  PERPLEXITY_AI = 'perplexity-ai',
  REKA_AI = 'reka-ai',
  MISTRAL_AI = 'mistral-ai',
  DEEPINFRA = 'deepinfra',
  NCOMPASS = 'ncompass',
  STABILITY_AI = 'stability-ai',
  NOMIC = 'nomic',
  OLLAMA = 'ollama',
  AI21 = 'ai21',
  BEDROCK = 'bedrock',
  GROQ = 'groq',
  SEGMIND = 'segmind',
  JINA = 'jina',
  FIREWORKS_AI = 'fireworks-ai',
  WORKERS_AI = 'workers-ai',
  MOONSHOT = 'moonshot',
  OPENROUTER = 'openrouter',
  LINGYI = 'lingyi',
  ZHIPU = 'zhipu',
  NOVITA_AI = 'novita-ai',
  MONSTERAPI = 'monsterapi',
  DEEPSEEK = 'deepseek',
  PREDIBASE = 'predibase',
  TRITON = 'triton',
  VOYAGE = 'voyage',
  GITHUB = 'github',
  DEEPBRICKS = 'deepbricks',
  SILICONFLOW = 'siliconflow',
  CEREBRAS = 'cerebras',
  INFERENCE_NET = 'inference-net',
  SAMBANOVA = 'sambanova',
  LEMONFOX_AI = 'lemonfox-ai',
  UPSTAGE = 'upstage',
  LAMBDA = 'lambda',
  DASHSCOPE = 'dashscope',
  X_AI = 'x-ai',
  CORTEX = 'cortex',
  SAGEMAKER = 'sagemaker',
  NEBIUS = 'nebius',
  RECRFT_AI = 'recraft-ai',
  MILVUS = 'milvus',
  REPLICATE = 'replicate',
  LEPTON = 'lepton',
}

export const MAX_RETRY_LIMIT_MS = 60 * 1000; // 60 seconds

export const POSSIBLE_RETRY_STATUS_HEADERS = [
  'retry-after-ms',
  'x-ms-retry-after-ms',
  'retry-after',
];

export const RETRY_STATUS_CODES = [429, 500, 502, 503, 504];
export const MAX_RETRIES = 5;
export const REQUEST_TIMEOUT_STATUS_CODE = 408;
export const PRECONDITION_CHECK_FAILED_STATUS_CODE = 412;

export enum ContentTypeName {
  APPLICATION_JSON = 'application/json',
  MULTIPART_FORM_DATA = 'multipart/form-data',
  EVENT_STREAM = 'text/event-stream',
  AUDIO_MPEG = 'audio/mpeg',
  APPLICATION_OCTET_STREAM = 'application/octet-stream',
  BINARY_OCTET_STREAM = 'binary/octet-stream',
  GENERIC_AUDIO_PATTERN = 'audio',
  PLAIN_TEXT = 'text/plain',
  HTML = 'text/html',
  GENERIC_IMAGE_PATTERN = 'image/',
}

export const MultipartFormDataEndpoints: FunctionName[] = [
  FunctionName.CREATE_TRANSCRIPTION,
  FunctionName.CREATE_TRANSLATION,
  FunctionName.UPLOAD_FILE,
];

export const FileExtensionName = z.enum([
  'mp4',
  'jpeg',
  'jpg',
  'png',
  'bmp',
  'tiff',
  'webp',
  'pdf',
  'csv',
  'doc',
  'docx',
  'xls',
  'xlsx',
  'html',
  'md',
  'mp3',
  'wav',
  'txt',
  'mov',
  'mpeg',
  'mpg',
  'avi',
  'wmv',
  'mpegps',
  'flv',
  'webm',
]);

export type FileExtensionName = z.infer<typeof FileExtensionName>;

export const fileExtensionMimeTypeMap: Record<FileExtensionName, string> = {
  [FileExtensionName.enum.mp4]: 'video/mp4',
  [FileExtensionName.enum.jpeg]: 'image/jpeg',
  [FileExtensionName.enum.jpg]: 'image/jpeg',
  [FileExtensionName.enum.png]: 'image/png',
  [FileExtensionName.enum.bmp]: 'image/bmp',
  [FileExtensionName.enum.tiff]: 'image/tiff',
  [FileExtensionName.enum.webp]: 'image/webp',
  [FileExtensionName.enum.pdf]: 'application/pdf',
  [FileExtensionName.enum.csv]: 'text/csv',
  [FileExtensionName.enum.doc]: 'application/msword',
  [FileExtensionName.enum.docx]:
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  [FileExtensionName.enum.xls]: 'application/vnd.ms-excel',
  [FileExtensionName.enum.xlsx]:
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  [FileExtensionName.enum.html]: 'text/html',
  [FileExtensionName.enum.md]: 'text/markdown',
  [FileExtensionName.enum.mp3]: 'audio/mp3',
  [FileExtensionName.enum.wav]: 'audio/wav',
  [FileExtensionName.enum.txt]: 'text/plain',
  [FileExtensionName.enum.mov]: 'video/mov',
  [FileExtensionName.enum.mpeg]: 'video/mpeg',
  [FileExtensionName.enum.mpg]: 'video/mpg',
  [FileExtensionName.enum.avi]: 'video/avi',
  [FileExtensionName.enum.wmv]: 'video/wmv',
  [FileExtensionName.enum.mpegps]: 'video/mpegps',
  [FileExtensionName.enum.flv]: 'video/flv',
  [FileExtensionName.enum.webm]: 'video/webm',
};

export const imagesMimeTypes = [
  fileExtensionMimeTypeMap.jpeg,
  fileExtensionMimeTypeMap.jpg,
  fileExtensionMimeTypeMap.png,
  fileExtensionMimeTypeMap.bmp,
  fileExtensionMimeTypeMap.tiff,
  fileExtensionMimeTypeMap.webp,
];

export const documentMimeTypes = [
  fileExtensionMimeTypeMap.pdf,
  fileExtensionMimeTypeMap.csv,
  fileExtensionMimeTypeMap.doc,
  fileExtensionMimeTypeMap.docx,
  fileExtensionMimeTypeMap.xls,
  fileExtensionMimeTypeMap.xlsx,
  fileExtensionMimeTypeMap.html,
  fileExtensionMimeTypeMap.md,
  fileExtensionMimeTypeMap.txt,
];
