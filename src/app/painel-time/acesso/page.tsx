/**
 * Página de acesso ao painel do time.
 * O link do e-mail aponta para /api/team-portal/access?token=xxx (Route Handler que seta o cookie e redireciona).
 * Esta página só exibe mensagens quando alguém abre /painel-time/acesso sem token ou com ?error=invalid.
 */
export default async function PainelTimeAcessoPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const params = await searchParams;
  const error = params.error;
  const hasToken = !!params.token?.trim();

  if (hasToken) {
    // Token na URL: redireciona para o Route Handler que seta o cookie e redireciona (evita cookies().set() em Server Component).
    const { redirect } = await import('next/navigation');
    redirect(`/api/team-portal/access?token=${encodeURIComponent(params.token!.trim())}`);
  }

  const isInvalid = error === 'invalid' || error === 'missing';

  return (
    <div className="pt-20 sm:pt-24 pb-16 px-4 min-h-screen bg-futvar-darker flex items-center justify-center">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-bold text-white mb-2">
          {isInvalid ? 'Link inválido ou expirado' : 'Link inválido'}
        </h1>
        <p className="text-futvar-light">
          {isInvalid
            ? 'Este link de acesso ao painel não é válido ou já expirou. Entre em contato conosco se precisar de um novo link.'
            : 'O link de acesso ao painel do time não foi informado. Use o link que você recebeu por e-mail.'}
        </p>
      </div>
    </div>
  );
}
