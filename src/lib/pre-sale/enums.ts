export const GameStatus = {
  PRE_SALE: 'PRE_SALE',
  FUNDED: 'FUNDED',
  PUBLISHED: 'PUBLISHED',
} as const;
export type GameStatus = (typeof GameStatus)[keyof typeof GameStatus];

export const PaymentStatus = {
  PENDING: 'PENDING',
  PAID: 'PAID',
  FAILED: 'FAILED',
} as const;
export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];

export const Provider = {
  WOOVI: 'WOOVI',
  STRIPE: 'STRIPE',
} as const;
export type Provider = (typeof Provider)[keyof typeof Provider];

export const CategoryType = {
  NORMAL: 'NORMAL',
  SPECIAL: 'SPECIAL',
} as const;
export type CategoryType = (typeof CategoryType)[keyof typeof CategoryType];

export const CONTRACT_VERSION = 'v1.0';
export const SESSION_TTL_SECONDS = 90;
