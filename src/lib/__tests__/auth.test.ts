/**
 * Tests for auth cookie parsing utilities.
 */

// Mock Next.js Request for server-side tests
import { getAuthInfoFromCookie } from '../auth';

// Create a minimal mock of NextRequest
function makeMockRequest(cookieValue?: string) {
  return {
    cookies: {
      get: (name: string) => {
        if (name === 'auth' && cookieValue !== undefined) {
          return { value: cookieValue };
        }
        return undefined;
      },
    },
  } as any;
}

describe('getAuthInfoFromCookie', () => {
  it('returns null when no auth cookie is present', () => {
    const req = makeMockRequest(undefined);
    expect(getAuthInfoFromCookie(req)).toBeNull();
  });

  it('returns null for malformed cookie value', () => {
    const req = makeMockRequest('not-valid-json');
    expect(getAuthInfoFromCookie(req)).toBeNull();
  });

  it('parses a valid auth cookie with username and role', () => {
    const authData = {
      username: 'testuser',
      role: 'user',
      signature: 'abc123',
      timestamp: 1700000000000,
    };
    const cookieValue = encodeURIComponent(JSON.stringify(authData));
    const req = makeMockRequest(cookieValue);

    const result = getAuthInfoFromCookie(req);
    expect(result).not.toBeNull();
    expect(result?.username).toBe('testuser');
    expect(result?.role).toBe('user');
    expect(result?.signature).toBe('abc123');
    expect(result?.timestamp).toBe(1700000000000);
  });

  it('parses a localstorage-mode cookie (no username, has signature)', () => {
    const authData = {
      role: 'user',
      signature: 'hmac-sig-here',
      timestamp: 1700000000000,
    };
    const cookieValue = encodeURIComponent(JSON.stringify(authData));
    const req = makeMockRequest(cookieValue);

    const result = getAuthInfoFromCookie(req);
    expect(result).not.toBeNull();
    expect(result?.username).toBeUndefined();
    expect(result?.signature).toBe('hmac-sig-here');
  });

  it('does NOT include password field in returned auth info', () => {
    // Ensure legacy password-in-cookie values are not exposed
    const authData = {
      role: 'user',
      password: 'should-not-be-exposed',
      timestamp: 1700000000000,
    };
    const cookieValue = encodeURIComponent(JSON.stringify(authData));
    const req = makeMockRequest(cookieValue);

    const result = getAuthInfoFromCookie(req);
    // The return type no longer includes password
    expect(result).not.toBeNull();
    expect((result as any)?.password).toBeUndefined();
  });
});
