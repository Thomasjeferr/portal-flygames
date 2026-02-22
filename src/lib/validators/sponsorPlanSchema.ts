import { z } from 'zod';

export const BILLING_PERIODS = ['monthly', 'quarterly', 'yearly'] as const;

const featuresFlagsSchema = z.record(z.boolean()).default({});

export const sponsorPlanCreateSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  price: z.number().min(0, 'Preço deve ser >= 0'),
  billingPeriod: z.enum(BILLING_PERIODS).default('monthly'),
  benefits: z.array(z.string()).default([]),
  featuresFlags: featuresFlagsSchema,
  teamPayoutPercent: z.number().int().min(0).max(100).default(0),
  partnerCommissionPercent: z.number().int().min(0).max(100).default(0),
  sortOrder: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

export const sponsorPlanUpdateSchema = sponsorPlanCreateSchema.partial();

export type SponsorPlanCreateInput = z.infer<typeof sponsorPlanCreateSchema>;
export type SponsorPlanUpdateInput = z.infer<typeof sponsorPlanUpdateSchema>;
