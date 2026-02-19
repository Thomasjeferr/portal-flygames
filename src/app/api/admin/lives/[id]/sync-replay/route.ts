import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getLiveInputVideos } from '@/lib/cloudflare-live';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
  }

  const id = (await params).id;
  const live = await prisma.live.findUnique({ where: { id } });
  if (!live) {
    return NextResponse.json({ error: 'Live não encontrada' }, { status: 404 });
  }
  if (!live.cloudflareLiveInputId) {
    return NextResponse.json(
      { error: 'Esta live não possui Live Input do Cloudflare vinculado.' },
      { status: 400 }
    );
  }

  try {
    const videos = await getLiveInputVideos(live.cloudflareLiveInputId);
    if (!videos.length) {
      return NextResponse.json(
        { error: 'Nenhum vídeo gravado encontrado para esta live. Aguarde alguns minutos após o término da transmissão.' },
        { status: 404 }
      );
    }

    const lastVideo = videos[videos.length - 1];

    const updated = await prisma.live.update({
      where: { id: live.id },
      data: {
        cloudflarePlaybackId: lastVideo.uid,
        status: live.status === 'LIVE' ? 'ENDED' : live.status,
      },
    });

    return NextResponse.json({
      id: updated.id,
      cloudflarePlaybackId: updated.cloudflarePlaybackId,
      status: updated.status,
    });
  } catch (e) {
    console.error('POST /api/admin/lives/[id]/sync-replay', e);
    const message = e instanceof Error ? e.message : 'Erro ao sincronizar replay';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

