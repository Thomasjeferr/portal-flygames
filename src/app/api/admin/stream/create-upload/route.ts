import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { createDirectUpload, toStreamVideoUrl } from '@/lib/cloudflare-stream';

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const maxDurationSeconds = Number(body?.maxDurationSeconds) || 7200; // 2h default

    const { uploadUrl, videoId } = await createDirectUpload({
      maxDurationSeconds,
      requireSignedURLs: true,
    });
    const videoUrl = toStreamVideoUrl(videoId);

    return NextResponse.json({ uploadUrl, videoId, videoUrl });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Erro ao criar upload';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
