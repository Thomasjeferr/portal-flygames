import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { sendEmailToMany } from '@/lib/email/emailService';

const bodySchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected', 'blocked']),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
  }

  const { id } = await params;

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });
  }

  const partner = await prisma.partner.findUnique({
    where: { id },
    include: { user: { select: { email: true, name: true } } },
  });
  if (!partner) {
    return NextResponse.json({ error: 'Parceiro não encontrado' }, { status: 404 });
  }

  await prisma.partner.update({
    where: { id },
    data: { status: parsed.data.status },
  });

  if (parsed.data.status === 'approved' && partner.user?.email) {
    const toEmail = partner.user.email;
    const subject = 'Seu pedido de parceria foi aceito – Fly Games';
    const html = `
      <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto;">
        <h2 style="color: #0C1222;">Parceria aprovada</h2>
        <p>Olá${partner.user.name ? `, ${partner.user.name}` : ''},</p>
        <p>Seu pedido de parceria foi <strong>aprovado</strong>.</p>
        <p>Seu código de parceiro é: <strong>${partner.refCode}</strong></p>
        <p>Use este código para indicar assinantes, jogos e patrocinadores. Você receberá comissão sobre cada venda gerada conforme as porcentagens definidas no seu cadastro.</p>
        <p>Em caso de dúvidas, entre em contato conosco.</p>
        <p>Atenciosamente,<br/>Fly Games</p>
      </div>
    `;
    await sendEmailToMany([toEmail], subject, html).catch((e) =>
      console.error('[admin/partners/status] Erro ao enviar e-mail de aprovação:', e)
    );
  }

  return NextResponse.json({ ok: true });
}

