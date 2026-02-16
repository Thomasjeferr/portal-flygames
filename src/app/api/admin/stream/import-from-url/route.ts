import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { importFromUrl, toStreamVideoUrl } from '@/lib/cloudflare-stream';

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const url = body?.url;
    if (typeof url !== 'string' || !url.trim()) {
      return NextResponse.json({ error: 'URL do vídeo obrigatória' }, { status: 400 });
    }

    const { videoId } = await importFromUrl(url.trim(), { requireSignedURLs: true });
    const videoUrl = toStreamVideoUrl(videoId);

    return NextResponse.json({ videoId, videoUrl });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Erro ao importar vídeo';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
