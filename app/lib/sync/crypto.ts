import { gcm } from "@noble/ciphers/aes.js";
import { hmac } from "@noble/hashes/hmac.js";
import { scryptAsync } from "@noble/hashes/scrypt.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex, concatBytes, hexToBytes, randomBytes, utf8ToBytes } from "@noble/hashes/utils.js";

/**
 * End-to-end encryption for sync. Everything is derived from the passphrase on the device:
 *  - `auth` proves to the server which sync space you're using (the server stores only its hash),
 *  - `enc` encrypts every item (AES-256-GCM) so the server only ever sees ciphertext,
 *  - `mac` turns "collection + item id" into an opaque key, so ids and structure stay private too.
 * Pure JS (noble), because browsers disable WebCrypto on plain-HTTP LAN addresses.
 */

export type SyncKeys = { auth: string; enc: Uint8Array; mac: Uint8Array };

// A fixed salt is required: the passphrase alone has to lead every device to the same space.
// scrypt makes each guess expensive, and generated passphrases carry ~125 bits of entropy.
const SALT = "pomidori-sync-v1";
const SCRYPT = { N: 2 ** 16, r: 8, p: 1, dkLen: 96 };

export function normalizePassphrase(raw: string) {
  return raw.normalize("NFKC").trim().replace(/\s+/g, " ");
}

export async function deriveKeys(passphrase: string): Promise<SyncKeys> {
  const out = await scryptAsync(utf8ToBytes(normalizePassphrase(passphrase)), utf8ToBytes(SALT), SCRYPT);
  return { auth: bytesToHex(out.slice(0, 32)), enc: out.slice(32, 64), mac: out.slice(64, 96) };
}

export function keysToJSON(k: SyncKeys) {
  return { auth: k.auth, enc: bytesToHex(k.enc), mac: bytesToHex(k.mac) };
}

export function keysFromJSON(j: { auth: string; enc: string; mac: string }): SyncKeys {
  return { auth: j.auth, enc: hexToBytes(j.enc), mac: hexToBytes(j.mac) };
}

/** Opaque, stable server key for an item. */
export function itemKey(keys: SyncKeys, collection: string, id: string) {
  return bytesToHex(hmac(sha256, keys.mac, utf8ToBytes(`${collection}\u0000${id}`)));
}

function toBase64(bytes: Uint8Array) {
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

function fromBase64(b64: string) {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

export function encryptJSON(keys: SyncKeys, value: unknown) {
  const nonce = randomBytes(12);
  const ct = gcm(keys.enc, nonce).encrypt(utf8ToBytes(JSON.stringify(value)));
  return toBase64(concatBytes(nonce, ct));
}

export function decryptJSON<T>(keys: SyncKeys, payload: string): T {
  const raw = fromBase64(payload);
  const plain = gcm(keys.enc, raw.subarray(0, 12)).decrypt(raw.subarray(12));
  return JSON.parse(new TextDecoder().decode(plain)) as T;
}

// No look-alike characters (0/o, 1/l/i), so a passphrase is easy to read off one screen and type on another.
const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";

/** Five groups of five characters: ~124 bits of randomness. */
export function generatePassphrase() {
  const groups: string[] = [];
  const bytes = randomBytes(25);
  for (let g = 0; g < 5; g++) {
    let s = "";
    // 256 % 31 leaves a tiny bias; re-draw the few bytes that would cause it.
    for (let i = 0; i < 5; i++) {
      let b = bytes[g * 5 + i];
      while (b >= 248) b = randomBytes(1)[0];
      s += ALPHABET[b % ALPHABET.length];
    }
    groups.push(s);
  }
  return groups.join("-");
}

/** Short non-cryptographic hash used to notice when an item changed (cyrb53). */
export function quickHash(str: string) {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}
