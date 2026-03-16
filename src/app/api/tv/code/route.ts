import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { checkTvCodeRateLimit, incrementTvCodeRateLimit } from '@/lib/email/rateLimit';
import { randomBytes } from 'crypto';

const CODE_LENGTH = 6;
const CODE_EXPIRES_MINUTES = 15;
// Caracteres para o código (evita 0/O, 1/I/L para não confundir na digitação)
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function generateCode(): string {
  const bytes = randomBytes(CODE_LENGTH);
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_CHARS[bytes[i]! % CODE_CHARS.length];
  }
  return code;
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? request.headers.get('x-real-ip') ?? 'unknown';
  const allowed = await checkTvCodeRateLimit(ip);
  if (!allowed) {
    return NextResponse.json(
      { error: 'Aguarde um momento antes de gerar um novo código.' },
      { status: 429 }
    );
  }

  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + CODE_EXPIRES_MINUTES);

  let code = generateCode();
  let attempts = 0;
  const maxAttempts = 10;
  while (attempts < maxAttempts) {
    const existing = await prisma.tvAuthCode.findUnique({ where: { code } });
    if (!existing || existing.expiresAt < new Date()) break;
    code = generateCode();
    attempts++;
  }

  await prisma.tvAuthCode.create({
    data: { code, expiresAt },
  });
  await incrementTvCodeRateLimit(ip);

  const res = NextResponse.json({
    code,
    codeFormatted: `${code.slice(0, 3)}-${code.slice(3)}`,
    expiresAt: expiresAt.toISOString(),
  });
  res.headers.set('Access-Control-Allow-Origin', '*');
  return res;
}
