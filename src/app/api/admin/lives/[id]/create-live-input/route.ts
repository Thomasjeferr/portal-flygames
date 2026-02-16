import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { createLiveInput } from '@/lib/cloudflare-live';

/**
 * Cria um Live Input no Cloudflare para uma live existente que ainda não tem credenciais.
 * Retorna ingestUrl e streamKey para o admin copiar (não são armazenados no banco).
 */
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
  if (!live) return NextResponse.json({ error: 'Live não encontrada' }, { status: 404 });
  if (live.cloudflareLiveInputId) {
    return NextResponse.json(
      { error: 'Esta live já possui credenciais OBS. Use a mesma URL e chave.' },
      { status: 400 }
    );
  }

  try {
    const result = await createLiveInput({ name: live.title, recordingMode: 'automatic' });
    await prisma.live.update({
      where: { id },
      data: { cloudflareLiveInputId: result.uid },
    });
    return NextResponse.json({
      ingestUrl: result.ingestUrl,
      streamKey: result.streamKey,
      rtmpsUrl: result.rtmpsUrl,
    });
  } catch (e) {
    console.error('POST /api/admin/lives/[id]/create-live-input', e);
    const message = e instanceof Error ? e.message : 'Erro ao criar Live Input';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
