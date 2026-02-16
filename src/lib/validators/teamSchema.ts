import { z } from 'zod';

export const teamCreateSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  shortName: z.string().max(20).optional().default(''),
  city: z.string().optional().default(''),
  state: z.string().max(2).optional().default(''),
  foundedYear: z
    .number()
    .int()
    .min(1800, 'Ano deve ser >= 1800')
    .max(new Date().getFullYear(), 'Ano deve ser <= ano atual')
    .optional()
    .nullable(),
  // Aceita URL vazia, http(s) (qualquer capitalização) ou caminho relativo
  crestUrl: z
    .string()
    .max(2000)
    .optional()
    .default('')
    .refine(
      (v) => {
        if (!v || v === '') return true;
        const lower = v.toLowerCase();
        return lower.startsWith('http://') || lower.startsWith('https://') || v.startsWith('/');
      },
      'URL do escudo inválida'
    ),
  instagram: z.string().optional().default(''),
  whatsapp: z.string().optional().default(''),
  description: z.string().optional().default(''),
  responsibleName: z.string().max(200).optional().default(''),
  responsibleEmail: z.union([z.string().email('E-mail inválido'), z.literal('')]).optional().default(''),
  isActive: z.boolean().default(true),
  payoutPixKey: z.string().optional().nullable(),
  payoutName: z.string().optional().nullable(),
  payoutDocument: z.string().optional().nullable(),
});

export const teamUpdateSchema = teamCreateSchema.partial();

export type TeamCreateInput = z.infer<typeof teamCreateSchema>;
export type TeamUpdateInput = z.infer<typeof teamUpdateSchema>;
