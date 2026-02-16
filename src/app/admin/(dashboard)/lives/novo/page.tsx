'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useRef } from 'react';

export default function NewLivePage() {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [createLiveInput, setCreateLiveInput] = useState(true);
  const [showStreamKey, setShowStreamKey] = useState(false);
  const [credentials, setCredentials] = useState<{
    ingestUrl: string;
    streamKey: string;
  } | null>(null);
  const [form, setForm] = useState({
    title: '',
    description: '',
    thumbnailUrl: '',
    status: 'SCHEDULED' as string,
    startAt: '',
    endAt: '',
    requireSubscription: true,
    allowOneTimePurchase: false,
    allowChat: false,
    cloudflareLiveInputId: '',
  });

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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // poderia mostrar um toast
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setCredentials(null);
    setLoading(true);
    try {
      const res = await fetch('/api/admin/lives', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          description: form.description || undefined,
          thumbnailUrl: form.thumbnailUrl || undefined,
          status: form.status,
          startAt: form.startAt || undefined,
          endAt: form.endAt || undefined,
          requireSubscription: form.requireSubscription,
          allowOneTimePurchase: form.allowOneTimePurchase,
          allowChat: form.allowChat,
          createLiveInput,
          cloudflareLiveInputId: form.cloudflareLiveInputId.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Erro ao criar live');
        return;
      }
      if (data.ingestUrl && data.streamKey) {
        setCredentials({ ingestUrl: data.ingestUrl, streamKey: data.streamKey });
      } else {
        router.push('/admin/lives');
        router.refresh();
      }
    } catch {
      setError('Erro de conexão');
    } finally {
      setLoading(false);
    }
  };

  if (credentials) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-10">
        <div className="mb-6">
          <Link href="/admin/lives" className="text-netflix-light hover:text-white text-sm">
            ← Voltar às lives
          </Link>
        </div>
        <div className="bg-green-900/20 border border-green-500/40 rounded-lg p-6 text-white">
          <h2 className="text-xl font-bold mb-4">Live criada. Configure o OBS com os dados abaixo:</h2>
          <p className="text-sm text-netflix-light mb-4">
            No OBS: Configurações → Transmissão → Serviço: Custom… → Servidor: cole a URL de ingestão; Chave de
            transmissão: cole a chave.
          </p>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-green-200 mb-1">URL de ingestão (Servidor)</label>
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
              <label className="block text-sm font-medium text-green-200 mb-1">Chave de transmissão (Stream Key)</label>
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
          <p className="text-xs text-netflix-light mt-4">
            Guarde a chave em local seguro. Ela não será exibida novamente.
          </p>
          <Link
            href="/admin/lives"
            className="mt-6 inline-block px-4 py-2 rounded bg-netflix-red text-white font-semibold hover:bg-red-600"
          >
            Ir para a lista de lives
          </Link>
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
      <h1 className="text-2xl font-bold text-white mb-6">Criar Live</h1>
      <form onSubmit={handleSubmit} className="space-y-5 bg-netflix-dark border border-white/10 rounded-lg p-6">
        {error && (
          <p className="text-netflix-red text-sm bg-red-500/10 border border-red-500/30 rounded px-3 py-2">
            {error}
          </p>
        )}
        <div>
          <label className="block text-sm font-medium text-netflix-light mb-2">
            ID da entrada ao vivo (Cloudflare) — opcional
          </label>
          <input
            type="text"
            value={form.cloudflareLiveInputId}
            onChange={(e) => setForm((f) => ({ ...f, cloudflareLiveInputId: e.target.value }))}
            placeholder="Ex: 5c48c548836e1241e8d4456fbd7f1dc9 — se você já criou a entrada no dashboard do Cloudflare, cole aqui"
            className="w-full px-4 py-3 rounded bg-netflix-gray border border-white/20 text-white placeholder-netflix-light focus:outline-none focus:ring-2 focus:ring-netflix-red text-sm"
          />
          <p className="text-xs text-netflix-light mt-1">
            Deixe em branco para criar a entrada via API ao salvar, ou cole o &quot;ID de entrada ao vivo&quot; das Informações de conexão do Cloudflare.
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium text-netflix-light mb-2">Título *</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            required
            placeholder="Ex: Live do jogo X"
            className="w-full px-4 py-3 rounded bg-netflix-gray border border-white/20 text-white placeholder-netflix-light focus:outline-none focus:ring-2 focus:ring-netflix-red"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-netflix-light mb-2">Descrição</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            rows={3}
            placeholder="Descrição da live"
            className="w-full px-4 py-3 rounded bg-netflix-gray border border-white/20 text-white placeholder-netflix-light focus:outline-none focus:ring-2 focus:ring-netflix-red"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-netflix-light mb-2">Thumbnail</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={form.thumbnailUrl}
              onChange={(e) => setForm((f) => ({ ...f, thumbnailUrl: e.target.value }))}
              placeholder="URL ou envie arquivo"
              className="flex-1 px-4 py-3 rounded bg-netflix-gray border border-white/20 text-white placeholder-netflix-light focus:outline-none focus:ring-2 focus:ring-netflix-red"
            />
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleUpload}
            />
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
            <label className="block text-sm font-medium text-netflix-light mb-2">Início (data/hora)</label>
            <input
              type="datetime-local"
              value={form.startAt}
              onChange={(e) => setForm((f) => ({ ...f, startAt: e.target.value }))}
              className="w-full px-4 py-3 rounded bg-netflix-gray border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-netflix-red"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-netflix-light mb-2">Fim (data/hora)</label>
            <input
              type="datetime-local"
              value={form.endAt}
              onChange={(e) => setForm((f) => ({ ...f, endAt: e.target.value }))}
              className="w-full px-4 py-3 rounded bg-netflix-gray border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-netflix-red"
            />
          </div>
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
            Exigir assinatura para assistir
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
          <label className="flex items-center gap-2 text-sm text-netflix-light cursor-pointer">
            <input
              type="checkbox"
              checked={createLiveInput}
              onChange={(e) => setCreateLiveInput(e.target.checked)}
              className="rounded border-white/30 text-netflix-red focus:ring-netflix-red"
            />
            Criar credenciais OBS agora (URL e chave para o Cloudflare Stream)
          </label>
        </div>
        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 rounded bg-netflix-red text-white font-semibold hover:bg-red-600 disabled:opacity-50"
          >
            {loading ? 'Criando...' : 'Criar Live'}
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
