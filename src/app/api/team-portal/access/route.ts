import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/team-portal/access?token=xxx
 * Acesso ao painel é apenas por login. Redireciona para a página de entrar com redirect ao painel.
 */
export async function GET(request: NextRequest) {
  const baseUrl = request.nextUrl.origin;
  const redirectUrl = new URL('/entrar', baseUrl);
  redirectUrl.searchParams.set('redirect', '/painel-time');
  return NextResponse.redirect(redirectUrl);
}
