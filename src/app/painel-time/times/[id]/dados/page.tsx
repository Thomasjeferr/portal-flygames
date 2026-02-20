'use client';

import { useParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

type Team = {
  id: string;
  name: string;
  shortName: string | null;
  city: string | null;
  state: string | null;
  crestUrl: string | null;
};

export default function DadosDoTimePage() {
  const params = useParams();
  const teamId = params.id as string;
  const crestFileRef = useRef<HTMLInputElement>(null);

  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadingCrest, setUploadingCrest] = useState(false);

  const [form, setForm] = useState({
    crestUrl: '',
    shortName: '',
    city: '',
    state: '',
  });

  useEffect(() => {
    fetch(`/api/team-portal/teams/${teamId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else {
          setTeam(d);
          setForm({
            crestUrl: d.crestUrl ?? '',
            shortName: d.shortName ?? '',
            city: d.city ?? '',
            state: d.state ?? '',
          });
        }
      })
      .catch(() => setError('Erro ao carregar'))
      .finally(() => setLoading(false));
  }, [teamId]);

  const handleCrestUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingCrest(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/upload/team-crest', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha no upload');
      setForm((f) => ({ ...f, crestUrl: data.url }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar escudo');
    } finally {
      setUploadingCrest(false);
      if (crestFileRef.current) crestFileRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/team-portal/teams/${teamId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          crestUrl: form.crestUrl.trim() || null,
          shortName: form.shortName.trim() || null,
          city: form.city.trim() || null,
          state: form.state.trim()?.toUpperCase() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao salvar');
      setTeam((prev) => (prev ? { ...prev, ...data } : null));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-futvar-light py-6">Carregando...</div>;
  if (error && !team) return <p className="text-red-400">{error}</p>;

  return (
    <>
      <h2 className="text-xl font-bold text-white mb-4">Dados do time</h2>
      <p className="text-futvar-light text-sm mb-6">
        Altere o brasão e os dados exibidos do seu time. O nome completo do time não pode ser alterado aqui.
      </p>

      <form onSubmit={handleSubmit} className="bg-futvar-dark border border-white/10 rounded-xl p-5 space-y-5 max-w-xl">
        {error && (
          <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded px-3 py-2">
            {error}
          </p>
        )}

        <div>
          <label className="block text-sm font-medium text-futvar-light mb-2">Brasão do time</label>
          <div className="flex flex-col sm:flex-row gap-3 items-start">
            <input
              type="text"
              value={form.crestUrl}
              onChange={(e) => setForm((f) => ({ ...f, crestUrl: e.target.value }))}
              className="flex-1 w-full px-3 py-2 rounded bg-futvar-darker border border-white/20 text-white placeholder-futvar-light focus:outline-none focus:ring-2 focus:ring-futvar-green text-sm"
              placeholder="URL da imagem ou use o botão para carregar"
            />
            <input
              ref={crestFileRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
              className="hidden"
              onChange={handleCrestUpload}
            />
            <button
              type="button"
              onClick={() => crestFileRef.current?.click()}
              disabled={uploadingCrest}
              className="px-4 py-2 rounded bg-white/10 text-white border border-white/20 hover:bg-white/20 disabled:opacity-50 whitespace-nowrap text-sm font-medium"
            >
              {uploadingCrest ? 'Carregando...' : 'Carregar brasão'}
            </button>
          </div>
          {form.crestUrl && (
            <div className="mt-2 flex items-center gap-3">
              <img
                src={form.crestUrl}
                alt="Brasão"
                className="h-14 w-14 object-contain rounded bg-white/5 border border-white/10"
              />
              <span className="text-futvar-light text-sm">Preview</span>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-futvar-light mb-1">Nome curto</label>
          <input
            type="text"
            value={form.shortName}
            onChange={(e) => setForm((f) => ({ ...f, shortName: e.target.value }))}
            className="w-full px-3 py-2 rounded bg-futvar-darker border border-white/20 text-white placeholder-futvar-light focus:outline-none focus:ring-2 focus:ring-futvar-green"
            placeholder="Ex: EC Estância"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-futvar-light mb-1">Cidade</label>
            <input
              type="text"
              value={form.city}
              onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
              className="w-full px-3 py-2 rounded bg-futvar-darker border border-white/20 text-white placeholder-futvar-light focus:outline-none focus:ring-2 focus:ring-futvar-green"
              placeholder="Cidade"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-futvar-light mb-1">Estado (UF)</label>
            <input
              type="text"
              value={form.state}
              onChange={(e) => setForm((f) => ({ ...f, state: e.target.value.toUpperCase().slice(0, 2) }))}
              className="w-full px-3 py-2 rounded bg-futvar-darker border border-white/20 text-white placeholder-futvar-light focus:outline-none focus:ring-2 focus:ring-futvar-green"
              placeholder="RS"
              maxLength={2}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="px-5 py-2.5 rounded bg-futvar-green text-futvar-darker text-sm font-semibold hover:bg-futvar-green-light disabled:opacity-50"
        >
          {saving ? 'Salvando...' : 'Salvar alterações'}
        </button>
      </form>
    </>
  );
}
