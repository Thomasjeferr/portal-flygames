import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const schema = z.object({ bannerIds: z.array(z.string().cuid()) });

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Nao autorizado' }, { status: 403 });
  }
  try {
    const body = await request.json();
    const parsed = schema.safeParse({ bannerIds: body.bannerIds ?? [] });
    if (!parsed.success) {
      return NextResponse.json({ error: 'bannerIds obrigatorio' }, { status: 400 });
    }
    const { bannerIds } = parsed.data;
    await prisma.$transaction(
      bannerIds.map((bid, i) =>
        prisma.homeBanner.update({
          where: { id: bid },
          data: { priority: i },
        })
      )
    );
    revalidatePath('/');
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Erro ao reordenar' }, { status: 500 });
  }
}
