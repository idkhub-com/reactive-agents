#!/usr/bin/env node

/**
 * Generate JWT tokens for PostgREST
 * Usage: node scripts/generate-jwt-tokens.js [secret]
 */

const crypto = require('crypto');

function base64url(source) {
  let encodedSource = Buffer.from(source).toString('base64');
  encodedSource = encodedSource.replace(/=+$/, '');
  encodedSource = encodedSource.replace(/\+/g, '-');
  encodedSource = encodedSource.replace(/\//g, '_');
  return encodedSource;
}

function generateToken(secret, role, expiresIn = '10y') {
  const header = {
    alg: 'HS256',
    typ: 'JWT',
  };

  // Calculate expiration (10 years from now)
  const now = Math.floor(Date.now() / 1000);
  const exp = now + 10 * 365 * 24 * 60 * 60; // 10 years

  const payload = {
    role: role,
    iss: 'reactive-agents',
    iat: now,
    exp: exp,
  };

  const encodedHeader = base64url(JSON.stringify(header));
  const encodedPayload = base64url(JSON.stringify(payload));
  const token = `${encodedHeader}.${encodedPayload}`;

  const signature = crypto
    .createHmac('sha256', secret)
    .update(token)
    .digest('base64');

  const encodedSignature = base64url(Buffer.from(signature, 'base64'));

  return `${token}.${encodedSignature}`;
}

// Get secret from command line or use default
const secret = process.argv[2];

if (!secret) {
  console.error('Error: Secret is required');
  process.exit(1);
}

console.log('JWT Secret:', secret);
console.log('\nGenerated Tokens:\n');
console.log('\nPOSTGREST_SERVICE_ROLE_KEY=');
console.log(generateToken(secret, 'service_role'));
