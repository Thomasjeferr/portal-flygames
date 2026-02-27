'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState, useRef } from 'react';
import { NaoEncontrouTimeCTA } from '@/components/account/NaoEncontrouTimeCTA';
import { TeamSelectorWithConfirm, type TeamOption } from '@/components/checkout/TeamSelectorWithConfirm';

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

type Plan = {
  id: string;
  name: string;
  price: number;
  billingPeriod: string;
  benefits?: string[];
};

function PatrocinarComprarContent() {
  const searchParams = useSearchParams();
  const planId = searchParams.get('planId');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [plan, setPlan] = useState<Plan | null>(null);
  const [teams, setTeams] = useState<TeamOption[]>([]);
  const [whatsappUrl, setWhatsappUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'form' | 'payment'>('form');
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    companyName: '',
    email: '',
    websiteUrl: '',
    whatsapp: '',
    instagram: '',
    teamId: '',
    logoUrl: '',
  });

  useEffect(() => {
    const redirect = encodeURIComponent(`/patrocinar/comprar?planId=${planId || ''}`);
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((data) => {
        if (!data?.user) {
          window.location.href = `/entrar?redirect=${redirect}`;
          return;
        }
      })
      .catch(() => {
        window.location.href = `/entrar?redirect=${redirect}`;
      });
  }, [planId]);

  // Persiste ref do parceiro na sessão para não perder a indicação
  const refFromUrl = searchParams.get('ref');
  useEffect(() => {
    if (refFromUrl && typeof window !== 'undefined') {
      try {
        sessionStorage.setItem('portal_futvar_partner_ref', refFromUrl);
      } catch {
        // ignorar
      }
    }
  }, [refFromUrl]);

  useEffect(() => {
    if (!planId) {
      setError('Plano não informado');
      setLoading(false);
      return;
    }
    Promise.all([
      fetch('/api/public/sponsor-plans').then((r) => r.json()),
      fetch('/api/public/teams', { cache: 'no-store' }).then((r) => r.json()),
      fetch('/api/public/site-settings').then((r) => r.json()),
    ])
      .then(([plansData, teamsData, settingsData]) => {
        const plans = Array.isArray(plansData) ? plansData : [];
        const p = plans.find((x: { id: string }) => x.id === planId) ?? null;
        setPlan(p);
        setTeams(Array.isArray(teamsData) ? (teamsData as TeamOption[]) : []);
        const wa = settingsData?.whatsappNumber;
        if (wa) {
          const num = String(wa).replace(/\D/g, '');
          setWhatsappUrl(`https://wa.me/${num}`);
        } else {
          setWhatsappUrl(null);
        }
        if (!p) setError('Plano não encontrado');
      })
      .catch(() => setError('Erro ao carregar'))
      .finally(() => setLoading(false));
  }, [planId]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/upload/sponsor-logo', { method: 'POST', body: fd });
    const data = await res.json();
    if (res.ok && data.url) {
      const url = data.url.startsWith('http') ? data.url : (typeof window !== 'undefined' ? window.location.origin : '') + data.url;
      setForm((f) => ({ ...f, logoUrl: url }));
    } else {
      setError(data.error || 'Erro no upload');
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!plan) return;
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/sponsor-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sponsorPlanId: plan.id,
          companyName: form.companyName.trim(),
          email: form.email.trim(),
          websiteUrl: form.websiteUrl.trim() || undefined,
          whatsapp: form.whatsapp.trim() || undefined,
          instagram: form.instagram.trim() || undefined,
          logoUrl: form.logoUrl.trim(),
          teamId: form.teamId || null,
          utmSource: searchParams.get('utm_source') || undefined,
          utmMedium: searchParams.get('utm_medium') || undefined,
          utmCampaign: searchParams.get('utm_campaign') || undefined,
          utmContent: searchParams.get('utm_content') || undefined,
          utmTerm: searchParams.get('utm_term') || undefined,
          refCode: searchParams.get('ref') || (typeof window !== 'undefined' ? sessionStorage.getItem('portal_futvar_partner_ref') : null) || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Erro ao gerar pagamento');
        return;
      }
      if (data.clientSecret) {
        setClientSecret(data.clientSecret);
        setStep('payment');
      } else {
        setError('Pagamento com cartão não disponível.');
      }
    } catch {
      setError('Erro de conexão');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="pt-20 pb-16 px-4 min-h-screen bg-futvar-darker flex items-center justify-center">
        <p className="text-futvar-light">Carregando...</p>
      </div>
    );
  }

  if (error && !plan) {
    return (
      <div className="pt-20 pb-16 px-4 min-h-screen bg-futvar-darker">
        <div className="max-w-lg mx-auto text-center">
          <p className="text-futvar-red mb-4">{error}</p>
          <Link href="/patrocinar" className="text-futvar-green hover:underline">
            Voltar aos planos
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-20 sm:pt-24 pb-16 px-4 sm:px-6 lg:px-12 min-h-screen bg-futvar-darker">
      <div className="max-w-xl mx-auto">
        <div className="mb-8">
          <Link href="/patrocinar" className="text-futvar-green hover:text-futvar-green-light text-sm font-semibold">
            ← Voltar aos planos
          </Link>
        </div>

        {plan && (
          <div className="mb-6 p-4 rounded-lg bg-futvar-dark border border-futvar-green/20">
            <h2 className="text-lg font-bold text-white">{plan.name}</h2>
            <p className="text-futvar-green font-semibold">
              {formatPrice(plan.price)}/{BILLING_LABEL[plan.billingPeriod] ?? plan.billingPeriod}
            </p>
          </div>
        )}

        {step === 'form' && (
          <form onSubmit={handleFormSubmit} className="space-y-4">
            {error && (
              <p className="text-futvar-red text-sm bg-red-500/10 border border-red-500/30 rounded px-3 py-2">
                {error}
              </p>
            )}
            <div>
              <label className="block text-sm font-medium text-futvar-light mb-1">Nome da empresa *</label>
              <input
                type="text"
                required
                value={form.companyName}
                onChange={(e) => setForm((f) => ({ ...f, companyName: e.target.value }))}
                className="w-full px-4 py-3 rounded bg-futvar-dark border border-white/20 text-white placeholder-futvar-light focus:outline-none focus:ring-2 focus:ring-futvar-green"
                placeholder="Sua empresa ou marca"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-futvar-light mb-1">E-mail *</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="w-full px-4 py-3 rounded bg-futvar-dark border border-white/20 text-white placeholder-futvar-light focus:outline-none focus:ring-2 focus:ring-futvar-green"
                placeholder="contato@empresa.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-futvar-light mb-1">Site (opcional)</label>
              <input
                type="url"
                value={form.websiteUrl}
                onChange={(e) => setForm((f) => ({ ...f, websiteUrl: e.target.value }))}
                className="w-full px-4 py-3 rounded bg-futvar-dark border border-white/20 text-white placeholder-futvar-light focus:outline-none focus:ring-2 focus:ring-futvar-green"
                placeholder="https://..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-futvar-light mb-1">WhatsApp (opcional)</label>
              <input
                type="text"
                value={form.whatsapp}
                onChange={(e) => setForm((f) => ({ ...f, whatsapp: e.target.value }))}
                className="w-full px-4 py-3 rounded bg-futvar-dark border border-white/20 text-white placeholder-futvar-light focus:outline-none focus:ring-2 focus:ring-futvar-green"
                placeholder="(11) 99999-9999"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-futvar-light mb-1">Instagram (opcional)</label>
              <input
                type="text"
                value={form.instagram}
                onChange={(e) => setForm((f) => ({ ...f, instagram: e.target.value }))}
                className="w-full px-4 py-3 rounded bg-futvar-dark border border-white/20 text-white placeholder-futvar-light focus:outline-none focus:ring-2 focus:ring-futvar-green"
                placeholder="@suaempresa ou instagram.com/suaempresa"
              />
            </div>
            <div>
              <TeamSelectorWithConfirm
                label="Time (opcional)"
                confirmMessage="Parte do valor do patrocínio será repassada ao time."
                noneLabel="Não quero escolher um time"
                selectedTeam={teams.find((t) => t.id === form.teamId) ?? null}
                onSelect={(t) => setForm((f) => ({ ...f, teamId: t?.id ?? '' }))}
              />
              <p className="mt-2">
                <NaoEncontrouTimeCTA />
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-futvar-light mb-1">Logo da empresa *</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  value={form.logoUrl}
                  onChange={(e) => setForm((f) => ({ ...f, logoUrl: e.target.value }))}
                  className="flex-1 px-4 py-3 rounded bg-futvar-dark border border-white/20 text-white placeholder-futvar-light focus:outline-none focus:ring-2 focus:ring-futvar-green"
                  placeholder="URL ou envie um arquivo"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-3 rounded bg-futvar-dark border border-white/20 text-white hover:bg-white/10"
                >
                  Enviar
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp,.svg"
                  className="hidden"
                  onChange={handleLogoUpload}
                />
              </div>
              {form.logoUrl && (
                <div className="mt-2">
                  <img src={form.logoUrl} alt="Logo" className="h-12 w-auto object-contain rounded" />
                </div>
              )}
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded bg-futvar-green text-futvar-darker font-bold hover:bg-futvar-green-light disabled:opacity-50"
            >
              {submitting ? 'Gerando pagamento...' : 'Ir para pagamento'}
            </button>
          </form>
        )}

        {step === 'payment' && clientSecret && (
          <div className="p-6 rounded-lg bg-futvar-dark border border-futvar-green/20 space-y-4">
            <h3 className="text-white font-semibold">Próximo passo: concluir o pagamento</h3>
            <p className="text-futvar-light text-sm">
              Seu pedido foi registrado. O pagamento com cartão está em configuração. Entre em contato para concluir
              (PIX ou transferência) e finalizar seu patrocínio.
            </p>
            {whatsappUrl ? (
              <a
                href={`${whatsappUrl}?text=${encodeURIComponent(
                  `Olá! Preenchi o formulário de patrocínio (${form.companyName}). Gostaria de concluir o pagamento.`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 rounded bg-futvar-green text-futvar-darker font-bold hover:bg-futvar-green-light"
              >
                Falar no WhatsApp
              </a>
            ) : (
              <Link href="/#contato" className="inline-block px-6 py-3 rounded bg-futvar-green text-futvar-darker font-bold hover:bg-futvar-green-light">
                Entre em contato
              </Link>
            )}
            <button
              type="button"
              onClick={() => setStep('form')}
              className="block text-futvar-light hover:text-white text-sm"
            >
              ← Voltar ao formulário
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PatrocinarComprarPage() {
  return (
    <Suspense
      fallback={
        <div className="pt-20 pb-16 px-4 min-h-screen bg-futvar-darker flex items-center justify-center">
          <p className="text-futvar-light">Carregando...</p>
        </div>
      }
    >
      <PatrocinarComprarContent />
    </Suspense>
  );
}
