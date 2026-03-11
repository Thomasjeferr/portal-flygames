import { NextRequest, NextResponse } from 'next/server';
import { getTeamAccess } from '@/lib/team-portal-auth';
import { prisma } from '@/lib/db';

// Formato novo: tacticalPosition = "lineIndex_slotIndex" (ex: "0_0" GOL, "1_0" primeiro da linha 1)
function parsePosition(pos: string): { lineIndex: number; slotIndex: number } | null {
  const parts = pos.split('_');
  if (parts.length === 2) {
    const line = parseInt(parts[0], 10);
    const slot = parseInt(parts[1], 10);
    if (!Number.isNaN(line) && !Number.isNaN(slot) && line >= 0 && slot >= 0) {
      return { lineIndex: line, slotIndex: slot };
    }
  }
  // Legado: GOL, ZAG, LAT, VOL, MEI, ATA -> mapear para linha/slot
  const legacy: Record<string, { lineIndex: number; slotIndex: number }> = {
    GOL: { lineIndex: 0, slotIndex: 0 },
    ZAG: { lineIndex: 1, slotIndex: 0 },
    LAT: { lineIndex: 2, slotIndex: 0 },
    VOL: { lineIndex: 3, slotIndex: 0 },
    MEI: { lineIndex: 4, slotIndex: 0 },
    ATA: { lineIndex: 5, slotIndex: 0 },
  };
  const key = String(pos).toUpperCase();
  return legacy[key] ?? null;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: teamId } = await params;
  if (!(await getTeamAccess(teamId))) {
    return NextResponse.json({ error: 'Acesso negado a este time' }, { status: 403 });
  }

  const [team, slots] = await Promise.all([
    prisma.team.findUnique({
      where: { id: teamId },
      select: { lineupFormation: true },
    }),
    prisma.teamLineupSlot.findMany({
      where: { teamId },
      orderBy: [{ order: 'asc' }],
      include: {
        teamMember: {
          select: { id: true, name: true, position: true, photoUrl: true, number: true },
        },
      },
    }),
  ]);

  const formation = team?.lineupFormation || '4-4-2';

  const legLine = (pos: string) => ({ GOL: 0, ZAG: 1, LAT: 2, VOL: 3, MEI: 4, ATA: 5 }[String(pos).toUpperCase()] ?? 99);
  const sortedSlots = [...slots].sort((a, b) => legLine(a.tacticalPosition) - legLine(b.tacticalPosition) || a.order - b.order);

  const countByPos = new Map<string, number>();
  const slotsNormalized = sortedSlots.map((s) => {
    const parsed = parsePosition(s.tacticalPosition);
    if (parsed) {
      return {
        id: s.id,
        teamMemberId: s.teamMemberId,
        lineIndex: parsed.lineIndex,
        slotIndex: parsed.slotIndex,
        member: s.teamMember,
      };
    }
    const key = String(s.tacticalPosition).toUpperCase();
    const idx = countByPos.get(key) ?? 0;
    countByPos.set(key, idx + 1);
    const legacyLine = { GOL: 0, ZAG: 1, LAT: 2, VOL: 3, MEI: 4, ATA: 5 }[key] ?? 0;
    return {
      id: s.id,
      teamMemberId: s.teamMemberId,
      lineIndex: legacyLine,
      slotIndex: idx,
      member: s.teamMember,
    };
  });

  return NextResponse.json({
    formation,
    slots: slotsNormalized,
  });
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
    const formationRaw = body.formation;
    const formation = typeof formationRaw === 'string' && /^[\d\-]+$/.test(formationRaw)
      ? formationRaw.trim()
      : '4-4-2';

    const raw = body.slots;
    if (!Array.isArray(raw)) {
      return NextResponse.json({ error: 'Envie slots como array' }, { status: 400 });
    }

    const slots: { teamMemberId: string; lineIndex: number; slotIndex: number }[] = [];
    for (const s of raw) {
      const teamMemberId = String(s?.teamMemberId ?? '').trim();
      const lineIndex = typeof s?.lineIndex === 'number' ? s.lineIndex : 0;
      const slotIndex = typeof s?.slotIndex === 'number' ? s.slotIndex : 0;
      if (!teamMemberId || lineIndex < 0 || slotIndex < 0) continue;

      const member = await prisma.teamMember.findFirst({
        where: { id: teamMemberId, teamId },
        select: { id: true },
      });
      if (!member) continue;

      slots.push({ teamMemberId, lineIndex, slotIndex });
    }

    await prisma.$transaction(async (tx) => {
      await tx.team.update({
        where: { id: teamId },
        data: { lineupFormation: formation },
      });
      await tx.teamLineupSlot.deleteMany({ where: { teamId } });
      for (let i = 0; i < slots.length; i++) {
        const s = slots[i];
        await tx.teamLineupSlot.create({
          data: {
            teamId,
            teamMemberId: s.teamMemberId,
            tacticalPosition: `${s.lineIndex}_${s.slotIndex}`,
            order: i,
          },
        });
      }
    });

    const updated = await prisma.teamLineupSlot.findMany({
      where: { teamId },
      orderBy: [{ order: 'asc' }],
      include: {
        teamMember: {
          select: { id: true, name: true, position: true, photoUrl: true, number: true },
        },
      },
    });

    return NextResponse.json({
      ok: true,
      formation,
      slots: updated.map((s) => {
        const parsed = parsePosition(s.tacticalPosition);
        return {
          id: s.id,
          teamMemberId: s.teamMemberId,
          lineIndex: parsed?.lineIndex ?? 0,
          slotIndex: parsed?.slotIndex ?? 0,
          member: s.teamMember,
        };
      }),
    });
  } catch (e) {
    console.error('POST /api/team-portal/teams/[id]/lineup', e);
    return NextResponse.json({ error: 'Erro ao salvar escalação' }, { status: 500 });
  }
}
