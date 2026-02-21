'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';

type Member = {
  id: string;
  name: string;
  role: string;
  number: number | null;
  position: string | null;
  photoUrl: string | null;
  isActive: boolean;
};

const ROLE_LABEL: Record<string, string> = {
  PRESIDENTE: 'Presidente',
  VICE_PRESIDENTE: 'Vice Presidente',
  TREINADOR: 'Treinador',
  TESOUREIRO: 'Tesoureiro',
  ATLETA: 'Atleta',
  OUTROS: 'Outros',
  // legado (membros já cadastrados)
  PLAYER: 'Atleta',
  GOALKEEPER: 'Atleta',
  COACH: 'Treinador',
  STAFF: 'Outros',
};

export default function ElencoPage() {
  const params = useParams();
  const teamId = params.id as string;
  const photoFileRef = useRef<HTMLInputElement>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [form, setForm] = useState({
    id: '',
    name: '',
    role: 'PRESIDENTE',
    number: '',
    position: '',
    photoUrl: '',
    isActive: true,
  });

  const load = () => {
    setLoading(true);
    setError('');
    fetch(`/api/team-portal/teams/${teamId}/members`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setMembers(Array.isArray(d) ? d : []);
      })
      .catch(() => setError('Erro ao carregar elenco'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [teamId]);

  const resetForm = () =>
    setForm({ id: '', name: '', role: 'PRESIDENTE', number: '', position: '', photoUrl: '', isActive: true });

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('teamId', teamId);
      fd.append('file', file);
      const res = await fetch('/api/upload/member-photo', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha no upload');
      setForm((f) => ({ ...f, photoUrl: data.url }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar foto');
    } finally {
      setUploadingPhoto(false);
      if (photoFileRef.current) photoFileRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('Nome é obrigatório');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload: Record<string, unknown> = {
        name: form.name.trim(),
        role: form.role,
        number: form.number ? Number(form.number) : null,
        position: form.position.trim() || null,
        isActive: form.isActive,
      };
      if (form.photoUrl) payload.photoUrl = form.photoUrl.trim();
      let res: Response;
      if (form.id) {
        res = await fetch(`/api/team-portal/teams/${teamId}/members`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: form.id, ...payload }),
        });
      } else {
        res = await fetch(`/api/team-portal/teams/${teamId}/members`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Erro ao salvar membro');
        return;
      }
      resetForm();
      load();
    } catch {
      setError('Erro ao salvar membro');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (m: Member) => {
    setForm({
      id: m.id,
      name: m.name,
      role: m.role,
      number: m.number != null ? String(m.number) : '',
      position: m.position ?? '',
      photoUrl: m.photoUrl ?? '',
      isActive: m.isActive,
    });
  };

  const handleDelete = async (m: Member) => {
    if (!confirm(`Remover "${m.name}" do elenco?`)) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/team-portal/teams/${teamId}/members`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: m.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Erro ao remover membro');
        return;
      }
      if (form.id === m.id) resetForm();
      load();
    } catch {
      setError('Erro ao remover membro');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-10 text-futvar-light">
        Carregando elenco...
      </div>
    );
  }

  return (
    <>
      <h2 className="text-xl font-bold text-white mb-4">Elenco do time</h2>
      <p className="text-futvar-light text-sm mb-6">
        Cadastre jogadores e membros da comissão técnica do seu time.
      </p>

      <form
        onSubmit={handleSubmit}
        className="mb-8 bg-futvar-dark border border-white/10 rounded-xl p-5 space-y-4"
      >
        {error && (
          <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded px-3 py-2 mb-2">
            {error}
          </p>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-futvar-light mb-1">Nome *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full px-3 py-2 rounded bg-futvar-darker border border-white/20 text-white placeholder-futvar-light focus:outline-none focus:ring-2 focus:ring-futvar-green"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-futvar-light mb-1">Função</label>
            <select
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
              className="w-full px-3 py-2 rounded bg-futvar-darker border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-futvar-green"
            >
              <option value="PRESIDENTE">Presidente</option>
              <option value="VICE_PRESIDENTE">Vice Presidente</option>
              <option value="TREINADOR">Treinador</option>
              <option value="TESOUREIRO">Tesoureiro</option>
              <option value="ATLETA">Atleta</option>
              <option value="OUTROS">Outros</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-futvar-light mb-1">Número</label>
            <input
              type="number"
              value={form.number}
              onChange={(e) => setForm((f) => ({ ...f, number: e.target.value }))}
              className="w-full px-3 py-2 rounded bg-futvar-darker border border-white/20 text-white placeholder-futvar-light focus:outline-none focus:ring-2 focus:ring-futvar-green"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-futvar-light mb-1">Posição</label>
            <input
              type="text"
              value={form.position}
              onChange={(e) => setForm((f) => ({ ...f, position: e.target.value }))}
              className="w-full px-3 py-2 rounded bg-futvar-darker border border-white/20 text-white placeholder-futvar-light focus:outline-none focus:ring-2 focus:ring-futvar-green"
              placeholder="Ex: Atacante, Zagueiro..."
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-futvar-light mb-1">Foto (opcional)</label>
          <div className="flex flex-wrap items-center gap-3">
            <input
              ref={photoFileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handlePhotoUpload}
            />
            <button
              type="button"
              onClick={() => photoFileRef.current?.click()}
              disabled={uploadingPhoto}
              className="px-3 py-2 rounded bg-white/10 text-white text-sm border border-white/20 hover:bg-white/20 disabled:opacity-50"
            >
              {uploadingPhoto ? 'Carregando...' : 'Carregar foto'}
            </button>
            {form.photoUrl ? (
              <>
                <img
                  src={form.photoUrl}
                  alt=""
                  className="h-12 w-12 rounded object-cover border border-white/20"
                />
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, photoUrl: '' }))}
                  className="text-futvar-light hover:text-white text-xs"
                >
                  Remover
                </button>
              </>
            ) : null}
          </div>
        </div>
        <div>
          <label className="inline-flex items-center gap-2 text-futvar-light text-sm">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
              className="rounded border-white/30"
            />
            Ativo no elenco
          </label>
        </div>
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 rounded bg-futvar-green text-futvar-darker text-sm font-semibold hover:bg-futvar-green-light disabled:opacity-50"
          >
            {form.id ? (saving ? 'Salvando...' : 'Salvar alterações') : saving ? 'Adicionando...' : 'Adicionar membro'}
          </button>
          {form.id && (
            <button
              type="button"
              onClick={resetForm}
              className="px-5 py-2.5 rounded bg-white/5 text-futvar-light text-sm hover:bg-white/10"
            >
              Cancelar edição
            </button>
          )}
        </div>
      </form>

      <div className="rounded-xl border border-white/10 bg-futvar-dark overflow-x-auto">
        {members.length === 0 ? (
          <div className="p-6 text-center text-futvar-light text-sm">
            Nenhum membro cadastrado ainda.
          </div>
        ) : (
          <table className="w-full text-left text-sm min-w-[500px]">
            <thead className="bg-white/5 text-futvar-light">
              <tr>
                <th className="px-4 py-3 font-medium w-14">Foto</th>
                <th className="px-4 py-3 font-medium">Nome</th>
                <th className="px-4 py-3 font-medium">Função</th>
                <th className="px-4 py-3 font-medium">Número</th>
                <th className="px-4 py-3 font-medium">Posição</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right sticky right-0 bg-white/5 shadow-[-4px_0_8px_rgba(0,0,0,0.3)] min-w-[120px]">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {members.map((m) => (
                <tr key={m.id} className="group hover:bg-white/5">
                  <td className="px-4 py-3">
                    {m.photoUrl ? (
                      <img
                        src={m.photoUrl}
                        alt=""
                        className="h-10 w-10 rounded object-cover border border-white/20"
                      />
                    ) : (
                      <span className="text-futvar-light/50 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-white">{m.name}</td>
                  <td className="px-4 py-3 text-futvar-light">
                    {ROLE_LABEL[m.role] ?? m.role}
                  </td>
                  <td className="px-4 py-3 text-futvar-light">
                    {m.number ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-futvar-light">
                    {m.position || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={m.isActive ? 'text-futvar-green' : 'text-futvar-light'}>
                      {m.isActive ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right sticky right-0 bg-futvar-dark group-hover:bg-white/5 shadow-[-4px_0_8px_rgba(0,0,0,0.3)]">
                    <div className="flex items-center justify-end gap-2 flex-nowrap">
                      <button
                        onClick={() => handleEdit(m)}
                        className="px-3 py-1.5 rounded bg-white/5 text-white text-xs hover:bg-white/10 whitespace-nowrap"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(m)}
                        className="px-3 py-1.5 rounded bg-red-900/30 text-red-300 text-xs hover:bg-red-900/50 whitespace-nowrap"
                      >
                        Remover
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

