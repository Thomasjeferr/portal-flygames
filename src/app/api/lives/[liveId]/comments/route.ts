import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

const BODY_MAX_LENGTH = 500;
const PAGE_SIZE = 20;

/** GET /api/lives/[liveId]/comments – lista comentários aprovados (paginado). O autor vê os próprios pendentes. */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ liveId: string }> }
) {
  try {
    const { liveId } = await params;
    if (!liveId) return NextResponse.json({ error: 'liveId obrigatório' }, { status: 400 });
    const session = await getSession();
    const page = Math.max(1, parseInt(request.nextUrl.searchParams.get('page') ?? '1', 10) || 1);
    const skip = (page - 1) * PAGE_SIZE;

    const [approvedComments, approvedTotal, myPending] = await Promise.all([
      prisma.liveComment.findMany({
        where: { liveId, status: 'approved' },
        orderBy: { createdAt: 'desc' },
        skip,
        take: PAGE_SIZE,
        select: {
          id: true,
          body: true,
          createdAt: true,
          status: true,
          user: { select: { id: true, name: true } },
        },
      }),
      prisma.liveComment.count({ where: { liveId, status: 'approved' } }),
      session
        ? prisma.liveComment.findMany({
            where: { liveId, userId: session.userId, status: 'pending' },
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              body: true,
              createdAt: true,
              status: true,
              user: { select: { id: true, name: true } },
            },
          })
        : [],
    ]);

    const mapComment = (c: { id: string; body: string; createdAt: Date; status: string; user: { name: string | null } }) => ({
      id: c.id,
      body: c.body,
      createdAt: c.createdAt.toISOString(),
      userName: c.user.name || 'Torcedor',
      status: c.status as 'approved' | 'pending',
    });

    return NextResponse.json({
      comments: approvedComments.map(mapComment),
      total: approvedTotal,
      page,
      totalPages: Math.ceil(approvedTotal / PAGE_SIZE) || 1,
      myPendingComments: myPending.map(mapComment),
    });
  } catch {
    return NextResponse.json({ error: 'Erro ao carregar comentários' }, { status: 500 });
  }
}

/** POST /api/lives/[liveId]/comments – cria comentário (status pending). Exige login. */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ liveId: string }> }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Faça login para comentar' }, { status: 401 });
    const { liveId } = await params;
    if (!liveId) return NextResponse.json({ error: 'liveId obrigatório' }, { status: 400 });
    let body: { body?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Corpo inválido' }, { status: 400 });
    }
    const text = typeof body.body === 'string' ? body.body.trim() : '';
    if (!text) return NextResponse.json({ error: 'Comentário obrigatório' }, { status: 400 });
    if (text.length > BODY_MAX_LENGTH) {
      return NextResponse.json({ error: `Máximo ${BODY_MAX_LENGTH} caracteres` }, { status: 400 });
    }
    const live = await prisma.live.findUnique({ where: { id: liveId }, select: { id: true } });
    if (!live) return NextResponse.json({ error: 'Live não encontrada' }, { status: 404 });
    const comment = await prisma.liveComment.create({
      data: { liveId, userId: session.userId, body: text, status: 'pending' },
      select: { id: true, body: true, createdAt: true, status: true },
    });
    return NextResponse.json({
      id: comment.id,
      body: comment.body,
      createdAt: comment.createdAt.toISOString(),
      status: comment.status,
      message: 'Comentário enviado e aguardando aprovação.',
    });
  } catch {
    return NextResponse.json({ error: 'Erro ao enviar comentário' }, { status: 500 });
  }
}
