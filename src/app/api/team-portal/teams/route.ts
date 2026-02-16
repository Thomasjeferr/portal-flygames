import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { uniqueSlug } from '@/lib/slug';
import { teamCreateSchema } from '@/lib/validators/teamSchema';
import { sendEmailToMany } from '@/lib/email/emailService';
import { cookies } from 'next/headers';

const TEAM_PANEL_COOKIE = 'team_panel_token';

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

/** Lista times: por sessão (TeamManager) ou por cookie de acesso (token enviado por e-mail). */
export async function GET(_req: NextRequest) {
  const session = await getSession();

  if (session) {
    const managers = await prisma.teamManager.findMany({
      where: { userId: session.userId },
      include: { team: true },
      orderBy: { createdAt: 'desc' },
    });
    const teams = managers.map((m) => teamToItem(m.team, m.role));
    return NextResponse.json(teams);
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(TEAM_PANEL_COOKIE)?.value;
  if (!token) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const team = await prisma.team.findFirst({
    where: {
      panelAccessToken: token,
      panelTokenExpiresAt: { gt: new Date() },
      approvalStatus: 'approved',
    },
  });
  if (!team) return NextResponse.json({ error: 'Link de acesso inválido ou expirado' }, { status: 401 });

  return NextResponse.json([teamToItem(team)]);
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

/** Cria time pendente (público – não exige login). Acesso ao painel é enviado por e-mail após aprovação. */
export async function POST(request: NextRequest) {
  const session = await getSession();

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
        responsibleName: d.responsibleName?.trim() || null,
        responsibleEmail: d.responsibleEmail?.trim() || null,
        instagram: d.instagram?.trim() || null,
        whatsapp: d.whatsapp?.replace(/\D/g, '') || null,
        description: d.description?.trim() || null,
        isActive: false,
        approvalStatus: 'pending',
      },
    });

    if (session) {
      await prisma.teamManager.create({
        data: { userId: session.userId, teamId: team.id, role: 'OWNER' },
      });
    }

    const emailTo = (d.responsibleEmail?.trim() || '').length > 0
      ? [d.responsibleEmail!.trim()]
      : session
        ? await prisma.user.findUnique({ where: { id: session.userId }, select: { email: true } }).then((u) => (u?.email ? [u.email] : []))
        : [];
    if (emailTo.length > 0) {
      try {
        const subject = 'Cadastro do time recebido – Fly Games';
        const html = `
          <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto;">
            <h2 style="color: #0C1222;">Cadastro recebido</h2>
            <p>Olá${d.responsibleName?.trim() ? `, ${d.responsibleName.trim()}` : ''},</p>
            <p>Recebemos os dados do time <strong>${team.name}</strong>. Seu cadastro será analisado pela nossa equipe.</p>
            <p>Quando o time for aprovado, você receberá um e-mail com um <strong>link de acesso exclusivo</strong> ao painel do clube (comissões e elenco).</p>
            <p>Atenciosamente,<br/>Fly Games</p>
          </div>
        `;
        await sendEmailToMany(emailTo, subject, html);
      } catch (err) {
        console.error('Erro ao enviar e-mail de confirmação de cadastro', err);
      }
    }

    return NextResponse.json(team, { status: 201 });
  } catch (e) {
    console.error('POST /api/team-portal/teams', e);
    const message = getErrorMessage(e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

