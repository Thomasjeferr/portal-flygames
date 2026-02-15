import Link from 'next/link';

export default function SuportePage() {
  return (
    <div className="min-h-screen pt-24 pb-16 px-4 lg:px-12 bg-futvar-darker">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-4">Suporte</h1>
        <p className="text-futvar-light mb-8">
          Entre em contato conosco para tirar dúvidas ou reportar problemas.
        </p>
        <div className="space-y-4 text-futvar-light">
          <p>
            <strong className="text-white">E-mail:</strong>{' '}
            <a href="mailto:contato@flygames.com.br" className="text-futvar-green hover:underline">
              contato@flygames.com.br
            </a>
          </p>
          <p>
            <strong className="text-white">WhatsApp:</strong>{' '}
            <a
              href="https://wa.me/5511999999999"
              target="_blank"
              rel="noopener noreferrer"
              className="text-futvar-green hover:underline"
            >
              (11) 99999-9999
            </a>
          </p>
        </div>
        <p className="mt-10 text-futvar-light text-sm">
          <Link href="/" className="text-futvar-green hover:underline">
            Voltar ao início
          </Link>
        </p>
      </div>
    </div>
  );
}
