'use client';

import { useEffect, useState } from 'react';

interface ConfigState {
  wooviApiKey: string;
  wooviWebhookSecret: string;
  stripeSecretKey: string;
  stripeWebhookSecret: string;
  stripePublishableKey: string;
  wooviConfigured: boolean;
  stripeConfigured: boolean;
}

export default function AdminPagamentosPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState<ConfigState>({
    wooviApiKey: '',
    wooviWebhookSecret: '',
    stripeSecretKey: '',
    stripeWebhookSecret: '',
    stripePublishableKey: '',
    wooviConfigured: false,
    stripeConfigured: false,
  });

  useEffect(() => {
    fetch('/api/admin/payment-config')
      .then((r) => r.json())
      .then((data) => {
        setForm({
          wooviApiKey: '',
          wooviWebhookSecret: '',
          stripeSecretKey: '',
          stripeWebhookSecret: '',
          stripePublishableKey: '',
          wooviConfigured: data.wooviConfigured ?? false,
          stripeConfigured: data.stripeConfigured ?? false,
        });
      })
      .catch(() => setError('Erro ao carregar'))
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);
    try {
      const body: Record<string, string> = {};
      if (form.wooviApiKey.trim()) body.wooviApiKey = form.wooviApiKey.trim();
      if (form.wooviWebhookSecret.trim()) body.wooviWebhookSecret = form.wooviWebhookSecret.trim();
      if (form.stripeSecretKey.trim()) body.stripeSecretKey = form.stripeSecretKey.trim();
      if (form.stripeWebhookSecret.trim()) body.stripeWebhookSecret = form.stripeWebhookSecret.trim();
      if (form.stripePublishableKey.trim()) body.stripePublishableKey = form.stripePublishableKey.trim();

      const res = await fetch('/api/admin/payment-config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Erro ao salvar');
        return;
      }
      setSuccess('Credenciais salvas com sucesso.');
      setForm((f) => ({
        ...f,
        wooviApiKey: '',
        wooviWebhookSecret: '',
        stripeSecretKey: '',
        stripeWebhookSecret: '',
        stripePublishableKey: '',
        wooviConfigured: data.wooviConfigured ?? f.wooviConfigured,
        stripeConfigured: data.stripeConfigured ?? f.stripeConfigured,
      }));
    } catch {
      setError('Erro de conexão');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl">
        <p className="text-netflix-light">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-3xl font-bold text-white mb-2">APIs de Pagamento</h1>
      <p className="text-netflix-light mb-8">Configure as credenciais para Pix (Woovi) e cartão (Stripe).</p>

      <form onSubmit={handleSubmit} className="space-y-8">
        {error && (
          <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/30 rounded px-3 py-2">{error}</p>
        )}
        {success && (
          <p className="text-green-400 text-sm bg-green-500/10 border border-green-500/30 rounded px-3 py-2">{success}</p>
        )}

        <section className="bg-netflix-dark border border-white/10 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-white mb-1">Woovi (Pix)</h2>
          <p className="text-xs text-netflix-light mb-4">Chaves em: Woovi → Configurações → API</p>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-netflix-light mb-2">API Key *</label>
              <div className="relative">
                <input
                  type={showPasswords ? 'text' : 'password'}
                  value={form.wooviApiKey}
                  onChange={(e) => setForm((f) => ({ ...f, wooviApiKey: e.target.value }))}
                  placeholder={form.wooviConfigured ? '•••••••• (deixe em branco para manter)' : 'Chave da API Woovi'}
                  autoComplete="off"
                  className="w-full px-4 py-3 pr-20 rounded bg-netflix-gray border border-white/20 text-white placeholder-netflix-light focus:outline-none focus:ring-2 focus:ring-netflix-red"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-netflix-light hover:text-white"
                  aria-label={showPasswords ? 'Ocultar senhas' : 'Mostrar senhas'}
                >
                  {showPasswords ? 'Ocultar' : 'Ver'}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-netflix-light mb-2">Webhook Secret (opcional)</label>
              <div className="relative">
                <input
                  type={showPasswords ? 'text' : 'password'}
                  value={form.wooviWebhookSecret}
                  onChange={(e) => setForm((f) => ({ ...f, wooviWebhookSecret: e.target.value }))}
                  placeholder={form.wooviConfigured ? '•••••••• (deixe em branco para manter)' : 'Segredo do webhook'}
                  autoComplete="off"
                  className="w-full px-4 py-3 pr-20 rounded bg-netflix-gray border border-white/20 text-white placeholder-netflix-light focus:outline-none focus:ring-2 focus:ring-netflix-red"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-netflix-light hover:text-white"
                  aria-label={showPasswords ? 'Ocultar senhas' : 'Mostrar senhas'}
                >
                  {showPasswords ? 'Ocultar' : 'Ver'}
                </button>
              </div>
              <p className="text-xs text-netflix-light mt-1">URL do webhook: {typeof window !== 'undefined' ? window.location.origin : ''}/api/webhooks/woovi</p>
            </div>
          </div>
        </section>

        <section className="bg-netflix-dark border border-white/10 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-white mb-1">Stripe (cartão)</h2>
          <p className="text-xs text-netflix-light mb-4">Chaves em: Stripe → Developers → API keys</p>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-netflix-light mb-2">Secret Key *</label>
              <div className="relative">
                <input
                  type={showPasswords ? 'text' : 'password'}
                  value={form.stripeSecretKey}
                  onChange={(e) => setForm((f) => ({ ...f, stripeSecretKey: e.target.value }))}
                  placeholder={form.stripeConfigured ? '•••••••• (deixe em branco para manter)' : 'sk_live_... ou sk_test_...'}
                  autoComplete="off"
                  className="w-full px-4 py-3 pr-20 rounded bg-netflix-gray border border-white/20 text-white placeholder-netflix-light focus:outline-none focus:ring-2 focus:ring-netflix-red"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-netflix-light hover:text-white"
                  aria-label={showPasswords ? 'Ocultar senhas' : 'Mostrar senhas'}
                >
                  {showPasswords ? 'Ocultar' : 'Ver'}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-netflix-light mb-2">Webhook Secret *</label>
              <div className="relative">
                <input
                  type={showPasswords ? 'text' : 'password'}
                  value={form.stripeWebhookSecret}
                  onChange={(e) => setForm((f) => ({ ...f, stripeWebhookSecret: e.target.value }))}
                  placeholder={form.stripeConfigured ? '•••••••• (deixe em branco para manter)' : 'whsec_...'}
                  autoComplete="off"
                  className="w-full px-4 py-3 pr-20 rounded bg-netflix-gray border border-white/20 text-white placeholder-netflix-light focus:outline-none focus:ring-2 focus:ring-netflix-red"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-netflix-light hover:text-white"
                  aria-label={showPasswords ? 'Ocultar senhas' : 'Mostrar senhas'}
                >
                  {showPasswords ? 'Ocultar' : 'Ver'}
                </button>
              </div>
              <p className="text-xs text-netflix-light mt-1">Use &quot;stripe listen --forward-to localhost:3000/api/webhooks/stripe&quot; em dev.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-netflix-light mb-2">Publishable Key (opcional)</label>
              <div className="relative">
                <input
                  type={showPasswords ? 'text' : 'password'}
                  value={form.stripePublishableKey}
                  onChange={(e) => setForm((f) => ({ ...f, stripePublishableKey: e.target.value }))}
                  placeholder={form.stripeConfigured ? '•••••••• (deixe em branco para manter)' : 'pk_live_... ou pk_test_...'}
                  autoComplete="off"
                  className="w-full px-4 py-3 pr-20 rounded bg-netflix-gray border border-white/20 text-white placeholder-netflix-light focus:outline-none focus:ring-2 focus:ring-netflix-red"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-netflix-light hover:text-white"
                  aria-label={showPasswords ? 'Ocultar senhas' : 'Mostrar senhas'}
                >
                  {showPasswords ? 'Ocultar' : 'Ver'}
                </button>
              </div>
              <p className="text-xs text-netflix-light mt-1">Necessária para Stripe Elements (pagamento com cartão no front).</p>
            </div>
          </div>
        </section>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3 rounded bg-netflix-red text-white font-semibold hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Salvando...' : 'Salvar credenciais'}
          </button>
        </div>
      </form>
    </div>
  );
}
