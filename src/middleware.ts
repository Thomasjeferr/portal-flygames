import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const adminPaths = ['/admin'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get('portal_session')?.value;

  const isAdminPath = adminPaths.some((p) => pathname.startsWith(p));
  const isAdminLoginPage = pathname === '/admin/entrar' || pathname.startsWith('/admin/entrar/');

  // Admin: exige sessão exceto na página de login
  if (isAdminPath && !sessionCookie && !isAdminLoginPage) {
    return NextResponse.redirect(new URL('/admin/entrar', request.url));
  }

  // Página de manutenção: deixar passar (sem cookie, é acesso direto)
  if (pathname === '/manutencao') {
    const res = NextResponse.next();
    res.cookies.delete('x-maintenance-view');
    return res;
  }

  // Quem acessa com ?app=1 (app das lojas) sempre vê o site normal
  if (request.nextUrl.searchParams.get('app') === '1') {
    const res = NextResponse.next();
    res.cookies.delete('x-maintenance-view');
    return res;
  }

  // Verificar se "Site em desenvolvimento" está ligado (Configurações no admin)
  try {
    const origin = request.nextUrl.origin;
    const res = await fetch(`${origin}/api/public/maintenance-mode`, {
      headers: { 'Accept': 'application/json' },
    });
    const data = await res.json();
    if (data?.enabled) {
      // Admin: sempre liberado durante manutenção (para você desativar e acessar o site)
      if (isAdminPath) {
        const res = NextResponse.next();
        res.cookies.delete('x-maintenance-view');
        return res;
      }
      // Durante manutenção, permitir leitura das páginas Legal (rodapé)
      const allowedDuringMaintenance = [
        '/politica-de-privacidade',
        '/termos-de-uso',
        '/contato',
        '/sobre-o-projeto',
        '/sobre-nos',
        '/contrato-direitos-imagem',
        '/suporte',
      ];
      // Legal: deixar passar mas manter o cookie para continuar sem menu/rodapé
      if (allowedDuringMaintenance.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
        return NextResponse.next();
      }
      const res = NextResponse.rewrite(new URL('/manutencao', request.url));
      res.cookies.set('x-maintenance-view', '1', { path: '/', maxAge: 300, httpOnly: false });
      return res;
    }
  } catch {
    // Em caso de erro, deixa passar
  }

  const res = NextResponse.next();
  res.cookies.delete('x-maintenance-view');
  return res;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|uploads).*)'],
};
