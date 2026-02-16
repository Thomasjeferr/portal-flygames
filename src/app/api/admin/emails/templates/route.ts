import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== 'admin')
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
  try {
    const templates = await prisma.emailTemplate.findMany({
      orderBy: { key: 'asc' },
    });
    return NextResponse.json(templates);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Erro ao carregar templates' }, { status: 500 });
  }
}
