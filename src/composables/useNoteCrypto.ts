const encoder = new TextEncoder();
const decoder = new TextDecoder();

const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
};

const base64ToArrayBuffer = (base64: string) => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes.buffer;
};

export type EncryptedNotePayload = {
  ciphertext: string;
  iv: string;
  version: number;
};

export function useNoteCrypto() {
  const NOTE_KEY_ALGORITHM = "AES-GCM";
  const NOTE_KEY_LENGTH = 256;
  const NOTE_VERSION = 1;

  const generateNoteKey = async () =>
    crypto.subtle.generateKey(
      { name: NOTE_KEY_ALGORITHM, length: NOTE_KEY_LENGTH },
      true,
      ["encrypt", "decrypt"],
    );

  const exportNoteKey = async (key: CryptoKey) =>
    arrayBufferToBase64(await crypto.subtle.exportKey("raw", key));

  const importNoteKey = async (rawBase64Key: string) =>
    crypto.subtle.importKey(
      "raw",
      base64ToArrayBuffer(rawBase64Key),
      { name: NOTE_KEY_ALGORITHM },
      false,
      ["encrypt", "decrypt"],
    );

  const encryptNote = async (
    note: string,
    key: CryptoKey,
  ): Promise<EncryptedNotePayload> => {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = await crypto.subtle.encrypt(
      { name: NOTE_KEY_ALGORITHM, iv },
      key,
      encoder.encode(note),
    );

    return {
      ciphertext: arrayBufferToBase64(ciphertext),
      iv: arrayBufferToBase64(iv.buffer),
      version: NOTE_VERSION,
    };
  };

  const decryptNote = async (
    ciphertext: string,
    iv: string,
    key: CryptoKey,
  ) => {
    const plaintext = await crypto.subtle.decrypt(
      { name: NOTE_KEY_ALGORITHM, iv: new Uint8Array(base64ToArrayBuffer(iv)) },
      key,
      base64ToArrayBuffer(ciphertext),
    );

    return decoder.decode(plaintext);
  };

  return {
    NOTE_VERSION,
    generateNoteKey,
    exportNoteKey,
    importNoteKey,
    encryptNote,
    decryptNote,
  };
}
