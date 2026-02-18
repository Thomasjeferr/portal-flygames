import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { randomBytes } from 'crypto';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { sendEmailToMany } from '@/lib/email/emailService';

/** Aprova o time, gera link de acesso e envia e-mail aos responsáveis (link exclusivo, sem vínculo com login do site). */
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
    if (team.approvalStatus === 'approved') {
      return NextResponse.json({ error: 'Time já está aprovado' }, { status: 400 });
    }

    const panelAccessToken = randomBytes(32).toString('hex');
    const panelTokenExpiresAt = new Date();
    panelTokenExpiresAt.setFullYear(panelTokenExpiresAt.getFullYear() + 1);

    await prisma.team.update({
      where: { id },
      data: {
        approvalStatus: 'approved',
        isActive: true,
        panelAccessToken,
        panelTokenExpiresAt,
      },
    });

    const managers = await prisma.teamManager.findMany({
      where: { teamId: id },
      include: { user: { select: { email: true } } },
    });
    const managerEmails = managers.map((m) => m.user.email).filter(Boolean) as string[];
    const responsibleEmail = team.responsibleEmail?.trim();
    const emails = Array.from(new Set([...managerEmails, ...(responsibleEmail ? [responsibleEmail] : [])]));

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      (await prisma.emailSettings.findFirst({ orderBy: { updatedAt: 'desc' } }).then((s) => s?.appBaseUrl)) ||
      'http://localhost:3000';
    const accessUrl = `${baseUrl.replace(/\/$/, '')}/painel-time/acesso?token=${panelAccessToken}`;

    if (emails.length > 0) {
      const subject = 'Seu time foi aprovado – Fly Games';
      const html = `
        <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto;">
          <h2 style="color: #0C1222;">Time aprovado</h2>
          <p>Olá,</p>
          <p>O cadastro do time <strong>${team.name}</strong> foi aprovado.</p>
          <p>Agora você pode acessar o painel do time para:</p>
          <ul>
            <li>Ver comissões (assinantes e patrocinadores)</li>
            <li>Gerenciar o elenco (jogadores e comissão técnica)</li>
          </ul>
          <p><strong>Use o link abaixo para acessar o painel.</strong> Este link é exclusivo e válido por 1 ano. Guarde-o com segurança.</p>
          <p>
            <a href="${accessUrl}" style="display: inline-block; padding: 12px 24px; background: #22C55E; color: #0C1222; text-decoration: none; font-weight: bold; border-radius: 8px;">Acessar painel do time</a>
          </p>
          <p style="color: #64748b; font-size: 14px;">Ou copie e cole no navegador: ${accessUrl}</p>
          <p>Atenciosamente,<br/>Fly Games</p>
        </div>
      `;
      await sendEmailToMany(emails, subject, html);
    }

    revalidatePath('/');
    revalidatePath('/admin/times');
    return NextResponse.json({ ok: true, emailSent: emails.length > 0 });
  } catch (e) {
    console.error('POST /api/admin/teams/[id]/approve', e);
    return NextResponse.json({ error: 'Erro ao aprovar time' }, { status: 500 });
  }
}
