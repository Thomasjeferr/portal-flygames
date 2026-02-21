import { z } from 'zod';

export const BannerType = z.enum(['MANUAL', 'FEATURED_GAME', 'FEATURED_PRE_SALE', 'FEATURED_LIVE']);
export const MediaType = z.enum(['IMAGE', 'YOUTUBE_VIDEO', 'MP4_VIDEO', 'NONE']);

const baseSchema = {
  isActive: z.boolean().optional().default(true),
  priority: z.number().int().optional().default(0),
  type: BannerType,
  badgeText: z.string().max(100).nullable().optional(),
  headline: z.string().max(300).nullable().optional(),
  subheadline: z.string().max(500).nullable().optional(),
  useDefaultCta: z.boolean().optional().default(true),
  primaryCtaText: z.string().max(80).nullable().optional(),
  primaryCtaUrl: z.union([z.string().url(), z.literal('')]).nullable().optional(),
  secondaryCtaText: z.string().max(80).nullable().optional(),
  secondaryCtaUrl: z.union([z.string().url(), z.literal('')]).nullable().optional(),
  mediaType: MediaType.optional().default('NONE'),
  mediaUrl: z.union([
    z.string().url(),
    z.string().regex(/^\/[a-zA-Z0-9/_.-]+$/),
    z.literal(''),
  ]).nullable().optional(),
  videoStartSeconds: z.number().int().min(0).optional().default(0),
  videoEndSeconds: z.number().int().min(0).nullable().optional(),
  loop: z.boolean().optional().default(true),
  mute: z.boolean().optional().default(true),
  mobileMediaType: z.enum(['NONE', 'IMAGE', 'YOUTUBE_VIDEO', 'MP4_VIDEO']).optional().default('NONE'),
  mobileMediaUrl: z
    .union([
      z.string().url(),
      z.string().regex(/^\/[a-zA-Z0-9/_.-]+$/),
      z.literal(''),
    ])
    .nullable()
    .optional(),
  overlayColorHex: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().default('#000000'),
  overlayOpacity: z.number().int().min(0).max(100).optional().default(75),
  heightPreset: z.enum(['sm', 'md', 'lg', 'xl', 'full']).optional().default('md'),
  secondaryMediaType: z.enum(['NONE', 'IMAGE', 'YOUTUBE_VIDEO', 'MP4_VIDEO']).optional().default('NONE'),
  secondaryMediaUrl: z.union([
    z.string().url(),
    z.string().regex(/^\/[a-zA-Z0-9/_.-]+$/),
    z.literal(''),
  ]).nullable().optional(),
  gameId: z.string().cuid().nullable().optional(),
  preSaleId: z.string().cuid().nullable().optional(),
  liveId: z.string().cuid().nullable().optional(),
  showOnlyWhenReady: z.boolean().optional().default(true),
  startAt: z.union([z.string().datetime(), z.literal('')]).nullable().optional(),
  endAt: z.union([z.string().datetime(), z.literal('')]).nullable().optional(),
};

export const createHomeBannerSchema = z
  .object(baseSchema)
  .refine(
    (d) => {
      if (d.type === 'MANUAL' && d.mediaType !== 'NONE') {
        return d.mediaUrl && String(d.mediaUrl).trim().length > 0;
      }
      return true;
    },
    { message: 'media_url obrigatorio quando media_type nao e NONE', path: ['mediaUrl'] }
  )
  .refine(
    (d) => {
      if (d.type === 'FEATURED_GAME') return d.gameId && String(d.gameId).trim().length > 0;
      return true;
    },
    { message: 'game_id obrigatorio para FEATURED_GAME', path: ['gameId'] }
  )
  .refine(
    (d) => {
      if (d.type === 'FEATURED_PRE_SALE') return d.preSaleId && String(d.preSaleId).trim().length > 0;
      return true;
    },
    { message: 'pre_sale_id obrigatorio para FEATURED_PRE_SALE', path: ['preSaleId'] }
  )
  .refine(
    (d) => {
      if (d.type === 'FEATURED_LIVE') return d.liveId && String(d.liveId).trim().length > 0;
      return true;
    },
    { message: 'live_id obrigatorio para FEATURED_LIVE', path: ['liveId'] }
  )
  .refine(
    (d) => {
      if (d.startAt && d.endAt && d.startAt !== '' && d.endAt !== '') {
        return new Date(d.startAt) < new Date(d.endAt);
      }
      return true;
    },
    { message: 'start_at deve ser anterior a end_at', path: ['startAt'] }
  );

export const updateHomeBannerSchema = z
  .object(baseSchema)
  .partial()
  .superRefine((d, ctx) => {
    if (d.type !== undefined && d.type === 'FEATURED_GAME' && (d.gameId ?? '').toString().trim().length === 0) {
      ctx.addIssue({ code: 'custom', message: 'game_id obrigatorio para FEATURED_GAME', path: ['gameId'] });
    }
    if (d.type !== undefined && d.type === 'FEATURED_PRE_SALE' && (d.preSaleId ?? '').toString().trim().length === 0) {
      ctx.addIssue({ code: 'custom', message: 'pre_sale_id obrigatorio para FEATURED_PRE_SALE', path: ['preSaleId'] });
    }
    if (d.type !== undefined && d.type === 'FEATURED_LIVE' && (d.liveId ?? '').toString().trim().length === 0) {
      ctx.addIssue({ code: 'custom', message: 'live_id obrigatorio para FEATURED_LIVE', path: ['liveId'] });
    }
  });
