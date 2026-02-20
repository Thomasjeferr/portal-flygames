import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { sendEmailToMany } from '@/lib/email/emailService';

/** Aprova o time. O responsável já tem conta (cadastrou com e-mail verificado). Acesso ao painel apenas por login. */
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

    await prisma.team.update({
      where: { id },
      data: {
        approvalStatus: 'approved',
        isActive: true,
      },
    });

    const existingManagers = await prisma.teamManager.findMany({
      where: { teamId: id },
      include: { user: { select: { email: true } } },
    });

    const responsibleEmail = team.responsibleEmail?.trim().toLowerCase();
    if (responsibleEmail && existingManagers.length === 0) {
      const user = await prisma.user.findUnique({
        where: { email: responsibleEmail },
        select: { id: true },
      });
      if (user) {
        await prisma.teamManager.upsert({
          where: {
            userId_teamId: { userId: user.id, teamId: id },
          },
          update: {},
          create: {
            userId: user.id,
            teamId: id,
            role: 'OWNER',
          },
        });
      }
    }

    const managers = await prisma.teamManager.findMany({
      where: { teamId: id },
      include: { user: { select: { email: true } } },
    });
    const managerEmails = managers.map((m) => m.user.email).filter(Boolean) as string[];
    const emails = Array.from(
      new Set([...(responsibleEmail ? [responsibleEmail] : []), ...managerEmails])
    );

    let baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      (await prisma.emailSettings.findFirst({ orderBy: { updatedAt: 'desc' } }).then((s) => s?.appBaseUrl)) ||
      'https://flygames.app';
    if (/portal-flygames\.vercel\.app|\.vercel\.app$/i.test(baseUrl)) baseUrl = 'https://flygames.app';
    baseUrl = baseUrl.replace(/\/$/, '');
    const loginUrl = `${baseUrl}/entrar`;

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
          <p><strong>Entre no site com sua conta</strong> e acesse a <strong>Área do time</strong> para gerenciar.</p>
          <p>
            <a href="${loginUrl}" style="display: inline-block; padding: 12px 24px; background: #22C55E; color: #0C1222; text-decoration: none; font-weight: bold; border-radius: 8px;">Entrar e acessar o painel do time</a>
          </p>
          <p>Atenciosamente,<br/>Fly Games</p>
        </div>
      `;
      await sendEmailToMany(emails, subject, html);
    }

    revalidatePath('/');
    revalidatePath('/admin/times');
    return NextResponse.json({
      ok: true,
      emailSent: emails.length > 0,
    });
  } catch (e) {
    console.error('POST /api/admin/teams/[id]/approve', e);
    return NextResponse.json({ error: 'Erro ao aprovar time' }, { status: 500 });
  }
}
