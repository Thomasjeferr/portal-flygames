import { z } from 'zod';

export const sponsorOrderCheckoutSchema = z.object({
  sponsorPlanId: z.string().min(1, 'Plano é obrigatório'),
  companyName: z.string().min(1, 'Nome da empresa é obrigatório').max(200),
  email: z.string().email('E-mail inválido'),
  websiteUrl: z.union([z.string().url(), z.literal('')]).optional().default(''),
  whatsapp: z.string().optional(),
  logoUrl: z.string().min(1, 'Logo é obrigatória'),
  teamId: z.string().nullable().optional(),
});

export type SponsorOrderCheckoutInput = z.infer<typeof sponsorOrderCheckoutSchema>;
