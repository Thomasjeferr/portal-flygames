import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { slugify } from '@/lib/slug';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
  }
  const type = request.nextUrl.searchParams.get('type') as 'NORMAL' | 'SPECIAL' | null;
  const where = type && (type === 'NORMAL' || type === 'SPECIAL') ? { type } : {};
  const categories = await prisma.preSaleCategory.findMany({
    where,
    orderBy: { name: 'asc' },
  });
  return NextResponse.json(categories);
}

const createSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['NORMAL', 'SPECIAL']),
});

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
  }
  try {
    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });
    }
    const baseSlug = slugify(parsed.data.name);
    const existing = await prisma.preSaleCategory.findMany({ select: { slug: true } });
    let slug = baseSlug;
    let i = 1;
    while (existing.some((e) => e.slug === slug)) {
      slug = `${baseSlug}-${i++}`;
    }
    const cat = await prisma.preSaleCategory.create({
      data: { name: parsed.data.name, slug, type: parsed.data.type },
    });
    return NextResponse.json(cat);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Erro ao criar categoria' }, { status: 500 });
  }
}
