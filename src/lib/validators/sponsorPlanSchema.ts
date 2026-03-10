import { z } from 'zod';

export const BILLING_PERIODS = ['monthly', 'quarterly', 'yearly'] as const;

export const SPONSOR_PLAN_TYPES = ['sponsor_company', 'sponsor_fan'] as const;
export type SponsorPlanType = (typeof SPONSOR_PLAN_TYPES)[number];

export const CONTRACT_STATUSES = ['active', 'loyalty_active', 'cancellation_requested', 'cancelled', 'expired'] as const;
export type ContractStatus = (typeof CONTRACT_STATUSES)[number];

const featuresFlagsSchema = z.record(z.boolean()).default({});

const sponsorPlanBaseSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  price: z.number().min(0, 'Preço deve ser >= 0'),
  billingPeriod: z.enum(BILLING_PERIODS).default('monthly'),
  benefits: z.array(z.string()).default([]),
  featuresFlags: featuresFlagsSchema,
  teamPayoutPercent: z.number().int().min(0).max(100).default(0),
  partnerCommissionPercent: z.number().int().min(0).max(100).default(0),
  grantFullAccess: z.boolean().default(false),
  maxScreens: z.number().int().min(1).max(20).nullable().optional(),
  sortOrder: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
  type: z.enum(SPONSOR_PLAN_TYPES).default('sponsor_company'),
  hasLoyalty: z.boolean().default(false),
  loyaltyMonths: z.number().int().min(0).max(120).default(0),
  loyaltyNoticeText: z.string().max(2000).nullable().optional(),
  requireContractAcceptance: z.boolean().default(false),
});

export const sponsorPlanCreateSchema = sponsorPlanBaseSchema.refine(
  (data) => {
    if (data.type === 'sponsor_fan') return !data.hasLoyalty || data.loyaltyMonths === 0;
    return true;
  },
  { message: 'Plano torcedor não deve ter fidelidade.', path: ['loyaltyMonths'] }
);

export const sponsorPlanUpdateSchema = sponsorPlanBaseSchema.partial();

export type SponsorPlanCreateInput = z.infer<typeof sponsorPlanCreateSchema>;
export type SponsorPlanUpdateInput = z.infer<typeof sponsorPlanUpdateSchema>;
