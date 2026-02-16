import Link from 'next/link';
import { prisma } from '@/lib/db';

export const metadata = {
  title: 'Seja um Patrocinador.',
  description: 'Conheça nossos planos de patrocínio e apoie seu time de coração. Ganhe visibilidade para sua marca.',
};

const BILLING_LABEL: Record<string, string> = {
  monthly: 'mensal',
  quarterly: 'trimestral',
  yearly: 'anual',
};

function formatPrice(n: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(n);
}

async function getPlans() {
  try {
    const plans = await prisma.sponsorPlan.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
    return plans.map((p) => ({
      ...p,
      benefits: typeof p.benefits === 'string' ? JSON.parse(p.benefits || '[]') : p.benefits,
    }));
  } catch {
    return [];
  }
}

async function getWhatsAppNumber() {
  try {
    const row = await prisma.siteSettings.findFirst({ orderBy: { updatedAt: 'desc' } });
    return row?.whatsappNumber ?? null;
  } catch {
    return null;
  }
}

export default async function PatrocinarPage() {
  const [plans, whatsappNumber] = await Promise.all([getPlans(), getWhatsAppNumber()]);
  const waLink = whatsappNumber
    ? `https://wa.me/${whatsappNumber.replace(/\D/g, '')}?text=${encodeURIComponent(
        'Olá! Tenho interesse em ser patrocinador do Fly Games. Gostaria de saber mais sobre os planos disponíveis.'
      )}`
    : null;

  return (
    <div className="pt-20 sm:pt-24 pb-16 px-4 sm:px-6 lg:px-12 min-h-screen bg-futvar-darker">
      <div className="max-w-4xl mx-auto">
        <div className="mb-10">
          <Link
            href="/"
            className="text-futvar-green hover:text-futvar-green-light text-sm font-semibold inline-flex items-center gap-2 transition-colors"
          >
            ← Voltar ao início
          </Link>
        </div>

        <div className="flex items-center gap-3 mb-10 animate-fade-in-up opacity-0 [animation-delay:0.1s]">
          <span className="w-1 h-8 rounded-full bg-futvar-gold" />
          <h1 className="text-3xl lg:text-4xl font-bold text-white">Seja um Patrocinador</h1>
        </div>

        <p className="text-futvar-light text-lg mb-12 max-w-2xl">
          Apoie seu time de coração e ganhe visibilidade para sua marca. Conheça nossos planos de patrocínio e escolha o que
          melhor se encaixa para você.
        </p>

        {plans.length === 0 ? (
          <div className="bg-futvar-dark border border-futvar-green/20 rounded-2xl p-12 text-center">
            <p className="text-futvar-light mb-6">
              Em breve teremos planos de patrocínio disponíveis. Entre em contato para saber mais.
            </p>
            {waLink ? (
              <a
                href={waLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-8 py-4 bg-futvar-green text-futvar-darker font-bold rounded-lg hover:bg-futvar-green-light transition-colors"
              >
                Falar no WhatsApp
              </a>
            ) : (
              <Link
                href="/#contato"
                className="inline-block px-8 py-4 bg-futvar-green text-futvar-darker font-bold rounded-lg hover:bg-futvar-green-light transition-colors"
              >
                Entre em contato
              </Link>
            )}
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className="bg-futvar-dark border border-futvar-green/20 rounded-2xl p-6 flex flex-col"
              >
                <h2 className="text-xl font-bold text-white mb-1">{plan.name}</h2>
                <p className="text-2xl font-bold text-futvar-green mb-4">
                  {formatPrice(plan.price)}
                  <span className="text-sm font-normal text-futvar-light ml-1">
                    /{BILLING_LABEL[plan.billingPeriod] ?? plan.billingPeriod}
                  </span>
                </p>
                {Array.isArray(plan.benefits) && plan.benefits.length > 0 && (
                  <ul className="space-y-2 mb-6 flex-1">
                    {plan.benefits.map((b, i) => (
                      <li key={i} className="text-futvar-light text-sm flex items-start gap-2">
                        <span className="text-futvar-green mt-0.5">✓</span>
                        {b}
                      </li>
                    ))}
                  </ul>
                )}
                <Link
                  href={`/patrocinar/comprar?planId=${plan.id}`}
                  className="block w-full text-center px-6 py-3 bg-futvar-green text-futvar-darker font-bold rounded-lg hover:bg-futvar-green-light transition-colors"
                >
                  Quero patrocinar
                </Link>
              </div>
            ))}
          </div>
        )}

        {plans.length > 0 && (
          <p className="mt-10 text-futvar-light text-sm text-center">
            Dúvidas?{' '}
            {waLink ? (
              <a href={waLink} target="_blank" rel="noopener noreferrer" className="text-futvar-green hover:underline">
                Fale conosco no WhatsApp
              </a>
            ) : (
              <Link href="/#contato" className="text-futvar-green hover:underline">
                Entre em contato
              </Link>
            )}
          </p>
        )}
      </div>
    </div>
  );
}
