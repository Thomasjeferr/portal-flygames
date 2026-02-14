import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

const schema = z.object({ email: z.string().email('E-mail inválido') });

// Em produção, envie e-mail com o link. Aqui retornamos o token para testes.
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? 'E-mail inválido' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    if (!user) {
      return NextResponse.json(
        { message: 'Se o e-mail existir, você receberá o link de recuperação.' },
        { status: 200 }
      );
    }

    const resetToken = uuidv4();
    const resetExpires = new Date();
    resetExpires.setHours(resetExpires.getHours() + 1);

    await prisma.user.update({
      where: { id: user.id },
      data: { resetToken, resetExpires },
    });

    const resetLink = `${BASE_URL}/recuperar-senha?token=${resetToken}`;
    // TODO: enviar e-mail com resetLink (ex: Resend, SendGrid, Nodemailer)
    console.log('Link de recuperação (dev):', resetLink);

    return NextResponse.json({
      message: 'Se o e-mail existir, você receberá o link de recuperação.',
      devResetLink: process.env.NODE_ENV === 'development' ? resetLink : undefined,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Erro ao processar' }, { status: 500 });
  }
}
