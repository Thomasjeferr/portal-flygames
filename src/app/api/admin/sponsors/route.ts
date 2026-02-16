import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { sponsorCreateSchema } from '@/lib/validators/sponsorSchema';

function toBody(data: Record<string, unknown>) {
  return {
    name: data.name,
    website_url: data.website_url ?? '',
    logo_url: data.logo_url,
    tier: data.tier ?? 'APOIO',
    priority: typeof data.priority === 'number' ? data.priority : Number(data.priority) || 0,
    is_active: data.is_active ?? true,
    start_at: data.start_at || null,
    end_at: data.end_at || null,
    plan_id: data.plan_id ?? null,
    team_id: data.team_id ?? null,
  };
}

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== 'admin')
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
  const sponsors = await prisma.sponsor.findMany({
    orderBy: [{ tier: 'asc' }, { priority: 'asc' }],
  });
  return NextResponse.json(sponsors);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'admin')
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
  try {
    const raw = await request.json();
    const body = toBody(raw);
    const parsed = sponsorCreateSchema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json({ error: parsed.error.errors[0]?.message ?? 'Dados inválidos' }, { status: 400 });
    const d = parsed.data;
    const sponsor = await prisma.sponsor.create({
      data: {
        name: d.name,
        websiteUrl: d.website_url?.trim() || null,
        logoUrl: d.logo_url,
        tier: d.tier,
        priority: d.priority,
        isActive: d.is_active,
        startAt: d.start_at ? new Date(d.start_at) : null,
        endAt: d.end_at ? new Date(d.end_at) : null,
        planId: d.plan_id || null,
        teamId: d.team_id || null,
      },
    });
    revalidatePath('/');
    return NextResponse.json(sponsor);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Erro ao criar patrocinador' }, { status: 500 });
  }
}
