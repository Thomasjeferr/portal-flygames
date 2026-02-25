export function getPayoutDelayDays(paymentGateway: string | null | undefined): number {
  const gateway = paymentGateway?.toLowerCase() ?? '';
  if (gateway === 'stripe') return 30; // cartão de crédito
  if (gateway === 'woovi') return 0; // Pix: libera na hora
  if (gateway === 'manual') return 0;
  return 0;
}

export function getAvailableAt(createdAt: Date, paymentGateway: string | null | undefined): Date {
  const delayDays = getPayoutDelayDays(paymentGateway);
  if (!delayDays) return createdAt;
  const ms = createdAt.getTime() + delayDays * 24 * 60 * 60 * 1000;
  return new Date(ms);
}

