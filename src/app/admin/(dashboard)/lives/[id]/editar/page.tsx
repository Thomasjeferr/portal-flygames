'use client';

import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';

export default function EditLivePage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const fileInput = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [creatingInput, setCreatingInput] = useState(false);
  const [error, setError] = useState('');
  const [showStreamKey, setShowStreamKey] = useState(false);
  const [credentials, setCredentials] = useState<{ ingestUrl: string; streamKey: string } | null>(null);
  const [form, setForm] = useState({
    title: '',
    description: '',
    thumbnailUrl: '',
    status: 'SCHEDULED',
    startAt: '',
    endAt: '',
    requireSubscription: true,
    allowOneTimePurchase: false,
    allowChat: false,
    cloudflareLiveInputId: null as string | null,
    cloudflarePlaybackId: '',
  });

  useEffect(() => {
    fetch(`/api/admin/lives/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
          return;
        }
        setForm({
          title: data.title ?? '',
          description: data.description ?? '',
          thumbnailUrl: data.thumbnailUrl ?? '',
          status: data.status ?? 'SCHEDULED',
          startAt: data.startAt ? new Date(data.startAt).toISOString().slice(0, 16) : '',
          endAt: data.endAt ? new Date(data.endAt).toISOString().slice(0, 16) : '',
          requireSubscription: data.requireSubscription ?? true,
          allowOneTimePurchase: data.allowOneTimePurchase ?? false,
          allowChat: data.allowChat ?? false,
          cloudflareLiveInputId: data.cloudflareLiveInputId ?? null,
          cloudflarePlaybackId: data.cloudflarePlaybackId ?? '',
        });
      })
      .catch(() => setError('Erro ao carregar'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/admin/upload', { method: 'POST', body: fd });
    const data = await res.json();
    if (res.ok && data.url) {
      const base = typeof window !== 'undefined' ? window.location.origin : '';
      setForm((f) => ({ ...f, thumbnailUrl: base + data.url }));
    }
  };

  const handleCreateLiveInput = async () => {
    setError('');
    setCredentials(null);
    setCreatingInput(true);
    try {
      const res = await fetch(`/api/admin/lives/${id}/create-live-input`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Erro ao criar credenciais');
        return;
      }
      setCredentials({ ingestUrl: data.ingestUrl, streamKey: data.streamKey });
      setForm((f) => ({ ...f, cloudflareLiveInputId: 'created' }));
    } catch {
      setError('Erro de conexão');
    } finally {
      setCreatingInput(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/lives/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          description: form.description || null,
          thumbnailUrl: form.thumbnailUrl || null,
          status: form.status,
          startAt: form.startAt || null,
          endAt: form.endAt || null,
          requireSubscription: form.requireSubscription,
          allowOneTimePurchase: form.allowOneTimePurchase,
          allowChat: form.allowChat,
          cloudflarePlaybackId: form.cloudflarePlaybackId || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Erro ao atualizar');
        return;
      }
      router.push('/admin/lives');
      router.refresh();
    } catch {
      setError('Erro de conexão');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-10">
        <p className="text-netflix-light">Carregando...</p>
      </div>
    );
  }

  if (credentials) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-10">
        <div className="mb-6">
          <Link href={`/admin/lives/${id}/editar`} className="text-netflix-light hover:text-white text-sm">
            ← Voltar à edição
          </Link>
        </div>
        <div className="bg-green-900/20 border border-green-500/40 rounded-lg p-6 text-white">
          <h2 className="text-xl font-bold mb-4">Credenciais OBS criadas. Configure o OBS:</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-green-200 mb-1">URL de ingestão</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={credentials.ingestUrl}
                  className="flex-1 px-3 py-2 rounded bg-black/40 border border-white/20 text-sm font-mono"
                />
                <button
                  type="button"
                  onClick={() => copyToClipboard(credentials.ingestUrl)}
                  className="px-3 py-2 rounded bg-netflix-gray hover:bg-white/20 text-sm"
                >
                  Copiar
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-green-200 mb-1">Chave de transmissão</label>
              <div className="flex gap-2">
                <input
                  type={showStreamKey ? 'text' : 'password'}
                  readOnly
                  value={credentials.streamKey}
                  className="flex-1 px-3 py-2 rounded bg-black/40 border border-white/20 text-sm font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowStreamKey((s) => !s)}
                  className="px-3 py-2 rounded bg-netflix-gray hover:bg-white/20 text-sm"
                  aria-label={showStreamKey ? 'Ocultar' : 'Ver'}
                >
                  {showStreamKey ? 'Ocultar' : 'Ver'}
                </button>
                <button
                  type="button"
                  onClick={() => copyToClipboard(credentials.streamKey)}
                  className="px-3 py-2 rounded bg-netflix-gray hover:bg-white/20 text-sm"
                >
                  Copiar
                </button>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setCredentials(null)}
            className="mt-6 px-4 py-2 rounded bg-netflix-red text-white font-semibold hover:bg-red-600"
          >
            Fechar e continuar editando
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <div className="mb-8">
        <Link href="/admin/lives" className="text-netflix-light hover:text-white text-sm">
          ← Voltar às lives
        </Link>
      </div>
      <h1 className="text-2xl font-bold text-white mb-6">Editar Live</h1>
      <form onSubmit={handleSubmit} className="space-y-5 bg-netflix-dark border border-white/10 rounded-lg p-6">
        {error && (
          <p className="text-netflix-red text-sm bg-red-500/10 border border-red-500/30 rounded px-3 py-2">
            {error}
          </p>
        )}
        {!form.cloudflareLiveInputId && (
          <div className="bg-amber-900/20 border border-amber-500/40 rounded-lg p-4 flex items-center justify-between gap-4">
            <p className="text-amber-200 text-sm">Esta live ainda não tem credenciais OBS.</p>
            <button
              type="button"
              onClick={handleCreateLiveInput}
              disabled={creatingInput}
              className="px-4 py-2 rounded bg-amber-600 text-white text-sm font-medium hover:bg-amber-500 disabled:opacity-50"
            >
              {creatingInput ? 'Criando...' : 'Gerar credenciais OBS'}
            </button>
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-netflix-light mb-2">Título *</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            required
            className="w-full px-4 py-3 rounded bg-netflix-gray border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-netflix-red"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-netflix-light mb-2">Descrição</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            rows={3}
            className="w-full px-4 py-3 rounded bg-netflix-gray border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-netflix-red"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-netflix-light mb-2">Thumbnail</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={form.thumbnailUrl}
              onChange={(e) => setForm((f) => ({ ...f, thumbnailUrl: e.target.value }))}
              className="flex-1 px-4 py-3 rounded bg-netflix-gray border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-netflix-red"
            />
            <input ref={fileInput} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              className="px-4 py-3 rounded bg-netflix-gray border border-white/20 text-white text-sm hover:bg-white/20"
            >
              Enviar
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-netflix-light mb-2">Início</label>
            <input
              type="datetime-local"
              value={form.startAt}
              onChange={(e) => setForm((f) => ({ ...f, startAt: e.target.value }))}
              className="w-full px-4 py-3 rounded bg-netflix-gray border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-netflix-red"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-netflix-light mb-2">Fim</label>
            <input
              type="datetime-local"
              value={form.endAt}
              onChange={(e) => setForm((f) => ({ ...f, endAt: e.target.value }))}
              className="w-full px-4 py-3 rounded bg-netflix-gray border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-netflix-red"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-netflix-light mb-2">ID do vídeo (replay)</label>
          <input
            type="text"
            value={form.cloudflarePlaybackId}
            onChange={(e) => setForm((f) => ({ ...f, cloudflarePlaybackId: e.target.value }))}
            placeholder="UID do vídeo no Cloudflare (após encerrar a live)"
            className="w-full px-4 py-3 rounded bg-netflix-gray border border-white/20 text-white placeholder-netflix-light focus:outline-none focus:ring-2 focus:ring-netflix-red text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-netflix-light mb-2">Status</label>
          <select
            value={form.status}
            onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
            className="w-full px-4 py-3 rounded bg-netflix-gray border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-netflix-red"
          >
            <option value="SCHEDULED">Agendada</option>
            <option value="LIVE">Ao vivo</option>
            <option value="ENDED">Encerrada</option>
          </select>
        </div>
        <div className="flex flex-col gap-3">
          <label className="flex items-center gap-2 text-sm text-netflix-light cursor-pointer">
            <input
              type="checkbox"
              checked={form.requireSubscription}
              onChange={(e) => setForm((f) => ({ ...f, requireSubscription: e.target.checked }))}
              className="rounded border-white/30 text-netflix-red focus:ring-netflix-red"
            />
            Exigir assinatura
          </label>
          <label className="flex items-center gap-2 text-sm text-netflix-light cursor-pointer">
            <input
              type="checkbox"
              checked={form.allowOneTimePurchase}
              onChange={(e) => setForm((f) => ({ ...f, allowOneTimePurchase: e.target.checked }))}
              className="rounded border-white/30 text-netflix-red focus:ring-netflix-red"
            />
            Permitir compra avulsa
          </label>
          <label className="flex items-center gap-2 text-sm text-netflix-light cursor-pointer">
            <input
              type="checkbox"
              checked={form.allowChat}
              onChange={(e) => setForm((f) => ({ ...f, allowChat: e.target.checked }))}
              className="rounded border-white/30 text-netflix-red focus:ring-netflix-red"
            />
            Habilitar chat
          </label>
        </div>
        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3 rounded bg-netflix-red text-white font-semibold hover:bg-red-600 disabled:opacity-50"
          >
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
          <Link
            href="/admin/lives"
            className="px-6 py-3 rounded bg-netflix-gray text-white font-semibold hover:bg-white/20"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}
