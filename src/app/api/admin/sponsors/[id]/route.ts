import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { sponsorUpdateSchema } from '@/lib/validators/sponsorSchema';

function toBody(data: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  if (data.name !== undefined) out.name = data.name;
  if (data.website_url !== undefined) out.website_url = data.website_url ?? '';
  if (data.logo_url !== undefined) out.logo_url = data.logo_url;
  if (data.tier !== undefined) out.tier = data.tier;
  if (data.priority !== undefined) out.priority = typeof data.priority === 'number' ? data.priority : Number(data.priority) ?? 0;
  if (data.is_active !== undefined) out.is_active = data.is_active;
  if (data.start_at !== undefined) out.start_at = data.start_at || null;
  if (data.end_at !== undefined) out.end_at = data.end_at || null;
  return out;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== 'admin')
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
  const id = (await params).id;
  const sponsor = await prisma.sponsor.findUnique({ where: { id } });
  if (!sponsor) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });
  return NextResponse.json(sponsor);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== 'admin')
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
  const id = (await params).id;
  try {
    const current = await prisma.sponsor.findUnique({ where: { id } });
    if (!current) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });

    const raw = await request.json();
    const body = toBody(raw);
    const parsed = sponsorUpdateSchema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json({ error: parsed.error.errors[0]?.message ?? 'Dados inválidos' }, { status: 400 });
    const d = parsed.data;

    const sponsor = await prisma.sponsor.update({
      where: { id },
      data: {
        ...(d.name !== undefined && { name: d.name }),
        ...(d.website_url !== undefined && { websiteUrl: d.website_url?.trim() || null }),
        ...(d.logo_url !== undefined && { logoUrl: d.logo_url }),
        ...(d.tier !== undefined && { tier: d.tier }),
        ...(d.priority !== undefined && { priority: d.priority }),
        ...(d.is_active !== undefined && { isActive: d.is_active }),
        ...(d.start_at !== undefined && { startAt: d.start_at ? new Date(d.start_at) : null }),
        ...(d.end_at !== undefined && { endAt: d.end_at ? new Date(d.end_at) : null }),
      },
    });
    revalidatePath('/');
    return NextResponse.json(sponsor);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Erro ao atualizar' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== 'admin')
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
  const id = (await params).id;
  try {
    await prisma.sponsor.delete({ where: { id } });
    revalidatePath('/');
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Erro ao excluir' }, { status: 500 });
  }
}
