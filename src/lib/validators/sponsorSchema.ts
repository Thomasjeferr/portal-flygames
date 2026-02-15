import { z } from 'zod';

export const SPONSOR_TIERS = ['MASTER', 'OFICIAL', 'APOIO'] as const;

const baseSponsorSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  website_url: z.union([z.string().url(), z.literal('')]).optional().default(''),
  logo_url: z.string().min(1, 'Logo é obrigatório'),
  tier: z.enum(SPONSOR_TIERS).default('APOIO'),
  priority: z.number().int().min(0, 'Prioridade deve ser >= 0').default(0),
  is_active: z.boolean().default(true),
  start_at: z.union([z.string(), z.null()]).optional().nullable(),
  end_at: z.union([z.string(), z.null()]).optional().nullable(),
});

export const sponsorCreateSchema = baseSponsorSchema.refine(
  (data) => {
    const start = data.start_at && data.start_at !== '' ? new Date(data.start_at) : null;
    const end = data.end_at && data.end_at !== '' ? new Date(data.end_at) : null;
    if (start && end) return start < end;
    return true;
  },
  { message: 'Data de início deve ser anterior à data de fim', path: ['end_at'] }
);

export const sponsorUpdateSchema = baseSponsorSchema.partial().refine(
  (data) => {
    const start = data.start_at && data.start_at !== '' ? new Date(data.start_at) : null;
    const end = data.end_at && data.end_at !== '' ? new Date(data.end_at) : null;
    if (start && end) return start < end;
    return true;
  },
  { message: 'Data de início deve ser anterior à data de fim', path: ['end_at'] }
);

export type SponsorCreateInput = z.infer<typeof sponsorCreateSchema>;
export type SponsorUpdateInput = z.infer<typeof sponsorUpdateSchema>;
