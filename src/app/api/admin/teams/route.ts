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

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'admin')
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q')?.trim();
  const activeOnly = searchParams.get('active') === 'true';
  const inactiveOnly = searchParams.get('active') === 'false';

  const where: Record<string, unknown> = {};
  if (activeOnly) where.isActive = true;
  if (inactiveOnly) where.isActive = false;
  if (q) {
    // SQLite: contains sem mode (LIKE é case-insensitive para ASCII)
    where.OR = [
      { name: { contains: q } },
      { city: { contains: q } },
      { state: { contains: q } },
      { shortName: { contains: q } },
    ];
  }

  const teams = await prisma.team.findMany({
    where,
    orderBy: [{ approvalStatus: 'asc' }, { isActive: 'desc' }, { name: 'asc' }],
  });
  return NextResponse.json(teams);
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
