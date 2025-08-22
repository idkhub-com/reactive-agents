import { z } from 'zod';

export enum FilePurpose {
  ASSISTANTS = 'assistants',
  VISION = 'vision',
  BATCH = 'batch',
  FINE_TUNE = 'fine-tune',
}

export enum FileStatus {
  UPLOADED = 'uploaded',
  PROCESSED = 'processed',
  ERROR = 'error',
}

export const FileObject = z.object({
  /**
   * The file identifier, which can be referenced in the API endpoints.
   */
  id: z.string(),

  /**
   * The object type, which is always "file".
   */
  object: z.literal('file'),

  /**
   * The size of the file, in bytes.
   */
  bytes: z.number(),

  /**
   * The Unix timestamp (in seconds) for when the file was created.
   */
  created_at: z.number(),

  /**
   * The name of the file.
   */
  filename: z.string(),

  /**
   * The intended purpose of the file. Supported values are "assistants", "vision", "batch", and "fine-tune".
   */
  purpose: z.nativeEnum(FilePurpose),

  /**
   * Deprecated. The current status of the file, which can be either uploaded, processed, or error.
   */
  status: z.nativeEnum(FileStatus).optional(),

  /**
   * Deprecated. For details on why a fine-tuning training file failed validation, see the error field on fine-tuning jobs.
   */
  status_details: z.string().optional(),
});

export type FileObject = z.infer<typeof FileObject>;

export const FileListResponseBody = z.object({
  /**
   * The object type, which is always "list".
   */
  object: z.literal('list'),

  /**
   * The list of files.
   */
  data: z.array(FileObject),

  /**
   * The first ID in the list. Can be used for pagination.
   */
  first_id: z.string().optional(),

  /**
   * The last ID in the list. Can be used for pagination.
   */
  last_id: z.string().optional(),

  /**
   * Whether there are more files to retrieve.
   */
  has_more: z.boolean(),
});

export type FileListResponseBody = z.infer<typeof FileListResponseBody>;

export const FileUploadResponseBody = FileObject;

export type FileUploadResponseBody = z.infer<typeof FileUploadResponseBody>;

export const FileRetrieveResponseBody = FileObject;

export type FileRetrieveResponseBody = z.infer<typeof FileRetrieveResponseBody>;

export const FileDeleteResponseBody = z.object({
  /**
   * The ID of the deleted file.
   */
  id: z.string(),

  /**
   * The object type, which is always "file".
   */
  object: z.literal('file'),

  /**
   * Whether the file was successfully deleted.
   */
  deleted: z.boolean(),
});

export type FileDeleteResponseBody = z.infer<typeof FileDeleteResponseBody>;

export const FileContentResponseBody = z.object({
  /**
   * The file content as a string or binary data.
   * The actual type depends on the file format.
   */
  content: z.union([z.string(), z.instanceof(ArrayBuffer), z.instanceof(Blob)]),

  /**
   * The content type of the file.
   */
  contentType: z.string().optional(),

  /**
   * The size of the content in bytes.
   */
  size: z.number().optional(),
});

export type FileContentResponseBody = z.infer<typeof FileContentResponseBody>;

export const FileError = z.object({
  /**
   * The error message.
   */
  message: z.string(),

  /**
   * The error type.
   */
  type: z.string(),

  /**
   * The error parameter that caused the issue.
   */
  param: z.string().optional(),

  /**
   * The error code.
   */
  code: z.string().optional(),
});

export type FileError = z.infer<typeof FileError>;

export const FileErrorResponseBody = z.object({
  /**
   * The error object.
   */
  error: FileError,
});

export type FileErrorResponseBody = z.infer<typeof FileErrorResponseBody>;
