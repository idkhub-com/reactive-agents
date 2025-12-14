import { z } from 'zod';

export const FileUploadRequestBody = z.object({
  /**
   * The File object (not file name) to be uploaded.
   * To upload a file with a specific filename, you need to wrap it in a File object or form data.
   */
  file: z.union([
    z.instanceof(File),
    z.instanceof(Blob),
    z.instanceof(Buffer),
    z.instanceof(ReadableStream),
  ]),

  /**
   * The intended purpose of the uploaded file.
   * Use "assistants" for Assistants and Message files, "vision" for Assistants image file inputs,
   * "batch" for Batch API, "fine-tune" for Fine-tuning.
   */
  purpose: z.enum(['assistants', 'vision', 'batch', 'fine-tune']),
});

export type FileUploadRequestBody = z.infer<typeof FileUploadRequestBody>;

export const FileListRequestBody = z.object({
  /**
   * Only return files with the given purpose.
   */
  purpose: z.enum(['assistants', 'vision', 'batch', 'fine-tune']).optional(),

  /**
   * A limit on the number of objects to be returned.
   * Limit can range between 1 and 10,000, and the default is 10,000.
   */
  limit: z.number().optional(),

  /**
   * Sort order by the created_at timestamp of the objects.
   * asc for ascending order and desc for descending order.
   * @default "desc"
   */
  order: z.enum(['asc', 'desc']).optional(),

  /**
   * A cursor for use in pagination. after is an object ID that defines your place in the list.
   * For instance, if you make a list request and receive 100 objects, ending with obj_foo,
   * your subsequent call can include after=obj_foo in order to fetch the next page of the list.
   */
  after: z.string().optional(),
});

export type FileListRequestBody = z.infer<typeof FileListRequestBody>;

export const FileRetrieveRequestBody = z.object({
  /**
   * The ID of the file to use for this request.
   */
  file_id: z.string(),
});

export type FileRetrieveRequestBody = z.infer<typeof FileRetrieveRequestBody>;

export const FileDeleteRequestBody = z.object({
  /**
   * The ID of the file to delete.
   */
  file_id: z.string(),
});

export type FileDeleteRequestBody = z.infer<typeof FileDeleteRequestBody>;

export const FileContentRequestBody = z.object({
  /**
   * The ID of the file to retrieve content for.
   */
  file_id: z.string(),
});

export type FileContentRequestBody = z.infer<typeof FileContentRequestBody>;
