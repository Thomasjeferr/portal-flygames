import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { canAccessGameBySlug } from '@/lib/access';
import { isStreamVideo, extractStreamVideoId } from '@/lib/cloudflare-stream';
import { getTvSessionByToken } from '@/lib/tv-session';

/** GET /api/games/[gameId] – retorna jogo por id ou slug (compatível com chamadas por slug). Aceita tvSessionToken para app TV. */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  const idOrSlug = (await params).gameId;
  const game = await prisma.game.findUnique({ where: { id: idOrSlug } })
    ?? await prisma.game.findUnique({ where: { slug: idOrSlug } });
  if (!game) return NextResponse.json({ error: 'Jogo não encontrado' }, { status: 404 });

  const tvToken = request.nextUrl.searchParams.get('tvSessionToken')?.trim() || null;
  let userId: string | null = null;
  let tvSessionExpired = false;
  if (tvToken) {
    const tv = await getTvSessionByToken(tvToken);
    if (tv) userId = tv.userId;
    else tvSessionExpired = true;
  }
  if (!userId) {
    const session = await getSession();
    userId = session?.userId ?? null;
  }

  const canWatch = userId ? await canAccessGameBySlug(userId, game.slug) : false;
  const videoUrl = canWatch ? game.videoUrl : null;
  const isStream = !!videoUrl && isStreamVideo(videoUrl);
  const videoId = isStream && videoUrl ? extractStreamVideoId(videoUrl) : null;

  return NextResponse.json({
    ...game,
    gameDate: game.gameDate.toISOString(),
    canWatch,
    videoUrl,
    videoId,
    /** Quando true, o app TV deve exibir "Sessão expirada" e voltar à tela de QR code. */
    tvSessionExpired: tvToken ? tvSessionExpired : undefined,
    /** Quando true, a URL de reprodução DEVE ser obtida via GET /api/video/stream-playback com videoId, gameSlug e tvSessionToken (TV) ou deviceId (web/app). */
    streamPlaybackRequired: isStream,
  });
}
