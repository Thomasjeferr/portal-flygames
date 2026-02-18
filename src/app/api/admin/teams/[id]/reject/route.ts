import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { sendEmailToMany } from '@/lib/email/emailService';

/** Rejeita o cadastro do time e opcionalmente envia e-mail aos responsáveis. */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== 'admin')
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });

  const id = (await params).id;

  try {
    const team = await prisma.team.findUnique({ where: { id } });
    if (!team) return NextResponse.json({ error: 'Time não encontrado' }, { status: 404 });

    await prisma.team.update({
      where: { id },
      data: { approvalStatus: 'rejected', isActive: false },
    });

    const managers = await prisma.teamManager.findMany({
      where: { teamId: id },
      include: { user: { select: { email: true } } },
    });
    const managerEmails = managers.map((m) => m.user.email).filter(Boolean) as string[];
    const responsibleEmail = team.responsibleEmail?.trim();
    const emails = Array.from(new Set([...managerEmails, ...(responsibleEmail ? [responsibleEmail] : [])]));

    if (emails.length > 0) {
      const subject = 'Cadastro de time – Fly Games';
      const html = `
        <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto;">
          <h2 style="color: #0C1222;">Cadastro de time</h2>
          <p>Olá,</p>
          <p>Informamos que o cadastro do time <strong>${team.name}</strong> não foi aprovado no momento.</p>
          <p>Em caso de dúvidas, entre em contato conosco.</p>
          <p>Atenciosamente,<br/>Fly Games</p>
        </div>
      `;
      await sendEmailToMany(emails, subject, html);
    }

    revalidatePath('/');
    revalidatePath('/admin/times');
    return NextResponse.json({ ok: true, emailSent: emails.length > 0 });
  } catch (e) {
    console.error('POST /api/admin/teams/[id]/reject', e);
    return NextResponse.json({ error: 'Erro ao rejeitar time' }, { status: 500 });
  }
}
