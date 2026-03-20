import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import {
  canAccessGameBySlug,
  getGameContractMaxScreensBySlug,
  getSponsorMaxScreens,
  getSubscriptionMaxScreens,
  hasFullAccess,
} from '@/lib/access';
import { prisma } from '@/lib/db';
import { getSignedPlaybackUrls } from '@/lib/cloudflare-stream';
import { getTvSessionByToken } from '@/lib/tv-session';

const STREAM_SESSION_ACTIVE_MS = 15 * 60 * 1000; // 15 min

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const videoId = searchParams.get('videoId');
  const gameSlug = searchParams.get('gameSlug');
  const preSaleSlug = searchParams.get('preSaleSlug');
  const sessionToken = searchParams.get('sessionToken');
  const tvSessionToken = searchParams.get('tvSessionToken')?.trim() || null;
  const deviceIdParam = searchParams.get('deviceId')?.trim() || null;

  if (!videoId?.trim()) {
    return NextResponse.json({ error: 'videoId obrigatório' }, { status: 400 });
  }

  const session = await getSession();
  let effectiveUserId: string | null = session?.userId ?? null;
  let effectiveDeviceId: string | null = deviceIdParam;

  if (tvSessionToken) {
    const tvSession = await getTvSessionByToken(tvSessionToken);
    if (!tvSession) {
      return NextResponse.json(
        { error: 'Sessão da TV expirada. Escaneie o QR code novamente na TV.' },
        { status: 401 }
      );
    }
    effectiveUserId = tvSession.userId;
    effectiveDeviceId = tvSession.deviceId;
  }

  // Verificar acesso: gameSlug OU preSaleSlug
  if (gameSlug) {
    if (!effectiveUserId) {
      return NextResponse.json({ error: 'Faça login para assistir' }, { status: 401 });
    }
    const hasAccess = await canAccessGameBySlug(effectiveUserId, gameSlug);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Sem acesso a este jogo' }, { status: 403 });
    }
    if (!effectiveDeviceId) {
      return NextResponse.json(
        { error: 'Identificador do dispositivo é necessário. Atualize o app e tente novamente.' },
        { status: 400 }
      );
    }

    // Limite de telas: patrocínio → assinatura → credencial de contrato por jogo
    let maxScreens = await getSponsorMaxScreens(effectiveUserId);
    if (maxScreens == null) maxScreens = await getSubscriptionMaxScreens(effectiveUserId);
    if (maxScreens == null && gameSlug) {
      maxScreens = await getGameContractMaxScreensBySlug(effectiveUserId, gameSlug);
    }
    if (maxScreens != null) {
      const now = new Date();
      const activeSince = new Date(now.getTime() - STREAM_SESSION_ACTIVE_MS);
      const activeSessions = await prisma.userStreamSession.findMany({
        where: {
          userId: effectiveUserId,
          lastHeartbeatAt: { gte: activeSince },
        },
        select: { deviceId: true },
      });
      const isThisDeviceActive = activeSessions.some((s) => s.deviceId === effectiveDeviceId);
      if (activeSessions.length >= maxScreens && !isThisDeviceActive) {
        return NextResponse.json(
          { error: `Limite de ${maxScreens} tela(s) simultânea(s) atingido. Feche o player em outro dispositivo ou aguarde alguns minutos.` },
          { status: 403 }
        );
      }
      await prisma.userStreamSession.upsert({
        where: {
          userId_deviceId: { userId: effectiveUserId, deviceId: effectiveDeviceId },
        },
        create: {
          userId: effectiveUserId,
          deviceId: effectiveDeviceId,
          lastHeartbeatAt: now,
        },
        update: { lastHeartbeatAt: now },
      });
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
    } else if (effectiveUserId && (await hasFullAccess(effectiveUserId))) {
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
