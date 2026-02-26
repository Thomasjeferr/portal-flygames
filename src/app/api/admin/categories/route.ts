import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { uniqueSlug } from '@/lib/slug';

const createSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  order: z.number().int().min(0).optional(),
  active: z.boolean().optional(),
});

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
  }
  const { searchParams } = new URL(request.url);
  const activeOnly = searchParams.get('active') === 'true';
  const where = activeOnly ? { active: true } : {};
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10) || 1);
  const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(searchParams.get('limit') ?? String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT));
  const skip = (page - 1) * limit;

  const [total, categories] = await Promise.all([
    prisma.category.count({ where }),
    prisma.category.findMany({
      where,
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
      skip,
      take: limit,
    }),
  ]);

  return NextResponse.json({
    categories,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
  });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const parsed = createSchema.safeParse({
      ...body,
      order: body.order != null ? Number(body.order) : 0,
      active: body.active ?? true,
    });
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? 'Dados inválidos' },
        { status: 400 }
      );
    }

    const existingSlugs = (await prisma.category.findMany({ select: { slug: true } })).map((c) => c.slug);
    const slug = uniqueSlug(parsed.data.name, existingSlugs);

    const category = await prisma.category.create({
      data: {
        name: parsed.data.name,
        slug,
        order: parsed.data.order ?? 0,
        active: parsed.data.active ?? true,
      },
    });
    return NextResponse.json(category);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Erro ao criar categoria' }, { status: 500 });
  }
}
