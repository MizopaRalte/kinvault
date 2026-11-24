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

// -------------------------------------------------------------
// PUK (Personal Unblocking Key) Generation & Verification
// -------------------------------------------------------------

export function generatePukCode(): string {
  // Generates formatted code like KV-9X2M-4P8T using unambiguous characters
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  const array = new Uint8Array(8);
  crypto.getRandomValues(array);
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars[array[i] % chars.length];
  }
  return `KV-${code.slice(0, 4)}-${code.slice(4)}`;
}

export function normalizePuk(puk: string): string {
  return puk.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export async function hashPuk(puk: string, existingSalt?: string): Promise<{ hash: string; salt: string }> {
  const normalized = normalizePuk(puk);
  const salt = existingSalt || generateHexSalt(16);
  const encoder = new TextEncoder();
  const data = encoder.encode(`${salt}:puk:${normalized}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hash = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  return { hash, salt };
}

export async function verifyPuk(puk: string, expectedHash: string, salt: string): Promise<boolean> {
  if (!expectedHash || !salt) return false;
  const { hash } = await hashPuk(puk, salt);
  return timingSafeEqual(hash, expectedHash);
}

// -------------------------------------------------------------
// TOTP (RFC 6238 Authenticator) Helpers
// -------------------------------------------------------------

function base32ToBytes(base32: string): Uint8Array {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const clean = base32.toUpperCase().replace(/=+$/, '').replace(/\s+/g, '');
  let bits = '';
  for (let i = 0; i < clean.length; i++) {
    const val = alphabet.indexOf(clean[i]);
    if (val === -1) continue;
    bits += val.toString(2).padStart(5, '0');
  }
  const bytes = new Uint8Array(Math.floor(bits.length / 8));
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(bits.substring(i * 8, i * 8 + 8), 2);
  }
  return bytes;
}

export async function generateHotp(base32Secret: string, counter: number): Promise<string> {
  const keyBytes = base32ToBytes(base32Secret);
  const key = await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  );

  const counterBuffer = new ArrayBuffer(8);
  const counterView = new DataView(counterBuffer);
  counterView.setUint32(0, Math.floor(counter / 0x100000000), false);
  counterView.setUint32(4, counter & 0xffffffff, false);

  const signature = await crypto.subtle.sign('HMAC', key, counterBuffer);
  const sigBytes = new Uint8Array(signature);
  const offset = sigBytes[sigBytes.length - 1] & 0x0f;
  const binary =
    ((sigBytes[offset] & 0x7f) << 24) |
    ((sigBytes[offset + 1] & 0xff) << 16) |
    ((sigBytes[offset + 2] & 0xff) << 8) |
    (sigBytes[offset + 3] & 0xff);
  const otp = binary % 1000000;
  return otp.toString().padStart(6, '0');
}

export async function verifyTotp(token: string, base32Secret: string, windowSteps: number = 1): Promise<boolean> {
  const cleanToken = token.trim();
  if (!cleanToken || cleanToken.length !== 6) return false;
  const timeStep = 30;
  const currentTime = Math.floor(Date.now() / 1000);
  const currentCounter = Math.floor(currentTime / timeStep);

  for (let step = -windowSteps; step <= windowSteps; step++) {
    const counter = currentCounter + step;
    const generated = await generateHotp(base32Secret, counter);
    if (timingSafeEqual(cleanToken, generated)) {
      return true;
    }
  }
  return false;
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
  if (!secret) {
    throw new Error('JWT_SECRET is required but not configured.');
  }
  const enc = new TextEncoder();
  return await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
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
