export async function generateObjectHash(
  requestBody: Record<string, unknown>,
): Promise<string> {
  const requestBodyString = JSON.stringify(requestBody);
  const encodedHash = new TextEncoder().encode(requestBodyString);

  const cacheDigest = await crypto.subtle.digest(
    {
      name: 'SHA-256',
    },
    encodedHash,
  );

  return Array.from(new Uint8Array(cacheDigest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
