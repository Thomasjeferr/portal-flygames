import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const userId = body.userId as string;

    if (!userId) {
      return NextResponse.json({ error: 'userId obrigatório' }, { status: 400 });
    }

    await prisma.subscription.updateMany({
      where: { userId },
      data: { active: false },
    });

    return NextResponse.json({ message: 'Assinatura desativada.' });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Erro ao desativar assinatura' }, { status: 500 });
  }
}
