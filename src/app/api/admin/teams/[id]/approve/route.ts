import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { randomBytes } from 'crypto';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { sendEmailToMany } from '@/lib/email/emailService';
import { hashPassword } from '@/lib/auth';

/** Gera senha temporária (12 caracteres alfanuméricos). */
function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let s = '';
  const bytes = randomBytes(12);
  for (let i = 0; i < 12; i++) s += chars[bytes[i]! % chars.length];
  return s;
}

/** Aprova o time, cria conta de acesso (usuário/senha) e envia e-mail. Link por token continua disponível. */
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

    let baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      (await prisma.emailSettings.findFirst({ orderBy: { updatedAt: 'desc' } }).then((s) => s?.appBaseUrl)) ||
      'https://flygames.app';
    // Em produção, links de e-mail devem usar sempre o domínio canônico
    if (/portal-flygames\.vercel\.app|\.vercel\.app$/i.test(baseUrl)) baseUrl = 'https://flygames.app';
    baseUrl = baseUrl.replace(/\/$/, '');
    const loginUrl = `${baseUrl}/entrar`;
    const accessLinkUrl = `${baseUrl}/api/team-portal/access?token=${panelAccessToken}`;

    const responsibleEmail = team.responsibleEmail?.trim().toLowerCase();
    let tempPasswordForEmail: string | null = null;

    if (responsibleEmail) {
      tempPasswordForEmail = generateTempPassword();
      const passwordHash = await hashPassword(tempPasswordForEmail);
      const name = team.responsibleName?.trim() || team.name;

      const user = await prisma.user.upsert({
        where: { email: responsibleEmail },
        update: {
          passwordHash,
          name: name || undefined,
          emailVerified: true,
          mustChangePassword: true,
        },
        create: {
          email: responsibleEmail,
          name: name || null,
          passwordHash,
          role: 'user',
          emailVerified: true,
          mustChangePassword: true,
        },
      });

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

    const managers = await prisma.teamManager.findMany({
      where: { teamId: id },
      include: { user: { select: { email: true } } },
    });
    const managerEmails = managers.map((m) => m.user.email).filter(Boolean) as string[];
    const emails = Array.from(new Set([...(responsibleEmail ? [responsibleEmail] : []), ...managerEmails]));

    const subject = 'Seu time foi aprovado – Fly Games';
    const baseHtml = (loginBlock: string) => `
      <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto;">
        <h2 style="color: #0C1222;">Time aprovado</h2>
        <p>Olá,</p>
        <p>O cadastro do time <strong>${team.name}</strong> foi aprovado.</p>
        <p>Agora você pode acessar o painel do time para:</p>
        <ul>
          <li>Ver comissões (assinantes e patrocinadores)</li>
          <li>Gerenciar o elenco (jogadores e comissão técnica)</li>
        </ul>
        ${loginBlock}
        <p>Atenciosamente,<br/>Fly Games</p>
      </div>
    `;

    const emailsWithPassword = responsibleEmail && tempPasswordForEmail ? [responsibleEmail] : [];
    const emailsLinkOnly = emails.filter((e) => e !== responsibleEmail);

    if (emailsWithPassword.length > 0) {
      const loginBlock = `
        <p><strong>Acesse o painel com seu e-mail e a senha abaixo.</strong> No primeiro acesso você deverá criar uma nova senha.</p>
        <p style="margin: 16px 0;">
          <strong>E-mail:</strong> ${responsibleEmail}<br/>
          <strong>Senha temporária:</strong> <code style="background: #f1f5f9; padding: 4px 8px; border-radius: 4px;">${tempPasswordForEmail}</code>
        </p>
        <p>
          <a href="${loginUrl}" style="display: inline-block; padding: 12px 24px; background: #22C55E; color: #0C1222; text-decoration: none; font-weight: bold; border-radius: 8px;">Entrar no site e acessar o painel</a>
        </p>
        <p style="color: #64748b; font-size: 14px;">Ou use este link direto ao painel (válido por 1 ano): <a href="${accessLinkUrl}">${accessLinkUrl}</a></p>
      `;
      await sendEmailToMany(emailsWithPassword, subject, baseHtml(loginBlock));
    }
    if (emailsLinkOnly.length > 0) {
      const loginBlock = `
        <p><strong>Use o link abaixo para acessar o painel.</strong> Este link é exclusivo e válido por 1 ano.</p>
        <p>
          <a href="${accessLinkUrl}" style="display: inline-block; padding: 12px 24px; background: #22C55E; color: #0C1222; text-decoration: none; font-weight: bold; border-radius: 8px;">Acessar painel do time</a>
        </p>
        <p style="color: #64748b; font-size: 14px;">Ou copie e cole no navegador: ${accessLinkUrl}</p>
      `;
      await sendEmailToMany(emailsLinkOnly, subject, baseHtml(loginBlock));
    }

    revalidatePath('/');
    revalidatePath('/admin/times');
    return NextResponse.json({
      ok: true,
      emailSent: emailsWithPassword.length > 0 || emailsLinkOnly.length > 0,
    });
  } catch (e) {
    console.error('POST /api/admin/teams/[id]/approve', e);
    return NextResponse.json({ error: 'Erro ao aprovar time' }, { status: 500 });
  }
}
