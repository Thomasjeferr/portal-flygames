import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { put } from '@vercel/blob';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');
const MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2MB
const ALLOWED_EXT = ['.jpg', '.jpeg', '.png', '.webp'];

function getExtFromMagic(buffer: Buffer): string | null {
  if (buffer[0] === 0xff && buffer[1] === 0xd8) return '.jpg';
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) return '.png';
  if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 && buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) return '.webp';
  return null;
}

/** Upload de foto de perfil do usuário logado. Atualiza User.avatarUrl. */
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'Arquivo não enviado' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    if (buffer.length > MAX_SIZE_BYTES) {
      return NextResponse.json({ error: 'Arquivo muito grande. Máximo 2MB.' }, { status: 400 });
    }

    const claimedExt = path.extname(file.name).toLowerCase();
    if (!ALLOWED_EXT.includes(claimedExt)) {
      return NextResponse.json({ error: 'Tipo não permitido. Use: jpg, png ou webp.' }, { status: 400 });
    }

    const detectedExt = getExtFromMagic(buffer);
    if (!detectedExt || !ALLOWED_EXT.includes(detectedExt)) {
      return NextResponse.json({ error: 'Conteúdo do arquivo não é uma imagem válida (use JPG, PNG ou WebP).' }, { status: 400 });
    }
    // Usa a extensão detectada pelo conteúdo (aceita arquivo renomeado, ex.: PNG salvo como .jpg)
    const extToUse = detectedExt;

    const safeName = `user-avatar-${session.userId}-${Date.now()}${extToUse}`;

    let url: string;
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const blob = await put(`user-avatars/${safeName}`, file, { access: 'public', addRandomSuffix: false });
      url = blob.url;
    } else {
      await mkdir(UPLOAD_DIR, { recursive: true });
      await writeFile(path.join(UPLOAD_DIR, safeName), buffer);
      url = `/uploads/${safeName}`;
    }

    await prisma.user.update({
      where: { id: session.userId },
      data: { avatarUrl: url },
    });

    return NextResponse.json({ url });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Erro no upload' }, { status: 500 });
  }
}
