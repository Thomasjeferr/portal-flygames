import Link from 'next/link';

export const metadata = {
  title: 'Obrigado | Patrocínio Fly Games',
  description: 'Seu patrocínio foi confirmado.',
};

export default function PatrocinarObrigadoPage() {
  return (
    <div className="pt-20 sm:pt-24 pb-16 px-4 min-h-screen bg-futvar-darker flex flex-col items-center justify-center">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-bold text-white mb-2">Obrigado pelo seu patrocínio!</h1>
        <p className="text-futvar-light mb-6">
          Seu pagamento foi confirmado. Sua marca em breve estará visível na nossa plataforma.
        </p>
        <Link
          href="/patrocinar"
          className="inline-block px-6 py-3 rounded bg-futvar-green text-futvar-darker font-bold hover:bg-futvar-green-light"
        >
          Voltar aos planos
        </Link>
        <p className="mt-6">
          <Link href="/" className="text-futvar-green hover:underline text-sm">
            Ir para a página inicial
          </Link>
        </p>
      </div>
    </div>
  );
}
