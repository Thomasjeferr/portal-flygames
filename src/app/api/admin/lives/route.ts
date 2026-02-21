import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { createLiveInput } from '@/lib/cloudflare-live';
import { z } from 'zod';

const createSchema = z.object({
  title: z.string().min(1, 'Título obrigatório'),
  description: z.string().optional(),
  thumbnailUrl: z.string().optional(),
  status: z.enum(['SCHEDULED', 'LIVE', 'ENDED']).optional(),
  startAt: z
    .string()
    .optional()
    .nullable()
    .refine((val) => !val || !Number.isNaN(Date.parse(val)), { message: 'Data/hora de início inválida' }),
  endAt: z
    .string()
    .optional()
    .nullable()
    .refine((val) => !val || !Number.isNaN(Date.parse(val)), { message: 'Data/hora de fim inválida' }),
  requireSubscription: z.boolean().optional(),
  allowOneTimePurchase: z.boolean().optional(),
  allowChat: z.boolean().optional(),
  createLiveInput: z.boolean().optional(),
  /** ID da entrada ao vivo já criada no dashboard do Cloudflare (cole o "ID de entrada ao vivo"). */
  cloudflareLiveInputId: z.string().optional(),
  teamId: z.string().optional().nullable(),
});

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
  }
  const lives = await prisma.live.findMany({
    orderBy: { createdAt: 'desc' },
    include: { team: { select: { id: true, name: true, slug: true } } },
  });
  return NextResponse.json(lives);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const parsed = createSchema.safeParse({
      ...body,
      requireSubscription: body.requireSubscription ?? true,
      allowOneTimePurchase: body.allowOneTimePurchase ?? false,
      allowChat: body.allowChat ?? false,
      createLiveInput: body.createLiveInput ?? false,
    });
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? 'Dados inválidos' },
        { status: 400 }
      );
    }

    const data = parsed.data;
    let cloudflareLiveInputId: string | null = null;
    let ingestUrl: string | null = null;
    let streamKey: string | null = null;

    const pastedId = data.cloudflareLiveInputId?.trim();
    if (pastedId) {
      cloudflareLiveInputId = pastedId;
    } else if (data.createLiveInput) {
      const result = await createLiveInput({ name: data.title, recordingMode: 'automatic' });
      cloudflareLiveInputId = result.uid;
      ingestUrl = result.ingestUrl;
      streamKey = result.streamKey;
    }

    const live = await prisma.live.create({
      data: {
        title: data.title,
        description: data.description ?? null,
        thumbnailUrl: data.thumbnailUrl ?? null,
        cloudflareLiveInputId,
        status: data.status ?? 'SCHEDULED',
        startAt: data.startAt ? new Date(data.startAt) : null,
        endAt: data.endAt ? new Date(data.endAt) : null,
        requireSubscription: data.requireSubscription ?? true,
        allowOneTimePurchase: data.allowOneTimePurchase ?? false,
        allowChat: data.allowChat ?? false,
        teamId: data.teamId?.trim() || null,
      },
    });

    return NextResponse.json({
      ...live,
      ingestUrl: ingestUrl ?? undefined,
      streamKey: streamKey ?? undefined,
    });
  } catch (e) {
    console.error('POST /api/admin/lives', e);
    const message = e instanceof Error ? e.message : 'Erro ao criar live';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
