import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { hashPassword, verifyPassword } from '@/lib/auth';

const schema = z
  .object({
    newPassword: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
    confirmPassword: z.string(),
    currentPassword: z.string().optional(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, { message: 'As senhas não coincidem', path: ['confirmPassword'] });

/** Altera a senha do usuário logado. Se mustChangePassword, não exige senha atual. */
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? 'Dados inválidos' },
        { status: 400 }
      );
    }

    const { newPassword, currentPassword } = parsed.data;
    const user = await prisma.user.findUnique({ where: { id: session.userId } });
    if (!user) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });

    const isForcedChange = user.mustChangePassword;
    if (!isForcedChange) {
      if (!currentPassword?.trim()) {
        return NextResponse.json({ error: 'Informe a senha atual' }, { status: 400 });
      }
      const valid = await verifyPassword(currentPassword, user.passwordHash);
      if (!valid) {
        return NextResponse.json({ error: 'Senha atual incorreta' }, { status: 400 });
      }
    }

    const passwordHash = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: session.userId },
      data: { passwordHash, mustChangePassword: false },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('POST /api/auth/change-password', e);
    return NextResponse.json({ error: 'Erro ao alterar senha' }, { status: 500 });
  }
}
