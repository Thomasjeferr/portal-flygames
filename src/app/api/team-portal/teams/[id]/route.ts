import { NextRequest, NextResponse } from 'next/server';
import { getTeamAccess } from '@/lib/team-portal-auth';
import { prisma } from '@/lib/db';

/** Retorna dados do time (para layout e página Dados do time). */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: teamId } = await params;
  if (!(await getTeamAccess(teamId))) {
    return NextResponse.json({ error: 'Acesso negado a este time' }, { status: 403 });
  }

  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: {
      id: true,
      name: true,
      shortName: true,
      city: true,
      state: true,
      crestUrl: true,
      isActive: true,
      approvalStatus: true,
    },
  });
  if (!team) return NextResponse.json({ error: 'Time não encontrado' }, { status: 404 });

  return NextResponse.json(team);
}

/** Atualiza dados editáveis pelo time (brasão, nome curto, cidade, estado). */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: teamId } = await params;
  if (!(await getTeamAccess(teamId))) {
    return NextResponse.json({ error: 'Acesso negado a este time' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const data: { crestUrl?: string | null; shortName?: string | null; city?: string | null; state?: string | null } = {};
    if (body.crestUrl !== undefined) data.crestUrl = body.crestUrl ? String(body.crestUrl).trim() : null;
    if (body.shortName !== undefined) data.shortName = body.shortName ? String(body.shortName).trim() : null;
    if (body.city !== undefined) data.city = body.city ? String(body.city).trim() : null;
    if (body.state !== undefined) data.state = body.state ? String(body.state).trim()?.toUpperCase() || null : null;

    const team = await prisma.team.update({
      where: { id: teamId },
      data,
      select: { id: true, name: true, shortName: true, city: true, state: true, crestUrl: true },
    });
    return NextResponse.json(team);
  } catch (e) {
    console.error('PATCH /api/team-portal/teams/[id]', e);
    return NextResponse.json({ error: 'Erro ao atualizar time' }, { status: 500 });
  }
}
