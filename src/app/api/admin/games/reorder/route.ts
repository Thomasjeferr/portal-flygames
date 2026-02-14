import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const reorderSchema = z.object({
  gameIds: z.array(z.string().min(1)).min(1, 'Informe a lista de IDs'),
});

export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const parsed = reorderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? 'Dados inválidos' },
        { status: 400 }
      );
    }

    const { gameIds } = parsed.data;
    await prisma.$transaction(
      gameIds.map((id, index) =>
        prisma.game.update({
          where: { id },
          data: { order: index },
        })
      )
    );

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Erro ao reordenar jogos' }, { status: 500 });
  }
}
