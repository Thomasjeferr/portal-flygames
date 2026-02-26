import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { uniqueSlug } from '@/lib/slug';
import { teamCreateSchema } from '@/lib/validators/teamSchema';

function toBody(data: Record<string, unknown>) {
  return {
    name: data.name,
    shortName: data.shortName ?? '',
    city: data.city ?? '',
    state: data.state ?? '',
    foundedYear: data.foundedYear != null ? Number(data.foundedYear) : null,
    crestUrl: data.crestUrl ?? '',
    instagram: data.instagram ?? '',
    whatsapp: data.whatsapp ?? '',
    description: data.description ?? '',
    isActive: data.isActive ?? true,
  };
}

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'admin')
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q')?.trim();
  const activeOnly = searchParams.get('active') === 'true';
  const inactiveOnly = searchParams.get('active') === 'false';
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10) || 1);
  const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(searchParams.get('limit') ?? String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT));
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {};
  if (activeOnly) where.isActive = true;
  if (inactiveOnly) where.isActive = false;
  if (q) {
    where.OR = [
      { name: { contains: q, mode: 'insensitive' } },
      { city: { contains: q, mode: 'insensitive' } },
      { state: { contains: q, mode: 'insensitive' } },
      { shortName: { contains: q, mode: 'insensitive' } },
    ];
  }

  const [total, teams] = await Promise.all([
    prisma.team.count({ where }),
    prisma.team.findMany({
      where,
      orderBy: [{ approvalStatus: 'asc' }, { isActive: 'desc' }, { name: 'asc' }],
      skip,
      take: limit,
    }),
  ]);

  return NextResponse.json({
    teams,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
  });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'admin')
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });

  try {
    const raw = await request.json();
    const body = toBody(raw);
    const parsed = teamCreateSchema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json({ error: parsed.error.errors[0]?.message ?? 'Dados inválidos' }, { status: 400 });

    const d = parsed.data;
    const existingSlugs = (await prisma.team.findMany({ select: { slug: true } })).map((t) => t.slug);
    const slug = uniqueSlug(d.name, existingSlugs);

    const team = await prisma.team.create({
      data: {
        name: d.name,
        shortName: d.shortName?.trim() || null,
        slug,
        city: d.city?.trim() || null,
        state: d.state?.trim()?.toUpperCase() || null,
        foundedYear: d.foundedYear ?? null,
        crestUrl: d.crestUrl?.trim() || null,
        instagram: d.instagram?.trim() || null,
        whatsapp: d.whatsapp?.replace(/\D/g, '') || null,
        description: d.description?.trim() || null,
        isActive: d.isActive,
      },
    });
    revalidatePath('/');
    return NextResponse.json(team);
  } catch (e) {
    console.error('POST /api/admin/teams', e);
    return NextResponse.json({ error: 'Erro ao criar time' }, { status: 500 });
  }
}
