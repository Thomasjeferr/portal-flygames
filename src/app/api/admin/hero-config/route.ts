import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const updateSchema = z.object({
  heroType: z.enum(['none', 'image', 'youtube', 'pandavideo']),
  heroMediaUrl: z.union([z.string().url(), z.literal(''), z.null()]).optional(),
  overlayColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Cor em hex (ex: #000000)').optional(),
  overlayOpacity: z.number().min(0).max(1).optional(),
  videoStartSeconds: z.number().int().min(0).nullable().optional(),
  videoEndSeconds: z.number().int().min(0).nullable().optional(),
  videoLoop: z.boolean().optional(),
});

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
  }
  const row = await prisma.heroConfig.findFirst({ orderBy: { updatedAt: 'desc' } });
  if (!row) {
    return NextResponse.json({
      heroType: 'none',
      heroMediaUrl: null,
      overlayColor: '#000000',
      overlayOpacity: 0.5,
      videoStartSeconds: null,
      videoEndSeconds: null,
      videoLoop: true,
    });
  }
  return NextResponse.json({
    heroType: row.heroType,
    heroMediaUrl: row.heroMediaUrl,
    overlayColor: row.overlayColor,
    overlayOpacity: row.overlayOpacity,
    videoStartSeconds: row.videoStartSeconds,
    videoEndSeconds: row.videoEndSeconds,
    videoLoop: row.videoLoop,
  });
}

export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? 'Dados inválidos' },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const mediaUrl = data.heroMediaUrl && data.heroMediaUrl.trim() ? data.heroMediaUrl.trim() : null;

    const existing = await prisma.heroConfig.findFirst({ orderBy: { updatedAt: 'desc' } });

    const payload = {
      heroType: data.heroType,
      heroMediaUrl: mediaUrl,
      overlayColor: data.overlayColor ?? existing?.overlayColor ?? '#000000',
      overlayOpacity: data.overlayOpacity ?? existing?.overlayOpacity ?? 0.5,
      videoStartSeconds: data.videoStartSeconds !== undefined ? data.videoStartSeconds : existing?.videoStartSeconds ?? null,
      videoEndSeconds: data.videoEndSeconds !== undefined ? data.videoEndSeconds : existing?.videoEndSeconds ?? null,
      videoLoop: data.videoLoop ?? existing?.videoLoop ?? true,
    };

    let config;
    if (existing) {
      config = await prisma.heroConfig.update({
        where: { id: existing.id },
        data: payload,
      });
    } else {
      config = await prisma.heroConfig.create({
        data: payload,
      });
    }

    return NextResponse.json({
      heroType: config.heroType,
      heroMediaUrl: config.heroMediaUrl,
      overlayColor: config.overlayColor,
      overlayOpacity: config.overlayOpacity,
      videoStartSeconds: config.videoStartSeconds,
      videoEndSeconds: config.videoEndSeconds,
      videoLoop: config.videoLoop,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Erro ao salvar banner' }, { status: 500 });
  }
}
