import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { uniqueSlug } from '@/lib/slug';
import { teamCreateSchema } from '@/lib/validators/teamSchema';
import { sendEmailToMany } from '@/lib/email/emailService';

function teamToItem(team: { id: string; name: string; shortName: string | null; city: string | null; state: string | null; crestUrl: string | null; isActive: boolean; approvalStatus: string }, role?: string) {
  return {
    id: team.id,
    name: team.name,
    shortName: team.shortName,
    city: team.city,
    state: team.state,
    crestUrl: team.crestUrl,
    isActive: team.isActive,
    approvalStatus: team.approvalStatus,
    role: role ?? 'OWNER',
  };
}

/** Lista times do usuário logado (TeamManager). Acesso apenas por login. */
export async function GET(_req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Faça login para acessar o painel do time.' }, { status: 401 });
  }

  const managers = await prisma.teamManager.findMany({
    where: { userId: session.userId },
    include: { team: true },
    orderBy: { createdAt: 'desc' },
  });
  const teams = managers.map((m) => teamToItem(m.team, m.role));
  return NextResponse.json(teams);
}

function getErrorMessage(e: unknown): string {
  if (e && typeof e === 'object' && 'code' in e) {
    const code = (e as { code?: string }).code;
    if (code === 'P2002') return 'Já existe um time com nome semelhante. Tente alterar o nome do time.';
  }
  const msg = e instanceof Error ? e.message : String(e);
  if (msg.includes('no such column') || msg.includes('SQLITE_ERROR') || msg.includes('column'))
    return 'Banco de dados desatualizado. Execute no projeto: npx prisma db push';
  return msg || 'Erro ao cadastrar time';
}

/** Cria time pendente. Exige conta verificada (login + e-mail verificado). Acesso ao painel só após aprovação, via login. */
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { error: 'É preciso estar logado para cadastrar um time. Faça login ou crie uma conta.' },
      { status: 401 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { emailVerified: true, email: true, name: true },
  });
  if (!user) {
    return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 403 });
  }
  if (!user.emailVerified) {
    return NextResponse.json(
      { error: 'Verifique seu e-mail antes de cadastrar um time. Confira sua caixa de entrada (e spam).' },
      { status: 403 }
    );
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: 'Dados enviados inválidos (JSON)' }, { status: 400 });
  }

  const parsed = teamCreateSchema.safeParse({
    ...(typeof raw === 'object' && raw !== null ? raw : {}),
    isActive: false,
  });
  if (!parsed.success) {
    const first = parsed.error.errors[0];
    return NextResponse.json({ error: first?.message ?? 'Dados inválidos' }, { status: 400 });
  }

  const d = parsed.data;

  try {
    const existingSlugs = (await prisma.team.findMany({ select: { slug: true } })).map((t) => t.slug);
    const slug = uniqueSlug(d.name, existingSlugs);

    const team = await prisma.team.create({
      data: {
        name: d.name,
        shortName: d.shortName?.trim() || null,
        slug,
        city: d.city?.trim() || null,
        state: d.state?.trim()?.toUpperCase() || null,
        foundedYear: d.foundedYear ?? null,
        crestUrl: d.crestUrl?.trim() || null,
        responsibleName: (d.responsibleName?.trim() || user.name) || null,
        responsibleEmail: user.email,
        instagram: d.instagram?.trim() || null,
        whatsapp: d.whatsapp?.replace(/\D/g, '') || null,
        description: d.description?.trim() || null,
        isActive: false,
        approvalStatus: 'pending',
      },
    });

    await prisma.teamManager.create({
      data: { userId: session.userId, teamId: team.id, role: 'OWNER' },
    });

    try {
      const subject = 'Cadastro do time recebido – Fly Games';
      const html = `
        <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto;">
          <h2 style="color: #0C1222;">Cadastro recebido</h2>
          <p>Olá${user.name?.trim() ? `, ${user.name.trim()}` : ''},</p>
          <p>Recebemos os dados do time <strong>${team.name}</strong>. Seu cadastro será analisado pela nossa equipe.</p>
          <p>Quando o time for aprovado, você poderá acessar a <strong>Área do time</strong> entrando no site com sua conta (comissões e elenco).</p>
          <p>Atenciosamente,<br/>Fly Games</p>
        </div>
      `;
      await sendEmailToMany([user.email], subject, html);
    } catch (err) {
      console.error('Erro ao enviar e-mail de confirmação de cadastro', err);
    }

    return NextResponse.json(team, { status: 201 });
  } catch (e) {
    console.error('POST /api/team-portal/teams', e);
    const message = getErrorMessage(e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

