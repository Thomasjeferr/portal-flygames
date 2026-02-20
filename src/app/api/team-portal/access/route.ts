import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { TEAM_PANEL_COOKIE } from '@/lib/team-portal-auth';

const COOKIE_MAX_AGE = 365 * 24 * 60 * 60; // 1 ano

/**
 * GET /api/team-portal/access?token=xxx
 * Valida o token de acesso ao painel do time, seta o cookie e redireciona para /painel-time.
 * Usado pelo link do e-mail de aprovação (cookies não podem ser setados em Server Component).
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')?.trim();
  const baseUrl = request.nextUrl.origin;

  if (!token) {
    return NextResponse.redirect(`${baseUrl}/painel-time/acesso?error=missing`);
  }

  const team = await prisma.team.findFirst({
    where: {
      panelAccessToken: token,
      panelTokenExpiresAt: { gt: new Date() },
      approvalStatus: 'approved',
    },
    select: { id: true },
  });

  if (!team) {
    return NextResponse.redirect(`${baseUrl}/painel-time/acesso?error=invalid`);
  }

  const redirectUrl = new URL('/painel-time', baseUrl);
  const res = NextResponse.redirect(redirectUrl);
  res.cookies.set(TEAM_PANEL_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  });
  return res;
}
