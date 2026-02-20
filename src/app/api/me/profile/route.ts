import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { sendTransactionalEmail } from '@/lib/email/emailService';
import {
  generateVerificationCode,
  hashToken,
  getVerificationCodeExpiryDate,
} from '@/lib/email/tokenUtils';

const schema = z.object({
  name: z.string().max(200).optional(),
  email: z.string().email('E-mail inválido').optional(),
  avatarUrl: z.string().max(2000).optional().nullable(),
});

export async function PATCH(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? 'Dados inválidos' },
      { status: 400 }
    );
  }

  const { name, email, avatarUrl } = parsed.data;
  if (name === undefined && email === undefined && avatarUrl === undefined) {
    return NextResponse.json({ error: 'Envie name, email ou avatarUrl para atualizar.' }, { status: 400 });
  }

  const current = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, email: true, name: true, emailVerified: true },
  });
  if (!current) {
    return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 });
  }

  const updateData: { name?: string | null; email?: string; emailVerified?: boolean; avatarUrl?: string | null } = {};
  if (name !== undefined) updateData.name = name.trim() || null;
  if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl === null || avatarUrl === '' ? null : avatarUrl;
  if (email !== undefined) {
    const newEmail = email.trim().toLowerCase();
    if (newEmail !== current.email) {
      const existing = await prisma.user.findUnique({ where: { email: newEmail } });
      if (existing) {
        return NextResponse.json({ error: 'Este e-mail já está em uso por outra conta.' }, { status: 400 });
      }
      updateData.email = newEmail;
      updateData.emailVerified = false;
    }
  }

  const user = await prisma.user.update({
    where: { id: session.userId },
    data: updateData,
    select: { id: true, email: true, name: true, emailVerified: true, avatarUrl: true },
  });

  if (updateData.email && updateData.email === user.email) {
    const code = generateVerificationCode();
    const tokenHash = hashToken(code);
    const expiresAt = getVerificationCodeExpiryDate();
    await prisma.emailToken.create({
      data: {
        userId: user.id,
        type: 'VERIFY_EMAIL',
        tokenHash,
        expiresAt,
      },
    });
    await sendTransactionalEmail({
      to: user.email,
      templateKey: 'VERIFY_EMAIL',
      vars: {
        name: user.name || user.email.split('@')[0],
        code,
        expires_in: '15',
      },
      userId: user.id,
    }).catch((e) => console.error('[Email] VERIFY_EMAIL após alteração:', e));
  }

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      emailVerified: user.emailVerified,
      avatarUrl: user.avatarUrl,
    },
    message: updateData.email
      ? 'Dados atualizados. Enviamos um código de verificação para seu novo e-mail.'
      : 'Dados atualizados.',
  });
}
