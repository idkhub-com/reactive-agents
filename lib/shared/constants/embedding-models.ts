// Well-known embedding models and their default dimensions
// Users can still modify these values if needed

export const KNOWN_EMBEDDING_MODELS: Record<string, number> = {
  // OpenAI
  'text-embedding-3-small': 1536,
  'text-embedding-3-large': 3072,
  'text-embedding-ada-002': 1536,

  // Mistral
  'mistral-embed': 1024,
  'codestral-embed': 1536,

  // Cohere
  'embed-english-v3.0': 1024,
  'embed-multilingual-v3.0': 1024,
  'embed-english-light-v3.0': 384,
  'embed-multilingual-light-v3.0': 384,
  'embed-english-v2.0': 4096,
  'embed-english-light-v2.0': 1024,
  'embed-multilingual-v2.0': 768,

  // Voyage AI
  'voyage-3': 1024,
  'voyage-3-lite': 512,
  'voyage-3-large': 1024,
  'voyage-code-3': 1024,
  'voyage-large-2': 1536,
  'voyage-code-2': 1536,
  'voyage-finance-2': 1024,
  'voyage-law-2': 1024,
  'voyage-2': 1024,
  'voyage-lite-02-instruct': 1024,

  // Google (Vertex AI / Gemini)
  'text-embedding-004': 768,
  'text-embedding-005': 768,
  'gemini-embedding-001': 3072,
  'textembedding-gecko': 768,
  'textembedding-gecko@003': 768,
  'textembedding-gecko@002': 768,
  'textembedding-gecko@001': 768,
  'textembedding-gecko-multilingual': 768,

  // Amazon Bedrock (Titan)
  'amazon.titan-embed-text-v1': 1536,
  'amazon.titan-embed-text-v2:0': 1024,
  'amazon.titan-embed-image-v1': 1024,

  // Jina AI
  'jina-embeddings-v2-base-en': 768,
  'jina-embeddings-v2-small-en': 512,
  'jina-embeddings-v3': 1024,
  'jina-clip-v1': 768,

  // BGE (BAAI)
  'bge-large-en-v1.5': 1024,
  'bge-base-en-v1.5': 768,
  'bge-small-en-v1.5': 384,
  'bge-m3': 1024,

  // Nomic
  'nomic-embed-text-v1': 768,
  'nomic-embed-text-v1.5': 768,

  // Together AI
  'togethercomputer/m2-bert-80M-8k-retrieval': 768,
  'togethercomputer/m2-bert-80M-32k-retrieval': 768,

  // Fireworks
  'nomic-ai/nomic-embed-text-v1.5': 768,
  'WhereIsAI/UAE-Large-V1': 1024,
};

/**
 * Get the default embedding dimensions for a known model
 * @param modelName The model name to look up
 * @returns The default dimensions if known, undefined otherwise
 */
export function getKnownEmbeddingDimensions(
  modelName: string,
): number | undefined {
  // Try exact match first
  if (modelName in KNOWN_EMBEDDING_MODELS) {
    return KNOWN_EMBEDDING_MODELS[modelName];
  }

  // Try case-insensitive match
  const lowerName = modelName.toLowerCase();
  for (const [key, value] of Object.entries(KNOWN_EMBEDDING_MODELS)) {
    if (key.toLowerCase() === lowerName) {
      return value;
    }
  }

  return undefined;
}
