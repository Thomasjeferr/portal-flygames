import { createHash, randomBytes } from 'crypto';

export const TOKEN_EXPIRY_MINUTES = 60;

export function generateSecureToken(): string {
  return randomBytes(32).toString('hex');
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function getExpiryDate(): Date {
  const d = new Date();
  d.setMinutes(d.getMinutes() + TOKEN_EXPIRY_MINUTES);
  return d;
}
