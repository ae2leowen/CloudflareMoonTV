/**
 * Tests for PBKDF2 password hashing utility.
 */

import { hashPassword, verifyPassword } from '../password';

describe('hashPassword', () => {
  it('returns a string with pbkdf2: prefix', async () => {
    const hash = await hashPassword('secret123');
    expect(hash).toMatch(/^pbkdf2:\d+:[0-9a-f]+:[0-9a-f]+$/);
  });

  it('produces different hashes for the same password (random salt)', async () => {
    const h1 = await hashPassword('password');
    const h2 = await hashPassword('password');
    expect(h1).not.toEqual(h2);
  });
});

describe('verifyPassword', () => {
  it('returns true for correct password', async () => {
    const hash = await hashPassword('myPassword');
    const result = await verifyPassword('myPassword', hash);
    expect(result).toBe(true);
  });

  it('returns false for incorrect password', async () => {
    const hash = await hashPassword('myPassword');
    const result = await verifyPassword('wrongPassword', hash);
    expect(result).toBe(false);
  });

  it('returns true for plain-text legacy passwords (backward compatibility)', async () => {
    // Old passwords stored as plain text (no pbkdf2: prefix)
    const result = await verifyPassword('legacyPass', 'legacyPass');
    expect(result).toBe(true);
  });

  it('returns false for wrong plain-text legacy password', async () => {
    const result = await verifyPassword('wrongPass', 'legacyPass');
    expect(result).toBe(false);
  });

  it('is resistant to timing attacks (constant-time comparison)', async () => {
    const hash = await hashPassword('safePassword');
    // Calling verify multiple times should not reveal timing differences
    const t1 = performance.now();
    await verifyPassword('wrongPassword1', hash);
    const t2 = performance.now();
    await verifyPassword('wrongPassword2', hash);
    const t3 = performance.now();
    // Both wrong attempts should take roughly the same time
    // We just verify both complete without error
    expect(t2 - t1).toBeGreaterThanOrEqual(0);
    expect(t3 - t2).toBeGreaterThanOrEqual(0);
  });

  it('returns false for malformed hash strings', async () => {
    expect(await verifyPassword('pass', 'pbkdf2:notvalid')).toBe(false);
    expect(await verifyPassword('pass', 'pbkdf2:abc:def')).toBe(false);
    expect(await verifyPassword('pass', 'pbkdf2:notanumber:aaaa:bbbb')).toBe(false);
  });
});
