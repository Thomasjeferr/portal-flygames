'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState({
    supportEmail: '',
    adminCredentialsEmail: '',
    whatsappNumber: '',
    instagramUrl: '',
    tiktokUrl: '',
    youtubeUrl: '',
    companyName: 'Fly Games',
    companyCnpj: '',
    gaMeasurementId: '',
    fbPixelId: '',
    tiktokPixelId: '',
  });

  useEffect(() => {
    fetch('/api/admin/site-settings')
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
          return;
        }
        setForm({
          supportEmail: data.supportEmail ?? '',
          adminCredentialsEmail: data.adminCredentialsEmail ?? '',
          whatsappNumber: data.whatsappNumber ?? '',
          instagramUrl: data.instagramUrl ?? '',
          tiktokUrl: data.tiktokUrl ?? '',
          youtubeUrl: data.youtubeUrl ?? '',
          companyName: data.companyName ?? 'Fly Games',
          companyCnpj: data.companyCnpj ?? '',
          gaMeasurementId: data.gaMeasurementId ?? '',
          fbPixelId: data.fbPixelId ?? '',
          tiktokPixelId: data.tiktokPixelId ?? '',
        });
      })
      .catch(() => setError('Erro ao carregar'))
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setSaving(true);
    try {
      const res = await fetch('/api/admin/site-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Erro ao salvar');
        return;
      }
      setSuccess(true);
    } catch {
      setError('Erro de conexão');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="max-w-2xl mx-auto px-6 py-10 text-netflix-light">Carregando...</div>;

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <div className="mb-8">
        <Link href="/admin/jogos" className="text-netflix-light hover:text-white text-sm">
          ← Voltar ao painel
        </Link>
      </div>
      <h1 className="text-2xl font-bold text-white mb-6">Configurações do site</h1>
      <form onSubmit={handleSubmit} className="space-y-5 bg-netflix-dark border border-white/10 rounded-lg p-6">
        {error && (
          <p className="text-netflix-red text-sm bg-red-500/10 border border-red-500/30 rounded px-3 py-2">
            {error}
          </p>
        )}
        {success && (
          <p className="text-green-400 text-sm bg-green-500/10 border border-green-500/30 rounded px-3 py-2">
            Configurações salvas com sucesso.
          </p>
        )}
        <div>
          <label className="block text-sm font-medium text-netflix-light mb-2">E-mail de suporte</label>
          <input
            type="email"
            value={form.supportEmail}
            onChange={(e) => setForm((f) => ({ ...f, supportEmail: e.target.value }))}
            placeholder="contato@flygames.app"
            className="w-full px-4 py-3 rounded bg-netflix-gray border border-white/20 text-white placeholder-netflix-light focus:outline-none focus:ring-2 focus:ring-netflix-red"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-netflix-light mb-2">E-mail para receber credenciais pré-estreia (admin)</label>
          <input
            type="email"
            value={form.adminCredentialsEmail}
            onChange={(e) => setForm((f) => ({ ...f, adminCredentialsEmail: e.target.value }))}
            placeholder="admin@flygames.app"
            className="w-full px-4 py-3 rounded bg-netflix-gray border border-white/20 text-white placeholder-netflix-light focus:outline-none focus:ring-2 focus:ring-netflix-red"
          />
          <p className="text-xs text-netflix-light mt-1">Usuário e senha dos clubes são enviados a este e-mail quando o pagamento é confirmado.</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-netflix-light mb-2">WhatsApp (com DDI)</label>
          <input
            type="text"
            value={form.whatsappNumber}
            onChange={(e) => setForm((f) => ({ ...f, whatsappNumber: e.target.value }))}
            placeholder="5511999999999"
            className="w-full px-4 py-3 rounded bg-netflix-gray border border-white/20 text-white placeholder-netflix-light focus:outline-none focus:ring-2 focus:ring-netflix-red"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-netflix-light mb-2">Instagram URL</label>
          <input
            type="url"
            value={form.instagramUrl}
            onChange={(e) => setForm((f) => ({ ...f, instagramUrl: e.target.value }))}
            placeholder="https://instagram.com/flygames"
            className="w-full px-4 py-3 rounded bg-netflix-gray border border-white/20 text-white placeholder-netflix-light focus:outline-none focus:ring-2 focus:ring-netflix-red"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-netflix-light mb-2">TikTok URL</label>
          <input
            type="url"
            value={form.tiktokUrl}
            onChange={(e) => setForm((f) => ({ ...f, tiktokUrl: e.target.value }))}
            placeholder="https://tiktok.com/@flygames"
            className="w-full px-4 py-3 rounded bg-netflix-gray border border-white/20 text-white placeholder-netflix-light focus:outline-none focus:ring-2 focus:ring-netflix-red"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-netflix-light mb-2">YouTube URL</label>
          <input
            type="url"
            value={form.youtubeUrl}
            onChange={(e) => setForm((f) => ({ ...f, youtubeUrl: e.target.value }))}
            placeholder="https://youtube.com/@flygames"
            className="w-full px-4 py-3 rounded bg-netflix-gray border border-white/20 text-white placeholder-netflix-light focus:outline-none focus:ring-2 focus:ring-netflix-red"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-netflix-light mb-2">Nome da empresa</label>
          <input
            type="text"
            value={form.companyName}
            onChange={(e) => setForm((f) => ({ ...f, companyName: e.target.value }))}
            placeholder="Fly Games"
            className="w-full px-4 py-3 rounded bg-netflix-gray border border-white/20 text-white placeholder-netflix-light focus:outline-none focus:ring-2 focus:ring-netflix-red"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-netflix-light mb-2">CNPJ</label>
          <input
            type="text"
            value={form.companyCnpj}
            onChange={(e) => setForm((f) => ({ ...f, companyCnpj: e.target.value }))}
            placeholder="00.000.000/0001-00"
            className="w-full px-4 py-3 rounded bg-netflix-gray border border-white/20 text-white placeholder-netflix-light focus:outline-none focus:ring-2 focus:ring-netflix-red"
          />
        </div>
        <div className="pt-4 border-t border-white/10">
          <h2 className="text-sm font-semibold text-white mb-3">Pixels e Analytics</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-netflix-light mb-1">
                Google Analytics (GA4 Measurement ID)
              </label>
              <input
                type="text"
                value={form.gaMeasurementId}
                onChange={(e) => setForm((f) => ({ ...f, gaMeasurementId: e.target.value }))}
                placeholder="G-XXXXXXXXXX"
                className="w-full px-4 py-3 rounded bg-netflix-gray border border-white/20 text-white placeholder-netflix-light focus:outline-none focus:ring-2 focus:ring-netflix-red"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-netflix-light mb-1">
                Facebook / Meta Pixel ID
              </label>
              <input
                type="text"
                value={form.fbPixelId}
                onChange={(e) => setForm((f) => ({ ...f, fbPixelId: e.target.value }))}
                placeholder="123456789012345"
                className="w-full px-4 py-3 rounded bg-netflix-gray border border-white/20 text-white placeholder-netflix-light focus:outline-none focus:ring-2 focus:ring-netflix-red"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-netflix-light mb-1">
                TikTok Pixel ID
              </label>
              <input
                type="text"
                value={form.tiktokPixelId}
                onChange={(e) => setForm((f) => ({ ...f, tiktokPixelId: e.target.value }))}
                placeholder="XXXXXXXXXXXXXXX"
                className="w-full px-4 py-3 rounded bg-netflix-gray border border-white/20 text-white placeholder-netflix-light focus:outline-none focus:ring-2 focus:ring-netflix-red"
              />
            </div>
          </div>
        </div>
        <div className="pt-4">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3 rounded bg-netflix-red text-white font-semibold hover:bg-red-600 disabled:opacity-50"
          >
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </form>
    </div>
  );
}
