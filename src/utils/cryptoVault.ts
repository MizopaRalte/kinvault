import type { Household, Person, Relationship, Tree } from '../types/family';

export interface BackupPayload {
  version: number;
  exportedAt: number;
  tree: Tree;
  households: Household[];
  persons: Person[];
  relationships: Relationship[];
}

const PBKDF2_ITERATIONS = 100000;
const SALT_BYTE_LENGTH = 16;
const IV_BYTE_LENGTH = 12;

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts tree backup data into a password-protected .fam binary payload
 */
export async function encryptBackup(payload: BackupPayload, password: string): Promise<Blob> {
  const salt = new Uint8Array(SALT_BYTE_LENGTH);
  const iv = new Uint8Array(IV_BYTE_LENGTH);
  crypto.getRandomValues(salt);
  crypto.getRandomValues(iv);

  const key = await deriveKey(password, salt);

  const jsonString = JSON.stringify(payload);
  const encodedData = new TextEncoder().encode(jsonString);

  const ciphertextBuffer = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv as BufferSource,
    },
    key,
    encodedData
  );

  const ciphertext = new Uint8Array(ciphertextBuffer);

  // Combine [salt (16b), iv (12b), ciphertext]
  const combined = new Uint8Array(salt.length + iv.length + ciphertext.length);
  combined.set(salt, 0);
  combined.set(iv, salt.length);
  combined.set(ciphertext, salt.length + iv.length);

  return new Blob([combined], { type: 'application/octet-stream' });
}

/**
 * Decrypts a .fam file using the given password and returns the parsed BackupPayload
 */
export async function decryptBackup(fileOrBuffer: File | ArrayBuffer, password: string): Promise<BackupPayload> {
  let arrayBuffer: ArrayBuffer;
  if (fileOrBuffer instanceof File) {
    arrayBuffer = await fileOrBuffer.arrayBuffer();
  } else {
    arrayBuffer = fileOrBuffer;
  }

  if (arrayBuffer.byteLength < SALT_BYTE_LENGTH + IV_BYTE_LENGTH + 16) {
    throw new Error('Corrupted or invalid .fam backup file (file too short).');
  }

  const uint8 = new Uint8Array(arrayBuffer);
  const salt = uint8.slice(0, SALT_BYTE_LENGTH);
  const iv = uint8.slice(SALT_BYTE_LENGTH, SALT_BYTE_LENGTH + IV_BYTE_LENGTH);
  const ciphertext = uint8.slice(SALT_BYTE_LENGTH + IV_BYTE_LENGTH);

  const key = await deriveKey(password, salt);

  try {
    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv as BufferSource,
      },
      key,
      ciphertext
    );

    const jsonString = new TextDecoder().decode(decryptedBuffer);
    const payload = JSON.parse(jsonString) as BackupPayload;

    if (!payload.tree || !Array.isArray(payload.households) || !Array.isArray(payload.persons)) {
      throw new Error('Invalid KinVault backup structure.');
    }

    return payload;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('operation failed') || msg.includes('Cipher')) {
      throw new Error('Incorrect password or damaged backup file.');
    }
    throw new Error('Failed to decrypt backup: ' + msg);
  }
}

/**
 * Triggers a browser download of the encrypted .fam file
 */
export function downloadBackupFile(blob: Blob, inviteCode: string): void {
  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `kinvault-${inviteCode}-${dateStr}.fam`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
