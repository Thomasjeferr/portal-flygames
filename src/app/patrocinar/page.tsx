import Link from 'next/link';
import { prisma } from '@/lib/db';

export const metadata = {
  title: 'Apoie o Futebol da Sua Cidade',
  description: 'Dê visibilidade para a sua marca e fortaleça o clube local. Conheça nossos planos de patrocínio.',
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

        <div className="text-center mb-12">
          <h1 className="text-3xl lg:text-4xl font-bold text-white mb-3">
            Apoie o Futebol da Sua Cidade
          </h1>
          <p className="text-futvar-light text-lg max-w-2xl mx-auto">
            Dê visibilidade para a sua marca e fortaleça o clube local.
          </p>
        </div>

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
            {plans.map((plan, index) => {
              const isDestaque = index === Math.floor(plans.length / 2);
              const teamPercent = plan.teamPayoutPercent ?? 0;
              return (
                <div
                  key={plan.id}
                  className={`rounded-2xl p-6 flex flex-col transition-all ${
                    isDestaque
                      ? 'bg-futvar-dark/90 border-2 border-futvar-green shadow-[0_0_35px_rgba(34,197,94,0.35)] scale-[1.02]'
                      : 'bg-futvar-dark border border-futvar-green/20 hover:border-futvar-green/40 hover:shadow-[0_0_20px_rgba(34,197,94,0.25)]'
                  }`}
                >
                  <h2 className="text-xl font-bold text-white mb-1">{plan.name}</h2>
                  <p className="text-2xl font-bold text-futvar-green mb-2">
                    {formatPrice(plan.price)}
                    <span className="text-sm font-normal text-futvar-light ml-1">
                      /{BILLING_LABEL[plan.billingPeriod] ?? plan.billingPeriod}
                    </span>
                  </p>
                  {teamPercent > 0 && (
                    <p className="text-futvar-green/90 text-sm font-medium mb-3">
                      {teamPercent}% do valor repassado ao clube
                    </p>
                  )}
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
                    className={`block w-full text-center px-6 py-3 font-bold rounded-lg transition-colors ${
                      isDestaque
                        ? 'bg-futvar-green text-futvar-darker hover:bg-futvar-green-light'
                        : 'border border-futvar-green/60 text-futvar-green hover:bg-futvar-green/10'
                    }`}
                  >
                    Patrocinar Time
                  </Link>
                </div>
              );
            })}
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
