import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { canAccessGameBySlug, hasFullAccess } from '@/lib/access';
import { prisma } from '@/lib/db';
import { getSignedPlaybackUrls } from '@/lib/cloudflare-stream';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const videoId = searchParams.get('videoId');
  const gameSlug = searchParams.get('gameSlug');
  const preSaleSlug = searchParams.get('preSaleSlug');
  const sessionToken = searchParams.get('sessionToken');

  if (!videoId?.trim()) {
    return NextResponse.json({ error: 'videoId obrigatório' }, { status: 400 });
  }

  const session = await getSession();

  // Verificar acesso: gameSlug OU preSaleSlug
  if (gameSlug) {
    if (!session) {
      return NextResponse.json({ error: 'Faça login para assistir' }, { status: 401 });
    }
    const hasAccess = await canAccessGameBySlug(session.userId, gameSlug);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Sem acesso a este jogo' }, { status: 403 });
    }
  } else if (preSaleSlug) {
    const game = await prisma.preSaleGame.findUnique({ where: { slug: preSaleSlug } });
    if (!game || game.status !== 'PUBLISHED' || !game.videoUrl) {
      return NextResponse.json({ error: 'Jogo não disponível' }, { status: 404 });
    }
    let allowed = false;
    if (sessionToken?.trim()) {
      const streamSession = await prisma.clubStreamSession.findFirst({
        where: {
          sessionToken: sessionToken.trim(),
          preSaleGameId: game.id,
          expiresAt: { gte: new Date() },
        },
      });
      allowed = !!streamSession;
    } else if (session?.role === 'admin') {
      allowed = true;
    } else if (session && (await hasFullAccess(session.userId))) {
      allowed = true;
    }
    if (!allowed) {
      return NextResponse.json({ error: 'Sessão expirada ou sem acesso' }, { status: 403 });
    }
  } else {
    return NextResponse.json({ error: 'Informe gameSlug ou preSaleSlug' }, { status: 400 });
  }

  try {
    const { iframeUrl, hlsUrl } = await getSignedPlaybackUrls(videoId, 3600);
    return NextResponse.json({ playbackUrl: iframeUrl, hlsUrl });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Erro ao gerar URL de reprodução';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
