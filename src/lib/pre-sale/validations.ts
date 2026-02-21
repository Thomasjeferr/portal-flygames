import { z } from 'zod';

export const createPreSaleGameSchema = z.object({
  title: z.string().min(1, 'Título obrigatório').max(200),
  description: z.string().min(1, 'Descrição obrigatória'),
  thumbnailUrl: z.string().url('URL da thumbnail inválida'),
  videoUrl: z.string().url().optional().nullable().or(z.literal('')),
  specialCategoryId: z.string().min(1, 'Categoria especial obrigatória'),
  normalCategoryIds: z.array(z.string()).default([]),
  gradeCategoryId: z.string().min(1).optional().nullable().or(z.literal('')),
  clubAPrice: z.number().positive('Preço A deve ser > 0'),
  clubBPrice: z.number().positive('Preço B deve ser > 0'),
  maxSimultaneousPerClub: z.number().int().positive('Simultâneos deve ser > 0'),
  featured: z.boolean().optional().default(false),
  teamId: z.string().optional().nullable(),
});

export const updatePreSaleGameSchema = createPreSaleGameSchema.partial().extend({
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
