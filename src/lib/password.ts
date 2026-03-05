/**
 * Password hashing utilities using Web Crypto API (PBKDF2).
 * Compatible with both Edge and Node.js runtimes.
 * No external dependencies required.
 */

const HASH_PREFIX = 'pbkdf2:';
const ITERATIONS = 100000;
const KEY_LENGTH = 32; // bytes (256 bits)

/**
 * Hash a password using PBKDF2-SHA256.
 * Returns a string: pbkdf2:{iterations}:{saltHex}:{hashHex}
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const encoder = new TextEncoder();

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );

  const derivedBits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    KEY_LENGTH * 8
  );

  const toHex = (buf: Uint8Array) =>
    Array.from(buf)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

  return `${HASH_PREFIX}${ITERATIONS}:${toHex(salt)}:${toHex(new Uint8Array(derivedBits))}`;
}

/**
 * Verify a password against a stored hash.
 * Supports backward compatibility: if stored string has no prefix, plain-text comparison is used.
 */
export async function verifyPassword(
  password: string,
  stored: string
): Promise<boolean> {
  // Backward compatibility: plain-text password (legacy, no prefix)
  if (!stored.startsWith(HASH_PREFIX)) {
    return stored === password;
  }

  const parts = stored.split(':');
  // Format: pbkdf2:{iterations}:{saltHex}:{hashHex} → 4 parts
  if (parts.length !== 4) return false;

  const [, iterationsStr, saltHex, expectedHashHex] = parts;
  const iterations = parseInt(iterationsStr, 10);
  if (isNaN(iterations) || iterations <= 0) return false;

  const saltBytes = saltHex.match(/../g);
  if (!saltBytes) return false;
  const salt = new Uint8Array(saltBytes.map((h) => parseInt(h, 16)));

  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );

  const derivedBits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    keyMaterial,
    KEY_LENGTH * 8
  );

  const actualHashHex = Array.from(new Uint8Array(derivedBits))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  // Constant-time comparison to prevent timing attacks
  if (actualHashHex.length !== expectedHashHex.length) return false;
  let diff = 0;
  for (let i = 0; i < actualHashHex.length; i++) {
    diff |= actualHashHex.charCodeAt(i) ^ expectedHashHex.charCodeAt(i);
  }
  return diff === 0;
}
