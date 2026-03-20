import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import {
  generateGameContractCredential,
  regenerateGameContractPassword,
  revokeGameContractCredential,
  updateGameContractMaxStreams,
} from '@/services/game-contract-viewer.service';

const bodySchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('generate'),
    side: z.enum(['home', 'away']),
    maxConcurrentStreams: z.number().int().min(1).max(500),
  }),
  z.object({
    action: z.literal('regenerate'),
    side: z.enum(['home', 'away']),
  }),
  z.object({
    action: z.literal('revoke'),
    side: z.enum(['home', 'away']),
  }),
  z.object({
    action: z.literal('update_max'),
    side: z.enum(['home', 'away']),
    maxConcurrentStreams: z.number().int().min(1).max(500),
  }),
]);

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
  }

  const gameId = (await params).id;
  const game = await prisma.game.findUnique({
    where: { id: gameId },
    select: { id: true, contractCredentialsEnabled: true },
  });
  if (!game) return NextResponse.json({ error: 'Jogo não encontrado' }, { status: 404 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? 'Dados inválidos' }, { status: 400 });
  }

  const payload = parsed.data;

  if (payload.action === 'generate' && !game.contractCredentialsEnabled) {
    return NextResponse.json(
      { error: 'Ative "Acesso por contrato" no jogo antes de gerar credenciais.' },
      { status: 400 }
    );
  }

  if (
    (payload.action === 'regenerate' || payload.action === 'update_max') &&
    !game.contractCredentialsEnabled
  ) {
    return NextResponse.json(
      { error: 'Ative "Acesso por contrato" no jogo para esta ação.' },
      { status: 400 }
    );
  }

  if (payload.action === 'generate') {
    const result = await generateGameContractCredential(gameId, payload.side, payload.maxConcurrentStreams);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json({
      ok: true,
      username: result.username,
      password: result.password,
      message: 'Guarde a senha: ela não será exibida novamente (exceto ao regenerar).',
    });
  }

  if (payload.action === 'regenerate') {
    const result = await regenerateGameContractPassword(gameId, payload.side);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json({
      ok: true,
      username: result.username,
      password: result.password,
    });
  }

  if (payload.action === 'revoke') {
    const result = await revokeGameContractCredential(gameId, payload.side);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  const result = await updateGameContractMaxStreams(gameId, payload.side, payload.maxConcurrentStreams);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true });
}
