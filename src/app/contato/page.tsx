import Link from 'next/link';
import { prisma } from '@/lib/db';

async function getSiteSettings() {
  try {
    const row = await prisma.siteSettings.findFirst({ orderBy: { updatedAt: 'desc' } });
    return row ?? null;
  } catch {
    return null;
  }
}

export const metadata = {
  title: 'Contato | Fly Games',
  description: 'Entre em contato com o Fly Games.',
};

export default async function ContatoPage() {
  const settings = await getSiteSettings();
  const supportEmail = settings?.supportEmail ?? 'contato@flygames.app';
  const whatsappNumber = settings?.whatsappNumber ?? '5511999999999';
  const digits = whatsappNumber.replace(/\D/g, '').slice(-11);
  const whatsappDisplay = digits.length >= 10
    ? digits.replace(/^(\d{2})(\d)(\d{4})(\d{4})$/, '($1) $2 $3-$4')
    : whatsappNumber;

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 lg:px-12 bg-futvar-darker">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-4">Contato</h1>
        <p className="text-futvar-light mb-8">
          Entre em contato conosco por e-mail ou WhatsApp. Estamos à disposição para dúvidas, sugestões e parcerias.
        </p>

        <div className="space-y-4 text-futvar-light">
          <p>
            <strong className="text-white">E-mail:</strong>{' '}
            <a href={`mailto:${supportEmail}`} className="text-futvar-green hover:underline">
              {supportEmail}
            </a>
          </p>
          <p>
            <strong className="text-white">WhatsApp:</strong>{' '}
            <a
              href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent('Olá, vim do site Fly Games e gostaria de mais informações.')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-futvar-green hover:underline"
            >
              {whatsappDisplay}
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
