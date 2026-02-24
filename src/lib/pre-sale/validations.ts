import { z } from 'zod';

const basePreSaleGameSchema = z.object({
  title: z.string().min(1, 'Título obrigatório').max(200),
  description: z.string().min(1, 'Descrição obrigatória'),
  thumbnailUrl: z.string().url('URL da thumbnail inválida'),
  videoUrl: z.string().url().optional().nullable().or(z.literal('')),
  specialCategoryId: z.string().min(1).optional().nullable().or(z.literal('')),
  normalCategoryIds: z.array(z.string()).default([]),
  gradeCategoryId: z.string().min(1).optional().nullable().or(z.literal('')),
  // Preço por clube (modo clubes financiam). No modo meta, pode ser 0.
  clubAPrice: z.number(),
  clubBPrice: z.number(),
  maxSimultaneousPerClub: z.number().int().positive('Simultâneos deve ser > 0'),
  featured: z.boolean().optional().default(false),
  homeTeamId: z.string().optional().nullable(),
  awayTeamId: z.string().optional().nullable(),
  // Pré-estreia com meta (quando tiver formulário próprio): 0 quando só clubes financiam
  metaEnabled: z.boolean().optional().default(false),
  metaExtraPerTeam: z.number().int().min(0).optional().default(0),
  premiereAt: z.string().optional().nullable().or(z.literal('')),
});

export const createPreSaleGameSchema = basePreSaleGameSchema.superRefine((data, ctx) => {
  // Pré-estreia Clubes: categoria especial obrigatória
  if (!data.metaEnabled && (!data.specialCategoryId || data.specialCategoryId.trim() === '')) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['specialCategoryId'],
      message: 'Categoria especial obrigatória',
    });
  }
  // Se NÃO for pré-estreia com meta, preços dos clubes precisam ser > 0
  if (!data.metaEnabled) {
    if (data.clubAPrice <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['clubAPrice'],
        message: 'Preço A deve ser > 0',
      });
    }
    if (data.clubBPrice <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['clubBPrice'],
        message: 'Preço B deve ser > 0',
      });
    }
  }
  // Se for pré-estreia com meta, meta extra deve ser >= 1
  if (data.metaEnabled && (data.metaExtraPerTeam ?? 0) < 1) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['metaExtraPerTeam'],
      message: 'Meta extra deve ser >= 1',
    });
  }
});

export const updatePreSaleGameSchema = basePreSaleGameSchema.partial().extend({
  videoUrl: z.string().url().optional().nullable().or(z.literal('')),
});

export const clubCheckoutSchema = z.object({
  responsibleName: z.string().min(2, 'Nome do responsável obrigatório').max(200),
  responsibleEmail: z.string().email('E-mail do responsável inválido'),
  clubName: z.string().min(2, 'Nome do clube obrigatório').max(200),
  clubCode: z.string().min(1, 'Código do clube obrigatório'),
  teamMemberCount: z.number().int().min(1, 'Mínimo 1 membro'),
  termsAccepted: z.literal(true, { errorMap: () => ({ message: 'Aceite dos termos obrigatório' }) }),
});

export const heartbeatSchema = z.object({
  sessionToken: z.string().min(1),
  clubCode: z.string().min(1),
});
