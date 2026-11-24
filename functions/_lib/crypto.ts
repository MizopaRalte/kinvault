// Web Crypto PIN hashing (SHA-256 + salt) & HMAC-SHA256 JWT sign/verify

export interface JwtPayload {
  treeId: string;
  deviceId: string;
  exp: number; // Unix timestamp in seconds
}

export function generateInviteCode(length: number = 8): string {
  // Uppercase alphanumeric excluding ambiguous 0/O/1/I
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars[array[i] % chars.length];
  }
  return code;
}

export function generateHexSalt(bytes: number = 16): string {
  const array = new Uint8Array(bytes);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function hashPin(pin: string, existingSalt?: string): Promise<{ hash: string; salt: string }> {
  const salt = existingSalt || generateHexSalt(16);
  const encoder = new TextEncoder();
  const data = encoder.encode(`${salt}:${pin.trim()}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hash = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  return { hash, salt };
}

export async function verifyPin(pin: string, expectedHash: string, salt: string): Promise<boolean> {
  const { hash } = await hashPin(pin, salt);
  return timingSafeEqual(hash, expectedHash);
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

// Base64URL encoding/decoding helpers
export function base64UrlEncode(strOrBuffer: string | Uint8Array): string {
  let base64: string;
  if (typeof strOrBuffer === 'string') {
    const bytes = new TextEncoder().encode(strOrBuffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    base64 = btoa(binary);
  } else {
    let binary = '';
    for (let i = 0; i < strOrBuffer.byteLength; i++) {
      binary += String.fromCharCode(strOrBuffer[i]);
    }
    base64 = btoa(binary);
  }
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

async function getHmacKey(secret: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  return await crypto.subtle.importKey(
    'raw',
    enc.encode(secret || 'default-kinvault-secret-key-min-32-chars-long'),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

export async function signJwt(payload: JwtPayload, secret: string): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const dataToSign = `${encodedHeader}.${encodedPayload}`;

  const key = await getHmacKey(secret);
  const signatureBuffer = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(dataToSign)
  );

  const encodedSignature = base64UrlEncode(new Uint8Array(signatureBuffer));
  return `${dataToSign}.${encodedSignature}`;
}

export async function verifyJwt(token: string, secret: string): Promise<JwtPayload | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [encodedHeader, encodedPayload, encodedSignature] = parts;
    const dataToSign = `${encodedHeader}.${encodedPayload}`;

    const key = await getHmacKey(secret);

    // Recompute signature to verify
    const expectedSigBuffer = await crypto.subtle.sign(
      'HMAC',
      key,
      new TextEncoder().encode(dataToSign)
    );
    const expectedSig = base64UrlEncode(new Uint8Array(expectedSigBuffer));

    if (!timingSafeEqual(encodedSignature, expectedSig)) {
      return null;
    }

    const payloadJson = base64UrlDecode(encodedPayload);
    const payload = JSON.parse(payloadJson) as JwtPayload;

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return null; // Expired
    }

    return payload;
  } catch {
    return null;
  }
}
