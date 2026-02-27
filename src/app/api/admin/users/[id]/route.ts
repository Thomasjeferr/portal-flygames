import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { isTeamResponsible } from '@/lib/access';
import { z } from 'zod';

const updateSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório').optional().or(z.literal('')),
  role: z.enum(['user', 'admin']).optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
  }

  const id = (await params).id;
  const [user, paidPurchasesCount, isResp, managerTeams, teamsByEmail] = await Promise.all([
    prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
        subscription: true,
      },
    }),
    prisma.purchase.count({
      where: { userId: id, paymentStatus: 'paid' },
    }),
    isTeamResponsible(id),
    prisma.teamManager.findMany({
      where: { userId: id },
      include: { team: { select: { id: true, name: true, shortName: true } } },
    }),
    prisma.user.findUnique({ where: { id }, select: { email: true } }).then((u) => {
      const email = u?.email?.trim().toLowerCase();
      if (!email) return [] as { id: string; name: string; shortName: string | null }[];
      return prisma.team.findMany({
        where: { approvalStatus: 'approved', responsibleEmail: { not: null } },
        select: { id: true, name: true, shortName: true, responsibleEmail: true },
      }).then((teams) =>
        teams
          .filter((t) => t.responsibleEmail?.trim().toLowerCase() === email)
          .map(({ id, name, shortName }) => ({ id, name, shortName }))
      );
    }),
  ]);

  if (!user) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });

  const managerTeamIds = new Set(managerTeams.map((m) => m.team.id));
  const managedTeams = [
    ...managerTeams.map((m) => ({
      id: m.team.id,
      name: m.team.name,
      shortName: m.team.shortName,
      role: m.role,
    })),
    ...teamsByEmail
      .filter((t) => !managerTeamIds.has(t.id))
      .map((t) => ({ id: t.id, name: t.name, shortName: t.shortName, role: 'OWNER' as const })),
  ];

  return NextResponse.json({
    ...user,
    paidPurchasesCount,
    isTeamResponsible: isResp,
    managedTeams,
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
  }

  const id = (await params).id;
  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });

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
    const update: { name?: string | null; role?: string } = {};
    if (data.name !== undefined) update.name = data.name || null;
    if (data.role !== undefined) update.role = data.role;

    const user = await prisma.user.update({
      where: { id },
      data: update,
      include: { subscription: true },
    });
    const { passwordHash: _, ...safe } = user;
    return NextResponse.json(safe);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Erro ao atualizar usuário' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
  }

  const id = (await params).id;

  if (session.userId === id) {
    return NextResponse.json(
      { error: 'Não é possível excluir sua própria conta' },
      { status: 400 }
    );
  }

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });

  await prisma.user.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
