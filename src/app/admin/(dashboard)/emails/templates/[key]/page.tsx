'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

const TEMPLATE_LABELS: Record<string, string> = {
  WELCOME: 'Boas-vindas',
  VERIFY_EMAIL: 'Verificar e-mail',
  RESET_PASSWORD: 'Recuperar senha',
  PASSWORD_CHANGED: 'Senha alterada',
};

const TEMPLATE_VARS: Record<string, string[]> = {
  WELCOME: ['name', 'login_url'],
  VERIFY_EMAIL: ['name', 'verify_url', 'expires_in'],
  RESET_PASSWORD: ['name', 'reset_url', 'expires_in'],
  PASSWORD_CHANGED: ['name', 'support_url'],
};

export default function AdminEmailTemplateEditPage() {
  const params = useParams();
  const router = useRouter();
  const key = params.key as string;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [testEmail, setTestEmail] = useState('');
  const [form, setForm] = useState({ subject: '', html_body: '', is_active: true });

  useEffect(() => {
    fetch(`/api/admin/emails/templates/${key}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setForm({ subject: data.subject, html_body: data.htmlBody, is_active: data.isActive ?? true });
      })
      .catch(() => setError('Erro ao carregar'))
      .finally(() => setLoading(false));
  }, [key]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/emails/templates/${key}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Erro ao salvar');
        return;
      }
      setSuccess('Template salvo.');
    } catch {
      setError('Erro de conexão');
    } finally {
      setSaving(false);
    }
  };

  const handlePreview = async () => {
    try {
      const res = await fetch(`/api/admin/emails/templates/${key}/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (res.ok) setPreviewHtml(data.html);
    } catch {}
  };

  const handleTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testEmail.trim()) return;
    setError('');
    setSuccess('');
    setTesting(true);
    try {
      const res = await fetch(`/api/admin/emails/templates/${key}/test`, {
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

  if (loading) return <div className="max-w-4xl mx-auto px-6 py-10 text-netflix-light">Carregando...</div>;

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <Link href="/admin/emails/templates" className="text-netflix-light hover:text-white text-sm mb-6 inline-block">← Voltar aos templates</Link>
      <h1 className="text-2xl font-bold text-white mb-6">Editar: {TEMPLATE_LABELS[key] ?? key}</h1>
      <p className="text-netflix-light text-sm mb-4">Variáveis: {TEMPLATE_VARS[key]?.map((v) => `{{${v}}}`).join(', ') ?? '-'}</p>
      <form onSubmit={handleSubmit} className="space-y-5 bg-netflix-dark border border-white/10 rounded-lg p-6">
        {error && <p className="text-netflix-red text-sm bg-red-500/10 border border-red-500/30 rounded px-3 py-2">{error}</p>}
        {success && <p className="text-green-400 text-sm bg-green-500/10 border border-green-500/30 rounded px-3 py-2">{success}</p>}
        <div>
          <label className="block text-sm font-medium text-netflix-light mb-2">Assunto</label>
          <input type="text" value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))} className="w-full px-4 py-3 rounded bg-netflix-gray border border-white/20 text-white" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-netflix-light mb-2">Corpo HTML</label>
          <textarea value={form.html_body} onChange={(e) => setForm((f) => ({ ...f, html_body: e.target.value }))} rows={16} className="w-full px-4 py-3 rounded bg-netflix-gray border border-white/20 text-white font-mono text-sm" required />
        </div>
        <div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.is_active} onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))} className="rounded" />
            <span className="text-netflix-light">Template ativo</span>
          </label>
        </div>
        <div className="flex gap-3">
          <button type="submit" disabled={saving} className="px-6 py-3 rounded bg-netflix-red text-white font-semibold hover:bg-red-600 disabled:opacity-50">{saving ? 'Salvando...' : 'Salvar'}</button>
          <button type="button" onClick={handlePreview} className="px-6 py-3 rounded bg-netflix-gray text-white font-semibold hover:bg-white/20">Preview</button>
        </div>
      </form>
      {previewHtml && (
        <div className="mt-8 p-6 bg-white rounded-lg">
          <h3 className="font-semibold text-black mb-3">Preview</h3>
          <div dangerouslySetInnerHTML={{ __html: previewHtml }} className="text-black" />
        </div>
      )}
      <div className="mt-8 p-6 bg-netflix-dark border border-white/10 rounded-lg">
        <h3 className="text-lg font-semibold text-white mb-3">Enviar teste</h3>
        <form onSubmit={handleTest} className="flex gap-3">
          <input type="email" value={testEmail} onChange={(e) => setTestEmail(e.target.value)} placeholder="seu@email.com" className="flex-1 px-4 py-3 rounded bg-netflix-gray border border-white/20 text-white" required />
          <button type="submit" disabled={testing} className="px-6 py-3 rounded bg-netflix-gray text-white font-semibold hover:bg-white/20 disabled:opacity-50">{testing ? 'Enviando...' : 'Enviar teste'}</button>
        </form>
      </div>
    </div>
  );
}
