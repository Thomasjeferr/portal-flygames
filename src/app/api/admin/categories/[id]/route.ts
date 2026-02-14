import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { uniqueSlug } from '@/lib/slug';

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  order: z.number().int().min(0).optional(),
  active: z.boolean().optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
  }
  const id = (await params).id;
  const category = await prisma.category.findUnique({ where: { id } });
  if (!category) return NextResponse.json({ error: 'Categoria não encontrada' }, { status: 404 });
  return NextResponse.json(category);
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
  const existing = await prisma.category.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: 'Categoria não encontrada' }, { status: 404 });

  try {
    const body = await request.json();
    const parsed = updateSchema.safeParse({
      ...body,
      order: body.order != null ? Number(body.order) : undefined,
    });
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? 'Dados inválidos' },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const update: Record<string, unknown> = {};
    if (data.name !== undefined) update.name = data.name;
    if (data.order !== undefined) update.order = data.order;
    if (data.active !== undefined) update.active = data.active;
    if (data.name !== undefined && data.name !== existing.name) {
      const existingSlugs = (await prisma.category.findMany({ where: { id: { not: id } }, select: { slug: true } })).map((c) => c.slug);
      update.slug = uniqueSlug(data.name, existingSlugs);
    }

    const category = await prisma.category.update({
      where: { id },
      data: update as Parameters<typeof prisma.category.update>[0]['data'],
    });
    return NextResponse.json(category);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Erro ao atualizar categoria' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
  }
  const id = (await params).id;
  const category = await prisma.category.findUnique({ where: { id } });
  if (!category) return NextResponse.json({ error: 'Categoria não encontrada' }, { status: 404 });

  await prisma.game.updateMany({ where: { categoryId: id }, data: { categoryId: null } });
  await prisma.category.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
