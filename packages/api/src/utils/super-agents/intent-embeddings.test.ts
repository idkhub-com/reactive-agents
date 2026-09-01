import type { UserDataStorageConnector } from '@api/types/connector';
import type { AppContext } from '@api/types/hono';
import { embedText, RequestEmbeddingError } from '@api/utils/embeddings';
import {
  clearIntentEmbeddings,
  embedIntent,
  intentEmbeddingCount,
} from '@api/utils/super-agents/intent-embeddings';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@api/utils/embeddings', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@api/utils/embeddings')>()),
  embedText: vi.fn(),
}));

const c = {} as AppContext;
const connector = {} as UserDataStorageConnector;
const MODEL = 'embed-model';

describe('embedIntent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearIntentEmbeddings();
    vi.mocked(embedText).mockImplementation(async (_c, _connector, text) => ({
      embedding: [text.length, 0],
      modelId: MODEL,
    }));
  });

  it('embeds an intent once per model', async () => {
    const first = await embedIntent(c, connector, 'You translate.', MODEL);
    const second = await embedIntent(c, connector, 'You translate.', MODEL);
    vi.mocked(embedText).mockResolvedValueOnce({
      embedding: [1, 1],
      modelId: 'other-model',
    });
    const other = await embedIntent(
      c,
      connector,
      'You translate.',
      'other-model',
    );

    expect(second).toBe(first);
    expect(first).toEqual({
      embedding: [14, 0],
      modelId: MODEL,
      absorbedBy: new Set(),
    });
    expect(other.embedding).toEqual([1, 1]);
    expect(embedText).toHaveBeenCalledTimes(2);
  });

  it('shares one call between concurrent requests', async () => {
    const [a, b] = await Promise.all([
      embedIntent(c, connector, 'You translate.', MODEL),
      embedIntent(c, connector, 'You translate.', MODEL),
    ]);

    expect(a).toBe(b);
    expect(embedText).toHaveBeenCalledTimes(1);
  });

  it('remembers which skills took an intent in', async () => {
    const intent = await embedIntent(c, connector, 'You translate.', MODEL);
    intent.absorbedBy.add('s1');

    const again = await embedIntent(c, connector, 'You translate.', MODEL);

    expect(again.absorbedBy.has('s1')).toBe(true);
  });

  it('forgets a failed embedding so the next request retries', async () => {
    vi.mocked(embedText).mockRejectedValueOnce(
      new RequestEmbeddingError('provider down'),
    );

    await expect(
      embedIntent(c, connector, 'You translate.', MODEL),
    ).rejects.toThrow('provider down');
    expect(intentEmbeddingCount()).toBe(0);

    await expect(
      embedIntent(c, connector, 'You translate.', MODEL),
    ).resolves.toMatchObject({ embedding: [14, 0] });
    expect(embedText).toHaveBeenCalledTimes(2);
  });

  it('refuses an embedding from a model other than the one asked for', async () => {
    vi.mocked(embedText).mockResolvedValueOnce({
      embedding: [1, 0],
      modelId: 'changed-model',
    });

    await expect(
      embedIntent(c, connector, 'You translate.', MODEL),
    ).rejects.toBeInstanceOf(RequestEmbeddingError);
    expect(intentEmbeddingCount()).toBe(0);
  });

  it('drops the least recently used intent past its capacity', async () => {
    for (let i = 0; i < 256; i++) {
      await embedIntent(c, connector, `intent ${i}`, MODEL);
    }
    // Touching the oldest keeps it; the next oldest goes instead.
    await embedIntent(c, connector, 'intent 0', MODEL);
    await embedIntent(c, connector, 'one more', MODEL);

    expect(intentEmbeddingCount()).toBe(256);
    expect(embedText).toHaveBeenCalledTimes(257);
    await embedIntent(c, connector, 'intent 0', MODEL);
    expect(embedText).toHaveBeenCalledTimes(257);
    await embedIntent(c, connector, 'intent 1', MODEL);
    expect(embedText).toHaveBeenCalledTimes(258);
  });
});
