#!/usr/bin/env node
/**
 * A stub OpenAI-compatible provider for the end-to-end suite.
 *
 * The gateway is the product's hot path -- every proxied request goes through
 * request transformation, streaming, retries and caching -- but none of it can
 * be exercised without something to proxy *to*. Pointing at a real provider
 * would need API keys, cost money, and give non-deterministic answers, so the
 * suite points at this instead: the `ollama` provider is OpenAI-compatible,
 * needs no API key, and honours `custom_host`, which is what makes it usable
 * as the shape to imitate.
 *
 * Beyond answering, it records what the gateway actually sent. That is the
 * only way to assert on the request the gateway builds -- the system prompt it
 * injected, the parameters it resolved, the model it chose -- since none of
 * that is visible in the response.
 *
 * Everything is keyed by model name. The suite runs in parallel and this is one
 * shared process, so tests coin a unique model the way they coin agent names,
 * and never see each other's recorded requests or injected failures.
 *
 *   POST /v1/chat/completions   the provider endpoint the gateway calls
 *   POST /api/embeddings        ditto, for embeddings
 *   GET  /__control/requests?model=NAME   what the gateway sent for that model
 *   POST /__control/fail        {model, times, status} -- inject failures
 *   POST /__control/reset       {model} -- forget everything for that model
 *
 * Configured with E2E_STUB_PORT (default 3103).
 */
import { createServer } from 'node:http';

const port = Number(process.env.E2E_STUB_PORT ?? 3103);

/** model name -> request bodies the gateway sent, oldest first. */
const received = new Map();
/** model name -> queued failures, shifted one per request. */
const failures = new Map();

const recordFor = (model) => {
  if (!received.has(model)) {
    received.set(model, []);
  }
  return received.get(model);
};

const readBody = (request) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    request.on('data', (chunk) => chunks.push(chunk));
    request.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    request.on('error', reject);
  });

const sendJson = (response, status, payload) => {
  const body = JSON.stringify(payload);
  response.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
  });
  response.end(body);
};

/**
 * The assistant reply echoes the last user message, so a test can tell that
 * *its* request produced *this* response rather than matching a fixed string
 * that any request would have produced.
 */
const replyText = (body) => {
  const messages = Array.isArray(body?.messages) ? body.messages : [];
  const lastUser = [...messages].reverse().find((m) => m?.role === 'user');
  const content =
    typeof lastUser?.content === 'string' ? lastUser.content : 'nothing';
  return `echo: ${content}`;
};

const completionPayload = (body, text) => ({
  id: 'chatcmpl-stub',
  object: 'chat.completion',
  // Fixed rather than Date.now(), so a response is byte-identical across
  // requests and a cache hit cannot be confused with a fresh call.
  created: 1_780_000_000,
  model: body?.model ?? 'stub-model',
  choices: [
    {
      index: 0,
      message: { role: 'assistant', content: text },
      finish_reason: 'stop',
    },
  ],
  usage: { prompt_tokens: 11, completion_tokens: 7, total_tokens: 18 },
});

const streamCompletion = (response, body, text) => {
  response.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  const base = {
    id: 'chatcmpl-stub',
    object: 'chat.completion.chunk',
    created: 1_780_000_000,
    model: body?.model ?? 'stub-model',
  };

  // Split into several chunks so the test sees real incremental assembly
  // rather than one chunk that happens to contain the whole answer.
  const write = (chunk) => response.write(`data: ${JSON.stringify(chunk)}\n\n`);

  write({
    ...base,
    choices: [{ index: 0, delta: { role: 'assistant' }, finish_reason: null }],
  });
  for (const word of text.split(' ')) {
    write({
      ...base,
      choices: [
        { index: 0, delta: { content: `${word} ` }, finish_reason: null },
      ],
    });
  }
  write({ ...base, choices: [{ index: 0, delta: {}, finish_reason: 'stop' }] });
  response.write('data: [DONE]\n\n');
  response.end();
};

const server = createServer(async (request, response) => {
  const url = new URL(request.url, `http://127.0.0.1:${port}`);

  if (url.pathname === '/__control/requests') {
    const model = url.searchParams.get('model') ?? '';
    sendJson(response, 200, { requests: received.get(model) ?? [] });
    return;
  }

  if (url.pathname === '/__control/fail') {
    const {
      model,
      times = 1,
      status = 503,
    } = JSON.parse((await readBody(request)) || '{}');
    failures.set(
      model,
      Array.from({ length: times }, () => status),
    );
    sendJson(response, 200, { ok: true });
    return;
  }

  if (url.pathname === '/__control/reset') {
    const { model } = JSON.parse((await readBody(request)) || '{}');
    received.delete(model);
    failures.delete(model);
    sendJson(response, 200, { ok: true });
    return;
  }

  const raw = await readBody(request);
  let body;
  try {
    body = raw ? JSON.parse(raw) : {};
  } catch {
    sendJson(response, 400, { error: { message: 'stub: invalid JSON' } });
    return;
  }

  const model = body?.model ?? '';
  recordFor(model).push(body);

  const queued = failures.get(model);
  if (queued?.length) {
    const status = queued.shift();
    // Shaped like a provider error so the retry handler treats it as one.
    sendJson(response, status, {
      error: { message: `stub: injected failure (${status})`, type: 'stub' },
    });
    return;
  }

  if (url.pathname === '/api/embeddings') {
    sendJson(response, 200, {
      embedding: Array.from({ length: 8 }, () => 0.1),
    });
    return;
  }

  if (url.pathname === '/v1/chat/completions') {
    const text = replyText(body);
    if (body?.stream) {
      streamCompletion(response, body, text);
    } else {
      sendJson(response, 200, completionPayload(body, text));
    }
    return;
  }

  sendJson(response, 404, {
    error: { message: `stub: no handler for ${url.pathname}` },
  });
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Stub AI provider listening on http://127.0.0.1:${port}`);
});
