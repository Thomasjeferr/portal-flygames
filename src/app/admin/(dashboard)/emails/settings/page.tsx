'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function AdminEmailSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [testEmail, setTestEmail] = useState('');
  const [form, setForm] = useState({
    from_name: 'Fly Games',
    from_email: 'no-reply@flygames.com.br',
    reply_to: '',
    brand_color: '#22c55e',
    logo_url: '',
    support_email: '',
    whatsapp_url: '',
    footer_text: '',
    app_base_url: '',
  });

  useEffect(() => {
    fetch('/api/admin/emails/settings')
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setForm({
          from_name: data.from_name ?? 'Fly Games',
          from_email: data.from_email ?? 'no-reply@flygames.com.br',
          reply_to: data.reply_to ?? '',
          brand_color: data.brand_color ?? '#22c55e',
          logo_url: data.logo_url ?? '',
          support_email: data.support_email ?? '',
          whatsapp_url: data.whatsapp_url ?? '',
          footer_text: data.footer_text ?? '',
          app_base_url: data.app_base_url ?? '',
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
      const res = await fetch('/api/admin/emails/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Erro ao salvar');
        return;
      }
      setSuccess('Configurações salvas.');
    } catch {
      setError('Erro de conexão');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testEmail.trim()) return;
    setError('');
    setSuccess('');
    setTesting(true);
    try {
      const res = await fetch('/api/admin/emails/settings/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: testEmail.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Erro ao enviar');
        return;
      }
      setSuccess('E-mail de teste enviado!');
    } catch {
      setError('Erro de conexão');
    } finally {
      setTesting(false);
    }
  };

  if (loading) return <div className="max-w-2xl mx-auto px-6 py-10 text-netflix-light">Carregando...</div>;

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-bold text-white mb-6">Configurações de E-mail</h1>
      <form onSubmit={handleSubmit} className="space-y-5 bg-netflix-dark border border-white/10 rounded-lg p-6">
        {error && <p className="text-netflix-red text-sm bg-red-500/10 border border-red-500/30 rounded px-3 py-2">{error}</p>}
        {success && <p className="text-green-400 text-sm bg-green-500/10 border border-green-500/30 rounded px-3 py-2">{success}</p>}
        <div>
          <label className="block text-sm font-medium text-netflix-light mb-2">Nome do remetente</label>
          <input type="text" value={form.from_name} onChange={(e) => setForm((f) => ({ ...f, from_name: e.target.value }))} className="w-full px-4 py-3 rounded bg-netflix-gray border border-white/20 text-white" />
        </div>
        <div>
          <label className="block text-sm font-medium text-netflix-light mb-2">E-mail do remetente</label>
          <input type="email" value={form.from_email} onChange={(e) => setForm((f) => ({ ...f, from_email: e.target.value }))} className="w-full px-4 py-3 rounded bg-netflix-gray border border-white/20 text-white" />
        </div>
        <div>
          <label className="block text-sm font-medium text-netflix-light mb-2">Reply-To (opcional)</label>
          <input type="email" value={form.reply_to} onChange={(e) => setForm((f) => ({ ...f, reply_to: e.target.value }))} className="w-full px-4 py-3 rounded bg-netflix-gray border border-white/20 text-white" placeholder="resposta@flygames.com.br" />
        </div>
        <div>
          <label className="block text-sm font-medium text-netflix-light mb-2">Cor da marca (hex)</label>
          <input type="text" value={form.brand_color} onChange={(e) => setForm((f) => ({ ...f, brand_color: e.target.value }))} className="w-full px-4 py-3 rounded bg-netflix-gray border border-white/20 text-white" placeholder="#22c55e" />
        </div>
        <div>
          <label className="block text-sm font-medium text-netflix-light mb-2">URL do logo (opcional)</label>
          <input type="url" value={form.logo_url} onChange={(e) => setForm((f) => ({ ...f, logo_url: e.target.value }))} className="w-full px-4 py-3 rounded bg-netflix-gray border border-white/20 text-white" />
        </div>
        <div>
          <label className="block text-sm font-medium text-netflix-light mb-2">E-mail de suporte</label>
          <input type="email" value={form.support_email} onChange={(e) => setForm((f) => ({ ...f, support_email: e.target.value }))} className="w-full px-4 py-3 rounded bg-netflix-gray border border-white/20 text-white" />
        </div>
        <div>
          <label className="block text-sm font-medium text-netflix-light mb-2">URL WhatsApp</label>
          <input type="url" value={form.whatsapp_url} onChange={(e) => setForm((f) => ({ ...f, whatsapp_url: e.target.value }))} className="w-full px-4 py-3 rounded bg-netflix-gray border border-white/20 text-white" />
        </div>
        <div>
          <label className="block text-sm font-medium text-netflix-light mb-2">Texto do rodapé</label>
          <input type="text" value={form.footer_text} onChange={(e) => setForm((f) => ({ ...f, footer_text: e.target.value }))} className="w-full px-4 py-3 rounded bg-netflix-gray border border-white/20 text-white" placeholder="© Fly Games. Todos os direitos reservados." />
        </div>
        <div>
          <label className="block text-sm font-medium text-netflix-light mb-2">URL base do app</label>
          <input type="url" value={form.app_base_url} onChange={(e) => setForm((f) => ({ ...f, app_base_url: e.target.value }))} className="w-full px-4 py-3 rounded bg-netflix-gray border border-white/20 text-white" placeholder="https://flygames.com.br" />
        </div>
        <div className="flex gap-3">
          <button type="submit" disabled={saving} className="px-6 py-3 rounded bg-netflix-red text-white font-semibold hover:bg-red-600 disabled:opacity-50">{saving ? 'Salvando...' : 'Salvar'}</button>
          <Link href="/admin/emails/templates" className="px-6 py-3 rounded bg-netflix-gray text-white font-semibold hover:bg-white/20">Templates</Link>
        </div>
      </form>
      <div className="mt-8 p-6 bg-netflix-dark border border-white/10 rounded-lg">
        <h2 className="text-lg font-semibold text-white mb-3">Enviar e-mail de teste</h2>
        <form onSubmit={handleTest} className="flex gap-3">
          <input type="email" value={testEmail} onChange={(e) => setTestEmail(e.target.value)} placeholder="seu@email.com" className="flex-1 px-4 py-3 rounded bg-netflix-gray border border-white/20 text-white" required />
          <button type="submit" disabled={testing} className="px-6 py-3 rounded bg-netflix-gray text-white font-semibold hover:bg-white/20 disabled:opacity-50">{testing ? 'Enviando...' : 'Enviar teste'}</button>
        </form>
      </div>
    </div>
  );
}
