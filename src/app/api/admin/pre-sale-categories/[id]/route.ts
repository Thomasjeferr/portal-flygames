import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

/**
 * Exclui categoria de pré-estreia apenas se nenhum jogo estiver vinculado
 * (como categoria especial ou nas categorias normais do jogo).
 */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
  }
  const id = (await params).id;
  const category = await prisma.preSaleCategory.findUnique({ where: { id } });
  if (!category) {
    return NextResponse.json({ error: 'Categoria não encontrada' }, { status: 404 });
  }
  const usedAsSpecial = await prisma.preSaleGame.count({ where: { specialCategoryId: id } });
  const usedAsNormal = await prisma.preSaleGameCategory.count({ where: { categoryId: id } });
  if (usedAsSpecial > 0 || usedAsNormal > 0) {
    return NextResponse.json(
      { error: 'Não é possível excluir: a categoria está vinculada a um ou mais jogos. Remova a categoria dos jogos primeiro.' },
      { status: 400 }
    );
  }
  try {
    await prisma.preSaleCategory.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Erro ao excluir categoria' }, { status: 500 });
  }
}
