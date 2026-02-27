import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { saveMatchResult } from '@/lib/tournamentBracket';
import { z } from 'zod';

const bodySchema = z.object({
  scoreA: z.number().int().min(0),
  scoreB: z.number().int().min(0),
  penaltiesA: z.number().int().min(0).optional().nullable(),
  penaltiesB: z.number().int().min(0).optional().nullable(),
});

/**
 * PATCH /api/admin/tournaments/[id]/matches/[matchId]
 * Salva resultado da partida (placar e opcionalmente pênaltis), calcula vencedor e avança para o próximo jogo.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; matchId: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
  }

  const { id: tournamentId, matchId } = await params;
  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? 'Dados inválidos' },
      { status: 400 }
    );
  }

  const result = await saveMatchResult(tournamentId, matchId, {
    scoreA: parsed.data.scoreA,
    scoreB: parsed.data.scoreB,
    penaltiesA: parsed.data.penaltiesA ?? undefined,
    penaltiesB: parsed.data.penaltiesB ?? undefined,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
