import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_EXT = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];

function getExtFromMagic(buffer: Buffer): string | null {
  if (buffer[0] === 0xff && buffer[1] === 0xd8) return '.jpg';
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) return '.png';
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) return '.gif';
  if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 && buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) return '.webp';
  const start = buffer.slice(0, 200).toString('ascii', 0, 200);
  if (start.includes('<svg') || (start.includes('<?xml') && start.includes('<svg'))) return '.svg';
  return null;
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
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
      return NextResponse.json({ error: 'Arquivo muito grande. Máximo 5MB.' }, { status: 400 });
    }

    const claimedExt = path.extname(file.name).toLowerCase();
    if (!ALLOWED_EXT.includes(claimedExt)) {
      return NextResponse.json({ error: 'Tipo não permitido. Use: jpg, png, gif, webp ou svg.' }, { status: 400 });
    }

    const detectedExt = getExtFromMagic(buffer);
    if (!detectedExt || !ALLOWED_EXT.includes(detectedExt)) {
      return NextResponse.json({ error: 'Conteúdo do arquivo não corresponde à imagem.' }, { status: 400 });
    }
    if (claimedExt !== detectedExt) {
      return NextResponse.json({ error: 'Extensão do arquivo não confere com o conteúdo.' }, { status: 400 });
    }

    const safeName = `${Date.now()}-${Math.random().toString(36).slice(2)}${claimedExt}`;

    await mkdir(UPLOAD_DIR, { recursive: true });
    const filePath = path.join(UPLOAD_DIR, safeName);
    await writeFile(filePath, buffer);

    const url = `/uploads/${safeName}`;
    return NextResponse.json({ url });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Erro no upload' }, { status: 500 });
  }
}
