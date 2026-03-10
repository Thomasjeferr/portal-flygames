'use client';

import { useState, useEffect } from 'react';

export type GameHighlightItem = {
  id: string;
  title: string;
  description: string | null;
  videoUrl: string;
  thumbnailUrl: string | null;
  durationSec: number | null;
  order: number;
};

function formatDuration(sec: number | null): string {
  if (sec == null) return '—';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function GameHighlightsAdmin({ gameId }: { gameId: string }) {
  const [highlights, setHighlights] = useState<GameHighlightItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: '',
    description: '',
    videoUrl: '',
    thumbnailUrl: '',
    durationSec: '' as string,
    order: '' as string,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchHighlights = () => {
    fetch(`/api/admin/games/${gameId}/highlights`, { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => setHighlights(Array.isArray(data?.highlights) ? data.highlights : []))
      .catch(() => setHighlights([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchHighlights();
  }, [gameId]);

  const openCreate = () => {
    setEditingId(null);
    setForm({ title: '', description: '', videoUrl: '', thumbnailUrl: '', durationSec: '', order: '' });
    setError('');
    setModalOpen(true);
  };

  const openEdit = (h: GameHighlightItem) => {
    setEditingId(h.id);
    setForm({
      title: h.title,
      description: h.description || '',
      videoUrl: h.videoUrl,
      thumbnailUrl: h.thumbnailUrl || '',
      durationSec: h.durationSec != null ? String(h.durationSec) : '',
      order: String(h.order),
    });
    setError('');
    setModalOpen(true);
  };

  const handleSubmitModal = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const body = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        videoUrl: form.videoUrl.trim(),
        thumbnailUrl: form.thumbnailUrl.trim() || null,
        durationSec: form.durationSec === '' ? null : parseInt(form.durationSec, 10),
        order: form.order === '' ? undefined : parseInt(form.order, 10),
      };
      if (editingId) {
        const res = await fetch(`/api/admin/games/${gameId}/highlights/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          credentials: 'include',
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || 'Erro ao atualizar');
          return;
        }
        setHighlights((prev) => prev.map((h) => (h.id === editingId ? data : h)));
      } else {
        const res = await fetch(`/api/admin/games/${gameId}/highlights`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          credentials: 'include',
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || 'Erro ao criar');
          return;
        }
        setHighlights((prev) => [...prev, data].sort((a, b) => a.order - b.order));
      }
      setModalOpen(false);
    } catch {
      setError('Erro de conexão');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (highlightId: string) => {
    if (!confirm('Remover este corte?')) return;
    try {
      const res = await fetch(`/api/admin/games/${gameId}/highlights/${highlightId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.ok) setHighlights((prev) => prev.filter((h) => h.id !== highlightId));
    } catch {
      // ignore
    }
  };

  if (loading) {
    return (
      <div className="mt-8 p-6 rounded-lg bg-netflix-dark border border-white/10">
        <p className="text-netflix-light text-sm">Carregando cortes...</p>
      </div>
    );
  }

  return (
    <div className="mt-8 p-6 rounded-lg bg-netflix-dark border border-white/10">
      <h2 className="text-lg font-semibold text-white mb-2">Melhores momentos</h2>
      <p className="text-xs text-netflix-light mb-4">
        Cortes e melhores lances exibidos na página do jogo. Os visitantes verão esta seção abaixo do vídeo principal.
      </p>
      <div className="space-y-3">
        {highlights.length === 0 ? (
          <p className="text-netflix-light text-sm">Nenhum corte cadastrado.</p>
        ) : (
          highlights.map((h) => (
            <div
              key={h.id}
              className="flex items-center gap-4 p-3 rounded bg-netflix-gray border border-white/10"
            >
              {h.thumbnailUrl ? (
                <img
                  src={h.thumbnailUrl}
                  alt=""
                  className="w-24 h-14 object-cover rounded flex-shrink-0"
                />
              ) : (
                <div className="w-24 h-14 rounded bg-white/5 flex-shrink-0 flex items-center justify-center text-netflix-light text-xs">
                  Sem thumb
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium truncate">{h.title}</p>
                <p className="text-netflix-light text-xs">{formatDuration(h.durationSec)} · ordem {h.order}</p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => openEdit(h)}
                  className="px-3 py-1.5 rounded bg-white/10 text-white text-sm hover:bg-white/20"
                >
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(h.id)}
                  className="px-3 py-1.5 rounded bg-red-500/20 text-red-400 text-sm hover:bg-red-500/30"
                >
                  Remover
                </button>
              </div>
            </div>
          ))
        )}
        <button
          type="button"
          onClick={openCreate}
          className="w-full py-3 rounded border border-dashed border-white/30 text-netflix-light text-sm hover:bg-white/5 hover:border-white/50"
        >
          + Adicionar corte
        </button>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="bg-netflix-dark border border-white/20 rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-white mb-4">
              {editingId ? 'Editar corte' : 'Novo corte'}
            </h3>
            <form onSubmit={handleSubmitModal} className="space-y-4">
              {error && (
                <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/30 rounded px-3 py-2">
                  {error}
                </p>
              )}
              <div>
                <label className="block text-sm font-medium text-netflix-light mb-1">Título *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  required
                  className="w-full px-4 py-2 rounded bg-netflix-gray border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-netflix-red"
                  placeholder="Ex: Gol aos 23'"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-netflix-light mb-1">URL do vídeo *</label>
                <input
                  type="url"
                  value={form.videoUrl}
                  onChange={(e) => setForm((f) => ({ ...f, videoUrl: e.target.value }))}
                  required
                  className="w-full px-4 py-2 rounded bg-netflix-gray border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-netflix-red"
                  placeholder="https://..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-netflix-light mb-1">Thumbnail (opcional)</label>
                <input
                  type="url"
                  value={form.thumbnailUrl}
                  onChange={(e) => setForm((f) => ({ ...f, thumbnailUrl: e.target.value }))}
                  className="w-full px-4 py-2 rounded bg-netflix-gray border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-netflix-red"
                  placeholder="https://..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-netflix-light mb-1">Duração (seg)</label>
                  <input
                    type="number"
                    min={0}
                    value={form.durationSec}
                    onChange={(e) => setForm((f) => ({ ...f, durationSec: e.target.value }))}
                    className="w-full px-4 py-2 rounded bg-netflix-gray border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-netflix-red"
                    placeholder="45"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-netflix-light mb-1">Ordem</label>
                  <input
                    type="number"
                    min={0}
                    value={form.order}
                    onChange={(e) => setForm((f) => ({ ...f, order: e.target.value }))}
                    className="w-full px-4 py-2 rounded bg-netflix-gray border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-netflix-red"
                    placeholder="0"
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded bg-netflix-red text-white font-medium hover:bg-red-600 disabled:opacity-50"
                >
                  {saving ? 'Salvando...' : editingId ? 'Atualizar' : 'Criar'}
                </button>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded bg-netflix-gray text-white font-medium hover:bg-white/20"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
