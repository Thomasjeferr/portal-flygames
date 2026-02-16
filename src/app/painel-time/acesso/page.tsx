import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';
import { TEAM_PANEL_COOKIE } from '@/lib/team-portal-auth';

const COOKIE_MAX_AGE = 365 * 24 * 60 * 60; // 1 ano em segundos

export default async function PainelTimeAcessoPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  if (!token?.trim()) {
    return (
      <div className="pt-20 sm:pt-24 pb-16 px-4 min-h-screen bg-futvar-darker flex items-center justify-center">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-bold text-white mb-2">Link inválido</h1>
          <p className="text-futvar-light">
            O link de acesso ao painel do time não foi informado. Use o link que você recebeu por e-mail.
          </p>
        </div>
      </div>
    );
  }

  const team = await prisma.team.findFirst({
    where: {
      panelAccessToken: token.trim(),
      panelTokenExpiresAt: { gt: new Date() },
      approvalStatus: 'approved',
    },
    select: { id: true, name: true },
  });

  if (!team) {
    return (
      <div className="pt-20 sm:pt-24 pb-16 px-4 min-h-screen bg-futvar-darker flex items-center justify-center">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-bold text-white mb-2">Link inválido ou expirado</h1>
          <p className="text-futvar-light">
            Este link de acesso ao painel não é válido ou já expirou. Entre em contato conosco se precisar de um novo link.
          </p>
        </div>
      </div>
    );
  }

  const cookieStore = await cookies();
  cookieStore.set(TEAM_PANEL_COOKIE, token.trim(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  });

  redirect('/painel-time');
}
