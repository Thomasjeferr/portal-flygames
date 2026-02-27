import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { generateBracket } from '@/lib/tournamentBracket';

/**
 * POST /api/admin/tournaments/[id]/generate-bracket
 * Gera os 31 jogos da chave (sorteio na 1ª fase) e define bracket_status = GENERATED.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
  }

  const id = (await params).id;
  const result = await generateBracket(id);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
