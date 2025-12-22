import z from 'zod';

export const CreateEmbeddingsRequestBody = z.object({
  /**
   * Input text to embed, encoded as a string or array of tokens.
   * To embed multiple inputs in a single request, pass an array of strings or array of token arrays.
   * The input must not exceed the max input tokens for the model (8192 tokens for text-embedding-ada-002),
   * cannot be an empty string, and any array must be 2048 dimensions or less.
   */
  input: z.union([
    z.string(),
    z.array(z.string()),
    z.array(z.number()),
    z.array(z.array(z.number())),
  ]),

  /**
   * ID of the model to use. You can use the List models API to see all of your available models,
   * or see our Model overview for descriptions of them.
   * Examples: text-embedding-3-small, text-embedding-3-large, text-embedding-ada-002
   */
  model: z.string(),

  /**
   * The format to return the embeddings in. Can be either float or base64.
   * @default "float"
   */
  encoding_format: z.enum(['float', 'base64']).optional(),

  /**
   * The number of dimensions the resulting output embeddings should have.
   * Only supported in text-embedding-3 and later models.
   */
  dimensions: z.number().optional(),

  /**
   * A unique identifier representing your end-user, which can help OpenAI to monitor and detect abuse.
   */
  user: z.string().optional(),

  /**
   * Input type of embedding search to use.
   * Only supported in certain models.
   */
  input_type: z.string().optional(),
});

export type CreateEmbeddingsRequestBody = z.infer<
  typeof CreateEmbeddingsRequestBody
>;
