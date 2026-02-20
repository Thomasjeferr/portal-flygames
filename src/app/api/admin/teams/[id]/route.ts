import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { uniqueSlug } from '@/lib/slug';
import { teamUpdateSchema } from '@/lib/validators/teamSchema';

function toBody(data: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  if (data.name !== undefined) out.name = data.name;
  if (data.shortName !== undefined) out.shortName = data.shortName ?? '';
  if (data.city !== undefined) out.city = data.city ?? '';
  if (data.state !== undefined) out.state = data.state ?? '';
  if (data.foundedYear !== undefined) out.foundedYear = data.foundedYear != null ? Number(data.foundedYear) : null;
  if (data.crestUrl !== undefined) out.crestUrl = data.crestUrl ?? '';
  if (data.instagram !== undefined) out.instagram = data.instagram ?? '';
  if (data.whatsapp !== undefined) out.whatsapp = data.whatsapp ?? '';
  if (data.description !== undefined) out.description = data.description ?? '';
  if (data.isActive !== undefined) out.isActive = data.isActive;
  if (data.payoutPixKey !== undefined) out.payoutPixKey = data.payoutPixKey ?? null;
  if (data.payoutName !== undefined) out.payoutName = data.payoutName ?? null;
  if (data.payoutDocument !== undefined) out.payoutDocument = data.payoutDocument ?? null;
  if (data.responsibleName !== undefined) out.responsibleName = data.responsibleName ?? null;
  if (data.responsibleEmail !== undefined) out.responsibleEmail = data.responsibleEmail ?? null;
  return out;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== 'admin')
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
  const id = (await params).id;
  const team = await prisma.team.findUnique({
    where: { id },
    include: {
      members: {
        orderBy: [{ role: 'asc' }, { name: 'asc' }],
        select: { id: true, name: true, role: true, number: true, position: true, isActive: true, createdAt: true },
      },
    },
  });
  if (!team) return NextResponse.json({ error: 'Time não encontrado' }, { status: 404 });
  return NextResponse.json(team);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== 'admin')
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
  const id = (await params).id;

  try {
    const current = await prisma.team.findUnique({ where: { id } });
    if (!current) return NextResponse.json({ error: 'Time não encontrado' }, { status: 404 });

    const raw = await request.json();
    const body = toBody(raw);
    const parsed = teamUpdateSchema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json({ error: parsed.error.errors[0]?.message ?? 'Dados inválidos' }, { status: 400 });

    const d = parsed.data;
    const update: Record<string, unknown> = {};

    if (d.name !== undefined) update.name = d.name;
    if (d.shortName !== undefined) update.shortName = d.shortName?.trim() || null;
    if (d.city !== undefined) update.city = d.city?.trim() || null;
    if (d.state !== undefined) update.state = d.state?.trim()?.toUpperCase() || null;
    if (d.foundedYear !== undefined) update.foundedYear = d.foundedYear ?? null;
    if (d.crestUrl !== undefined) update.crestUrl = d.crestUrl?.trim() || null;
    if (d.instagram !== undefined) update.instagram = d.instagram?.trim() || null;
    if (d.whatsapp !== undefined) update.whatsapp = d.whatsapp?.replace(/\D/g, '') || null;
    if (d.description !== undefined) update.description = d.description?.trim() || null;
    if (d.isActive !== undefined) update.isActive = d.isActive;
    if (d.payoutPixKey !== undefined) update.payoutPixKey = d.payoutPixKey?.trim() || null;
    if (d.payoutName !== undefined) update.payoutName = d.payoutName?.trim() || null;
    if (d.payoutDocument !== undefined) update.payoutDocument = d.payoutDocument?.trim() || null;
    if (d.responsibleName !== undefined) update.responsibleName = d.responsibleName?.trim() || null;
    if (d.responsibleEmail !== undefined) update.responsibleEmail = d.responsibleEmail?.trim() || null;

    if (d.name !== undefined && d.name !== current.name) {
      const existingSlugs = (await prisma.team.findMany({ where: { id: { not: id } }, select: { slug: true } })).map(
        (t) => t.slug
      );
      (update as Record<string, string>).slug = uniqueSlug(d.name, existingSlugs);
    }

    const team = await prisma.team.update({
      where: { id },
      data: update as Parameters<typeof prisma.team.update>[0]['data'],
    });
    revalidatePath('/');
    return NextResponse.json(team);
  } catch (e) {
    console.error('PATCH /api/admin/teams/[id]', e);
    return NextResponse.json({ error: 'Erro ao atualizar time' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== 'admin')
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
  const id = (await params).id;
  try {
    const team = await prisma.team.findUnique({ where: { id } });
    if (!team) return NextResponse.json({ error: 'Time não encontrado' }, { status: 404 });

    if (team.isActive) {
      // Primeiro clique: apenas desativa (soft delete)
      await prisma.team.update({
        where: { id },
        data: { isActive: false },
      });
      revalidatePath('/');
      return NextResponse.json({ ok: true, deleted: false });
    }

    // Já está desativado: agora exclui definitivamente
    await prisma.team.delete({ where: { id } });
    revalidatePath('/');
    return NextResponse.json({ ok: true, deleted: true });
  } catch (e) {
    console.error('DELETE /api/admin/teams/[id]', e);
    return NextResponse.json({ error: 'Erro ao excluir time' }, { status: 500 });
  }
}
