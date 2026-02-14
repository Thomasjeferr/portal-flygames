import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const adminPaths = ['/admin'];
const authPaths = ['/entrar', '/cadastro', '/recuperar-senha'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get('portal_session')?.value;

  const isAdminPath = adminPaths.some((p) => pathname.startsWith(p));
  const isAdminLoginPage = pathname === '/admin/entrar' || pathname.startsWith('/admin/entrar/');

  // Não exige sessão na página de login do admin (evita loop de redirect)
  if (isAdminPath && !sessionCookie && !isAdminLoginPage) {
    return NextResponse.redirect(new URL('/admin/entrar', request.url));
  }

  if (pathname === '/admin' || pathname === '/admin/') {
    return NextResponse.redirect(new URL('/admin/jogos', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
