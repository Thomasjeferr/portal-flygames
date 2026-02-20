import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

const bodySchema = z.object({
  teamId: z.string().min(1, 'Selecione um time').nullable(),
});

/** PATCH /api/account/favorite-team – Atualiza o time do coração do usuário. */
export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? 'Dados inválidos' },
      { status: 400 }
    );
  }

  const { teamId } = parsed.data;

  if (teamId) {
    const team = await prisma.team.findFirst({
      where: { id: teamId, isActive: true, approvalStatus: 'approved' },
      select: { id: true },
    });
    if (!team) {
      return NextResponse.json({ error: 'Time não encontrado ou inativo.' }, { status: 400 });
    }
  }

  await prisma.user.update({
    where: { id: session.userId },
    data: { favoriteTeamId: teamId ?? null },
  });

  const updated = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      favoriteTeamId: true,
      favoriteTeam: {
        select: { id: true, name: true, shortName: true, crestUrl: true, city: true, state: true },
      },
    },
  });

  return NextResponse.json({
    message: teamId ? 'Time do coração atualizado.' : 'Time do coração removido.',
    favoriteTeamId: updated?.favoriteTeamId ?? null,
    favoriteTeam: updated?.favoriteTeam ?? null,
  });
}
