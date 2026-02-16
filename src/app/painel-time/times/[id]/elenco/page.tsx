'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

type Member = {
  id: string;
  name: string;
  role: string;
  number: number | null;
  position: string | null;
  isActive: boolean;
};

const ROLE_LABEL: Record<string, string> = {
  PLAYER: 'Jogador',
  GOALKEEPER: 'Goleiro',
  COACH: 'Treinador',
  STAFF: 'Staff',
};

export default function ElencoPage() {
  const params = useParams();
  const teamId = params.id as string;
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    id: '',
    name: '',
    role: 'PLAYER',
    number: '',
    position: '',
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
    setForm({ id: '', name: '', role: 'PLAYER', number: '', position: '', isActive: true });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('Nome é obrigatório');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload: any = {
        name: form.name.trim(),
        role: form.role,
        number: form.number ? Number(form.number) : null,
        position: form.position.trim() || null,
        isActive: form.isActive,
      };
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
    <div className="max-w-4xl mx-auto px-6 py-10">
      <div className="mb-8">
        <Link href="/painel-time" className="text-futvar-light hover:text-white text-sm">
          ← Voltar ao painel
        </Link>
      </div>

      <h1 className="text-2xl font-bold text-white mb-4">Elenco do time</h1>
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
              <option value="PLAYER">Jogador</option>
              <option value="GOALKEEPER">Goleiro</option>
              <option value="COACH">Treinador</option>
              <option value="STAFF">Staff</option>
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
          <table className="w-full text-left text-sm">
            <thead className="bg-white/5 text-futvar-light">
              <tr>
                <th className="px-4 py-3 font-medium">Nome</th>
                <th className="px-4 py-3 font-medium">Função</th>
                <th className="px-4 py-3 font-medium">Número</th>
                <th className="px-4 py-3 font-medium">Posição</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {members.map((m) => (
                <tr key={m.id} className="hover:bg-white/5">
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
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleEdit(m)}
                        className="px-3 py-1.5 rounded bg-white/5 text-white text-xs hover:bg-white/10"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(m)}
                        className="px-3 py-1.5 rounded bg-red-900/30 text-red-300 text-xs hover:bg-red-900/50"
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
    </div>
  );
}

