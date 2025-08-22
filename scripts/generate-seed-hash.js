// Script to generate proper hash for seed data using the same technique as cache middleware

async function produceHash(requestBodyString) {
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

// Get the string to hash from command line arguments
const stringToHash = process.argv[2];

if (!stringToHash) {
  console.error('Usage: node generate-seed-hash.js "<string-to-hash>"');
  console.error(
    'Example: node generate-seed-hash.js \'{"user": "user-123-abc", "model": "gpt-4.1"}\'',
  );
  process.exit(1);
}

// Generate the hash
produceHash(stringToHash)
  .then((hash) => {
    console.log('Generated hash:', hash);
  })
  .catch(console.error);
