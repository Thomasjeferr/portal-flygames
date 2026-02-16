import { NextRequest, NextResponse } from 'next/server';
import { getTeamAccess } from '@/lib/team-portal-auth';
import { prisma } from '@/lib/db';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: teamId } = await params;
  if (!(await getTeamAccess(teamId))) {
    return NextResponse.json({ error: 'Acesso negado a este time' }, { status: 403 });
  }

  const members = await prisma.teamMember.findMany({
    where: { teamId },
    orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
  });
  return NextResponse.json(members);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: teamId } = await params;
  if (!(await getTeamAccess(teamId))) {
    return NextResponse.json({ error: 'Acesso negado a este time' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const name = String(body.name ?? '').trim();
    if (!name) return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 });

    const member = await prisma.teamMember.create({
      data: {
        teamId,
        name,
        role: String(body.role ?? 'PLAYER'),
        number: body.number != null ? Number(body.number) : null,
        position: body.position ? String(body.position) : null,
        isActive: body.isActive ?? true,
      },
    });
    return NextResponse.json(member, { status: 201 });
  } catch (e) {
    console.error('POST /api/team-portal/teams/[id]/members', e);
    return NextResponse.json({ error: 'Erro ao adicionar membro' }, { status: 500 });
  }
}

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
    const id = String(body.id ?? '');
    if (!id) return NextResponse.json({ error: 'ID do membro é obrigatório' }, { status: 400 });

    const existing = await prisma.teamMember.findFirst({ where: { id, teamId } });
    if (!existing) return NextResponse.json({ error: 'Membro não encontrado' }, { status: 404 });

    const data: Record<string, unknown> = {};
    if (body.name !== undefined) data.name = String(body.name).trim();
    if (body.role !== undefined) data.role = String(body.role);
    if (body.number !== undefined) data.number = body.number != null ? Number(body.number) : null;
    if (body.position !== undefined) data.position = body.position ? String(body.position) : null;
    if (body.isActive !== undefined) data.isActive = !!body.isActive;

    const member = await prisma.teamMember.update({
      where: { id },
      data,
    });
    return NextResponse.json(member);
  } catch (e) {
    console.error('PATCH /api/team-portal/teams/[id]/members', e);
    return NextResponse.json({ error: 'Erro ao atualizar membro' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: teamId } = await params;
  if (!(await getTeamAccess(teamId))) {
    return NextResponse.json({ error: 'Acesso negado a este time' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const id = String(body.id ?? '');
    if (!id) return NextResponse.json({ error: 'ID do membro é obrigatório' }, { status: 400 });

    await prisma.teamMember.deleteMany({ where: { id, teamId } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('DELETE /api/team-portal/teams/[id]/members', e);
    return NextResponse.json({ error: 'Erro ao remover membro' }, { status: 500 });
  }
}
