import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')?.trim().toUpperCase();
  if (!code || code.length !== 6) {
    return NextResponse.json({ error: 'Código inválido' }, { status: 400 });
  }

  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || '';
  const proto = request.headers.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (host ? `${proto}://${host}` : 'https://flygames.app');
  const activateUrl = `${baseUrl}/tv?code=${encodeURIComponent(code)}`;

  try {
    const png = await QRCode.toBuffer(activateUrl, {
      width: 320,
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' },
    });
    const res = new NextResponse(png, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'no-store',
        'Access-Control-Allow-Origin': '*',
      },
    });
    return res;
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Erro ao gerar QR code' }, { status: 500 });
  }
}
