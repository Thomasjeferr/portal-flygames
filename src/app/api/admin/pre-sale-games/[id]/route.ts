import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { updatePreSaleGameSchema } from '@/lib/pre-sale/validations';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
  }
  const id = (await params).id;
  const game = await prisma.preSaleGame.findUnique({
    where: { id },
    include: {
      homeTeam: { select: { id: true, name: true, slug: true } },
      awayTeam: { select: { id: true, name: true, slug: true } },
      specialCategory: true,
      normalCategories: { include: { category: true } },
      clubSlots: {
        orderBy: { slotIndex: 'asc' },
        include: { clubViewerAccount: true },
      },
    },
  });
  if (!game) return NextResponse.json({ error: 'Jogo não encontrado' }, { status: 404 });
  const gradeCategory = game.gradeCategoryId
    ? await prisma.category.findUnique({ where: { id: game.gradeCategoryId } })
    : null;
  return NextResponse.json({ ...game, gradeCategory });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
  }
  const id = (await params).id;
  const existing = await prisma.preSaleGame.findUnique({
    where: { id },
    include: { clubSlots: true },
  });
  if (!existing) return NextResponse.json({ error: 'Jogo não encontrado' }, { status: 404 });

  try {
    const body = await request.json();
    const parsed = updatePreSaleGameSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? 'Dados inválidos' },
        { status: 400 }
      );
    }
    const data = parsed.data;
    const hasAnyPaid = existing.clubSlots.some((s) => s.paymentStatus === 'PAID');
    if (hasAnyPaid && (data.clubAPrice !== undefined || data.clubBPrice !== undefined)) {
      return NextResponse.json(
        { error: 'Não é possível alterar preços após o primeiro pagamento' },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.thumbnailUrl !== undefined) updateData.thumbnailUrl = data.thumbnailUrl;
    if (data.videoUrl !== undefined) updateData.videoUrl = data.videoUrl?.trim() || null;
    if (data.specialCategoryId !== undefined) updateData.specialCategoryId = data.specialCategoryId;
    if (data.gradeCategoryId !== undefined) updateData.gradeCategoryId = data.gradeCategoryId?.trim() || null;
    if (!hasAnyPaid) {
      if (data.clubAPrice !== undefined) updateData.clubAPrice = data.clubAPrice;
      if (data.clubBPrice !== undefined) updateData.clubBPrice = data.clubBPrice;
    }
    if (data.maxSimultaneousPerClub !== undefined) updateData.maxSimultaneousPerClub = data.maxSimultaneousPerClub;
    if (data.featured !== undefined) updateData.featured = data.featured;
    if (data.homeTeamId !== undefined) updateData.homeTeamId = data.homeTeamId?.trim() || null;
    if (data.awayTeamId !== undefined) updateData.awayTeamId = data.awayTeamId?.trim() || null;
    if (data.metaEnabled !== undefined) updateData.metaEnabled = data.metaEnabled;
    if (data.metaExtraPerTeam !== undefined) {
      updateData.metaExtraPerTeam = data.metaExtraPerTeam;
      // Meta como total por time (igual à criação)
      if (existing.metaEnabled && existing.homeTeamId && existing.awayTeamId && data.metaExtraPerTeam >= 1) {
        (updateData as Record<string, number>).metaHomeTotal = data.metaExtraPerTeam;
        (updateData as Record<string, number>).metaAwayTotal = data.metaExtraPerTeam;
      }
    }
    if (data.premiereAt !== undefined) {
      const raw = typeof data.premiereAt === 'string' ? data.premiereAt.trim() : '';
      updateData.premiereAt = raw ? (() => { const d = new Date(raw); return isNaN(d.getTime()) ? null : d; })() : null;
    }

    if (data.normalCategoryIds !== undefined) {
      await prisma.preSaleGameCategory.deleteMany({ where: { preSaleGameId: id } });
      const ids = Array.isArray(data.normalCategoryIds) ? data.normalCategoryIds.filter(Boolean) : [];
      if (ids.length > 0) {
        await prisma.preSaleGameCategory.createMany({
          data: ids.map((categoryId: string) => ({ preSaleGameId: id, categoryId })),
        });
      }
    }

    // Pré-estreia com Meta: ao salvar com URL, publicar e tirar do bloco "Pré-estreia com Meta" (só na categoria)
    const finalVideoUrl =
      data.videoUrl !== undefined ? (data.videoUrl?.trim() || null) : existing.videoUrl?.trim() || null;
    if (existing.metaEnabled && existing.homeTeamId && existing.awayTeamId && finalVideoUrl) {
      (updateData as Record<string, unknown>).status = 'PUBLISHED';
    }

    const updated = await prisma.preSaleGame.update({
      where: { id },
      data: updateData as any,
      include: {
        homeTeam: { select: { id: true, name: true, slug: true } },
        awayTeam: { select: { id: true, name: true, slug: true } },
        specialCategory: true,
        normalCategories: { include: { category: true } },
        clubSlots: {
          orderBy: { slotIndex: 'asc' },
          include: { clubViewerAccount: true },
        },
      },
    });
    const gradeCategory = updated.gradeCategoryId
      ? await prisma.category.findUnique({ where: { id: updated.gradeCategoryId } })
      : null;
    return NextResponse.json({ ...updated, gradeCategory });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Erro ao atualizar' }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
  }
  const id = (await params).id;
  const game = await prisma.preSaleGame.findUnique({
    where: { id },
    include: { clubSlots: { include: { clubViewerAccount: true } } },
  });
  if (!game) return NextResponse.json({ error: 'Jogo não encontrado' }, { status: 404 });
  try {
    const userIdsToDelete = game.clubSlots
      .map((s) => s.clubViewerAccount?.userId)
      .filter((uid): uid is string => !!uid);
    await prisma.preSaleGame.delete({ where: { id } });
    if (userIdsToDelete.length > 0) {
      await prisma.user.deleteMany({ where: { id: { in: userIdsToDelete } } });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Erro ao excluir jogo' }, { status: 500 });
  }
}
