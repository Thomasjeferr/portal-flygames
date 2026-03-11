import { z } from 'zod';
import { isValidCnpj, normalizeCnpj } from './cnpj';

export const sponsorOrderCheckoutSchema = z.object({
  sponsorPlanId: z.string().min(1, 'Plano é obrigatório'),
  companyName: z.string().min(1, 'Nome da empresa é obrigatório').max(200),
  cnpj: z.string().optional(),
  email: z.string().email('E-mail inválido'),
  websiteUrl: z.union([z.string().url(), z.literal('')]).optional().default(''),
  whatsapp: z.string().optional(),
  instagram: z.string().optional(),
  logoUrl: z.string().min(1, 'Logo é obrigatória'),
  teamId: z.string().nullable().optional(),
  contractAccepted: z.boolean().optional(),
  utmSource: z.string().optional(),
  utmMedium: z.string().optional(),
  utmCampaign: z.string().optional(),
  utmContent: z.string().optional(),
  utmTerm: z.string().optional(),
  refCode: z.string().optional(),
});

export type SponsorOrderCheckoutInput = z.infer<typeof sponsorOrderCheckoutSchema>;

/** Valida CNPJ para patrocínio empresarial. Retorna mensagem de erro ou null se válido. */
export function validateCnpjForCompany(cnpj: string | null | undefined): string | null {
  if (!cnpj || typeof cnpj !== 'string') return 'CNPJ é obrigatório para patrocínio empresarial.';
  const digits = normalizeCnpj(cnpj);
  if (digits.length !== 14) return 'CNPJ deve ter 14 dígitos.';
  if (!isValidCnpj(digits)) return 'CNPJ inválido. Verifique os dígitos.';
  return null;
}
