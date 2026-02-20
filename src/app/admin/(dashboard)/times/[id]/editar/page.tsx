'use client';

import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useRef, useState, useEffect } from 'react';

function ensureFullUrl(url: string) {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  if (url.startsWith('/')) return (typeof window !== 'undefined' ? window.location.origin : '') + url;
  return url;
}

export default function EditTeamPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const fileInput = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [approvalStatus, setApprovalStatus] = useState<'approved' | 'pending' | 'rejected'>('approved');
  const [approving, setApproving] = useState(false);
  const [members, setMembers] = useState<{ id: string; name: string; role: string; number: number | null; position: string | null; isActive: boolean }[]>([]);
  const [form, setForm] = useState({
    name: '',
    shortName: '',
    city: '',
    state: '',
    foundedYear: '',
    crestUrl: '',
    instagram: '',
    whatsapp: '',
    description: '',
    isActive: true,
    payoutPixKey: '',
    payoutName: '',
    payoutDocument: '',
    responsibleName: '',
    responsibleEmail: '',
  });
  const [sendingReset, setSendingReset] = useState(false);
  const [resetMessage, setResetMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetch(`/api/admin/teams/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
          return;
        }
        setApprovalStatus(data.approvalStatus ?? 'approved');
        setForm({
          name: data.name ?? '',
          shortName: data.shortName ?? '',
          city: data.city ?? '',
          state: data.state ?? '',
          foundedYear: data.foundedYear != null ? String(data.foundedYear) : '',
          crestUrl: ensureFullUrl(data.crestUrl ?? ''),
          instagram: data.instagram ?? '',
          whatsapp: data.whatsapp ?? '',
          description: data.description ?? '',
          isActive: data.isActive ?? true,
          payoutPixKey: data.payoutPixKey ?? '',
          payoutName: data.payoutName ?? '',
          payoutDocument: data.payoutDocument ?? '',
          responsibleName: data.responsibleName ?? '',
          responsibleEmail: data.responsibleEmail ?? '',
        });
        setMembers(Array.isArray(data.members) ? data.members : []);
      })
      .catch(() => setError('Erro ao carregar'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml'];
    if (!allowed.includes(file.type)) {
      setError('Formato inválido. Use PNG, JPG, WebP ou SVG.');
      return;
    }
    setError('');
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/admin/upload', { method: 'POST', body: fd });
    const data = await res.json();
    if (res.ok && data.url) {
      const url = data.url.startsWith('http') ? data.url : (typeof window !== 'undefined' ? window.location.origin : '') + data.url;
      setForm((f) => ({ ...f, crestUrl: url }));
    } else {
      setError(data.error || 'Erro no upload');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const crestUrl = form.crestUrl.startsWith('http') ? form.crestUrl : form.crestUrl.startsWith('/') ? form.crestUrl : form.crestUrl.replace(/^\/\//, 'https://');
      const res = await fetch(`/api/admin/teams/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          shortName: form.shortName.trim() || null,
          city: form.city.trim() || null,
          state: form.state.trim().toUpperCase() || null,
          foundedYear: form.foundedYear ? Number(form.foundedYear) : null,
          crestUrl: crestUrl.trim() || null,
          instagram: form.instagram.trim() || null,
          whatsapp: form.whatsapp.replace(/\D/g, '') || null,
          description: form.description.trim() || null,
          isActive: form.isActive,
          payoutPixKey: form.payoutPixKey.trim() || null,
          payoutName: form.payoutName.trim() || null,
          payoutDocument: form.payoutDocument.trim() || null,
          responsibleName: form.responsibleName.trim() || null,
          responsibleEmail: form.responsibleEmail.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Erro ao atualizar');
        return;
      }
      router.push('/admin/times');
      router.refresh();
    } catch {
      setError('Erro de conexão');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="max-w-2xl mx-auto px-6 py-10 text-netflix-light">Carregando...</div>;

  if (error && !form.name) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-10">
        <p className="text-netflix-red">{error}</p>
        <Link href="/admin/times" className="text-netflix-light hover:text-white mt-4 inline-block">Voltar aos times</Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <div className="mb-8">
        <Link href="/admin/times" className="text-netflix-light hover:text-white text-sm">← Voltar aos times</Link>
      </div>
      <h1 className="text-2xl font-bold text-white mb-6">Editar time</h1>

      {/* Aprovação: exibe status e botões quando pendente */}
      <div className="mb-6 p-4 rounded-lg bg-netflix-dark border border-white/10">
        <p className="text-sm text-netflix-light mb-2">Status de aprovação</p>
        <p className="font-medium text-white mb-3">
          {approvalStatus === 'approved' && 'Aprovado'}
          {approvalStatus === 'pending' && 'Pendente de aprovação'}
          {approvalStatus === 'rejected' && 'Rejeitado'}
        </p>
        {approvalStatus === 'pending' && (
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={approving}
              onClick={async () => {
                setApproving(true);
                setError('');
                try {
                  const res = await fetch(`/api/admin/teams/${id}/approve`, { method: 'POST' });
                  const data = await res.json();
                  if (res.ok) {
                    setApprovalStatus('approved');
                    setForm((f) => ({ ...f, isActive: true }));
                  } else setError(data.error || 'Erro ao aprovar');
                } catch {
                  setError('Erro ao aprovar time');
                } finally {
                  setApproving(false);
                }
              }}
              className="px-4 py-2 rounded bg-futvar-green text-futvar-darker font-semibold hover:bg-futvar-green-light disabled:opacity-50"
            >
              {approving ? 'Aprovando...' : 'Aprovar time'}
            </button>
            <button
              type="button"
              disabled={approving}
              onClick={async () => {
                if (!confirm('Rejeitar o cadastro deste time? O responsável pode ser notificado por e-mail.')) return;
                setApproving(true);
                setError('');
                try {
                  const res = await fetch(`/api/admin/teams/${id}/reject`, { method: 'POST' });
                  const data = await res.json();
                  if (res.ok) setApprovalStatus('rejected');
                  else setError(data.error || 'Erro ao rejeitar');
                } catch {
                  setError('Erro ao rejeitar time');
                } finally {
                  setApproving(false);
                }
              }}
              className="px-4 py-2 rounded bg-red-900/50 text-red-300 font-semibold hover:bg-red-900/70 disabled:opacity-50"
            >
              Rejeitar time
            </button>
          </div>
        )}
        {approvalStatus === 'pending' && (
          <p className="text-xs text-netflix-light mt-2">
            Ao aprovar, o responsável receberá um e-mail com o link para acessar o painel do time.
          </p>
        )}
      </div>

      {form.isActive === false && (
        <p className="text-xs text-netflix-light mb-4">
          Este time está marcado como inativo. Use a lista de times para ativar ou excluir definitivamente.
        </p>
      )}
      <form onSubmit={handleSubmit} className="space-y-5 bg-netflix-dark border border-white/10 rounded-lg p-6">
        {error && (
          <p className="text-netflix-red text-sm bg-red-500/10 border border-red-500/30 rounded px-3 py-2">{error}</p>
        )}
        {resetMessage && (
          <p
            className={`text-sm rounded px-3 py-2 ${
              resetMessage.type === 'success'
                ? 'bg-green-500/10 border border-green-500/30 text-green-300'
                : 'bg-red-500/10 border border-red-500/30 text-netflix-red'
            }`}
          >
            {resetMessage.text}
          </p>
        )}
        <div className="border-b border-white/10 pb-5">
          <h3 className="text-sm font-medium text-netflix-light mb-3">Dados do responsável pelo time</h3>
          <p className="text-xs text-netflix-light mb-3">
            E-mail e nome informados no cadastro do time. Você pode corrigir aqui se foram preenchidos errado. Depois,
            use o botão abaixo para enviar um link de redefinição de senha ao e-mail correto.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-3">
            <div>
              <label className="block text-sm font-medium text-netflix-light mb-1">Nome do responsável</label>
              <input
                type="text"
                value={form.responsibleName}
                onChange={(e) => setForm((f) => ({ ...f, responsibleName: e.target.value }))}
                placeholder="Nome usado no cadastro"
                className="w-full px-4 py-3 rounded bg-netflix-gray border border-white/20 text-white placeholder-netflix-light focus:outline-none focus:ring-2 focus:ring-netflix-red"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-netflix-light mb-1">E-mail do responsável</label>
              <input
                type="email"
                value={form.responsibleEmail}
                onChange={(e) => setForm((f) => ({ ...f, responsibleEmail: e.target.value }))}
                placeholder="E-mail para login no painel do time"
                className="w-full px-4 py-3 rounded bg-netflix-gray border border-white/20 text-white placeholder-netflix-light focus:outline-none focus:ring-2 focus:ring-netflix-red"
              />
            </div>
          </div>
          <button
            type="button"
            disabled={sendingReset || !form.responsibleEmail?.trim()}
            onClick={async () => {
              setResetMessage(null);
              setSendingReset(true);
              try {
                const res = await fetch(`/api/admin/teams/${id}/send-reset-password`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ email: form.responsibleEmail.trim() || undefined }),
                });
                const data = await res.json();
                if (res.ok) {
                  setResetMessage({ type: 'success', text: data.message ?? 'E-mail de redefinição enviado.' });
                } else {
                  setResetMessage({ type: 'error', text: data.error ?? 'Erro ao enviar.' });
                }
              } catch {
                setResetMessage({ type: 'error', text: 'Erro de conexão ao enviar e-mail.' });
              } finally {
                setSendingReset(false);
              }
            }}
            className="px-4 py-2 rounded bg-amber-600 text-white text-sm font-medium hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sendingReset ? 'Enviando...' : 'Enviar redefinição de senha ao e-mail acima'}
          </button>
        </div>
        <div>
          <label className="block text-sm font-medium text-netflix-light mb-2">Nome *</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            required
            className="w-full px-4 py-3 rounded bg-netflix-gray border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-netflix-red"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-netflix-light mb-2">Nome curto / Sigla</label>
            <input
              type="text"
              value={form.shortName}
              onChange={(e) => setForm((f) => ({ ...f, shortName: e.target.value.toUpperCase() }))}
              maxLength={20}
              className="w-full px-4 py-3 rounded bg-netflix-gray border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-netflix-red"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-netflix-light mb-2">Ano de fundação</label>
            <input
              type="number"
              min={1800}
              max={new Date().getFullYear()}
              value={form.foundedYear}
              onChange={(e) => setForm((f) => ({ ...f, foundedYear: e.target.value }))}
              className="w-full px-4 py-3 rounded bg-netflix-gray border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-netflix-red"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-netflix-light mb-2">Cidade</label>
            <input
              type="text"
              value={form.city}
              onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
              className="w-full px-4 py-3 rounded bg-netflix-gray border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-netflix-red"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-netflix-light mb-2">UF</label>
            <input
              type="text"
              value={form.state}
              onChange={(e) => setForm((f) => ({ ...f, state: e.target.value.toUpperCase().slice(0, 2) }))}
              maxLength={2}
              className="w-full px-4 py-3 rounded bg-netflix-gray border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-netflix-red"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-netflix-light mb-2">Escudo</label>
          <div className="flex gap-3 items-start">
            <input
              type="text"
              value={form.crestUrl}
              onChange={(e) => setForm((f) => ({ ...f, crestUrl: e.target.value }))}
              className="flex-1 px-4 py-3 rounded bg-netflix-gray border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-netflix-red"
            />
            <button type="button" onClick={() => fileInput.current?.click()} className="px-4 py-3 rounded bg-netflix-gray border border-white/20 text-white hover:bg-white/10">
              Upload
            </button>
            <input ref={fileInput} type="file" accept=".png,.jpg,.jpeg,.webp,.svg" className="hidden" onChange={handleUpload} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-netflix-light mb-2">Instagram</label>
            <input
              type="text"
              value={form.instagram}
              onChange={(e) => setForm((f) => ({ ...f, instagram: e.target.value }))}
              className="w-full px-4 py-3 rounded bg-netflix-gray border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-netflix-red"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-netflix-light mb-2">WhatsApp</label>
            <input
              type="text"
              value={form.whatsapp}
              onChange={(e) => setForm((f) => ({ ...f, whatsapp: e.target.value.replace(/\D/g, '') }))}
              className="w-full px-4 py-3 rounded bg-netflix-gray border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-netflix-red"
            />
          </div>
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
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
              className="rounded border-white/20"
            />
            <span className="text-netflix-light">Ativo</span>
          </label>
        </div>
        <div className="border-t border-white/10 pt-5 mt-5">
          <h3 className="text-sm font-medium text-netflix-light mb-3">Dados para repasse (comissões de patrocínio)</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-netflix-light mb-1">Chave PIX</label>
              <input
                type="text"
                value={form.payoutPixKey}
                onChange={(e) => setForm((f) => ({ ...f, payoutPixKey: e.target.value }))}
                placeholder="E-mail, CPF, CNPJ ou chave aleatória"
                className="w-full px-4 py-3 rounded bg-netflix-gray border border-white/20 text-white placeholder-netflix-light focus:outline-none focus:ring-2 focus:ring-netflix-red"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-netflix-light mb-1">Nome do favorecido</label>
              <input
                type="text"
                value={form.payoutName}
                onChange={(e) => setForm((f) => ({ ...f, payoutName: e.target.value }))}
                placeholder="Nome ou razão social"
                className="w-full px-4 py-3 rounded bg-netflix-gray border border-white/20 text-white placeholder-netflix-light focus:outline-none focus:ring-2 focus:ring-netflix-red"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-netflix-light mb-1">CPF/CNPJ (opcional)</label>
              <input
                type="text"
                value={form.payoutDocument}
                onChange={(e) => setForm((f) => ({ ...f, payoutDocument: e.target.value }))}
                placeholder="Apenas números"
                className="w-full px-4 py-3 rounded bg-netflix-gray border border-white/20 text-white placeholder-netflix-light focus:outline-none focus:ring-2 focus:ring-netflix-red"
              />
            </div>
          </div>
          <p className="mt-2 text-xs text-netflix-light">Usado na tela de comissões para identificar para quem repassar.</p>
        </div>
        <div className="flex gap-3 pt-4">
          <button type="submit" disabled={saving} className="px-6 py-3 rounded bg-netflix-red text-white font-semibold hover:bg-red-600 disabled:opacity-50">
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
          <Link href="/admin/times" className="px-6 py-3 rounded bg-netflix-gray text-white font-semibold hover:bg-white/20">
            Cancelar
          </Link>
        </div>
      </form>

      {/* Elenco cadastrado pelo time (somente leitura no admin) */}
      <section className="mt-10 p-6 rounded-lg bg-netflix-dark border border-white/10">
        <h2 className="text-lg font-bold text-white mb-2">Elenco do time</h2>
        <p className="text-sm text-netflix-light mb-4">
          Jogadores e comissão cadastrados pelo time no painel. Atualize a página para ver alterações.
        </p>
        {members.length === 0 ? (
          <p className="text-netflix-light text-sm">Nenhum membro cadastrado ainda.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-netflix-light border-b border-white/10">
                  <th className="py-2 pr-4">Nome</th>
                  <th className="py-2 pr-4">Função</th>
                  <th className="py-2 pr-4">Nº</th>
                  <th className="py-2 pr-4">Posição</th>
                  <th className="py-2">Ativo</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <tr key={m.id} className="border-b border-white/5">
                    <td className="py-2 pr-4 text-white">{m.name}</td>
                    <td className="py-2 pr-4 text-netflix-light">
                      {m.role === 'PLAYER' && 'Jogador'}
                      {m.role === 'GOALKEEPER' && 'Goleiro'}
                      {m.role === 'COACH' && 'Treinador'}
                      {m.role === 'STAFF' && 'Staff'}
                      {!['PLAYER', 'GOALKEEPER', 'COACH', 'STAFF'].includes(m.role) && m.role}
                    </td>
                    <td className="py-2 pr-4 text-netflix-light">{m.number ?? '—'}</td>
                    <td className="py-2 pr-4 text-netflix-light">{m.position ?? '—'}</td>
                    <td className="py-2 text-netflix-light">{m.isActive ? 'Sim' : 'Não'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
