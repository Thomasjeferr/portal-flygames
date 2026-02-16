import { createHash, randomBytes } from 'crypto';

export const TOKEN_EXPIRY_MINUTES = 60;
export const VERIFICATION_CODE_EXPIRY_MINUTES = 15;

export function generateSecureToken(): string {
  return randomBytes(32).toString('hex');
}

/** Gera código de 6 dígitos para verificação de e-mail. */
export function generateVerificationCode(): string {
  const n = randomBytes(3).readUIntBE(0, 3) % 1_000_000;
  return n.toString().padStart(6, '0');
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function getExpiryDate(): Date {
  const d = new Date();
  d.setMinutes(d.getMinutes() + TOKEN_EXPIRY_MINUTES);
  return d;
}

export function getVerificationCodeExpiryDate(): Date {
  const d = new Date();
  d.setMinutes(d.getMinutes() + VERIFICATION_CODE_EXPIRY_MINUTES);
  return d;
}
