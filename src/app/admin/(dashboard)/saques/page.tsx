'use client';

import { useEffect, useRef, useState } from 'react';

type PartnerWithdrawal = {
  id: string;
  partnerId: string;
  partnerName: string;
  partnerCompanyName: string | null;
  partnerRefCode: string;
  amountCents: number;
  status: string;
  requestedAt: string;
  paidAt: string | null;
  paymentReference: string | null;
  receiptUrl: string | null;
  pixKey: string | null;
  pixKeyType: string | null;
  pixName: string | null;
};

type TeamWithdrawal = {
  id: string;
  teamId: string;
  teamName: string;
  amountCents: number;
  status: string;
  requestedAt: string;
  paidAt: string | null;
  paymentReference: string | null;
  receiptUrl: string | null;
  pixKey: string | null;
  pixKeyType: string | null;
  pixName: string | null;
};

function formatMoney(cents: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(cents / 100);
}

function formatDate(s: string | null) {
  if (!s) return '—';
  try {
    return new Date(s).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return s;
  }
}

export default function AdminSaquesPage() {
  const [partners, setPartners] = useState<PartnerWithdrawal[]>([]);
  const [teams, setTeams] = useState<TeamWithdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadContext, setUploadContext] = useState<{ kind: 'partner' | 'team'; id: string } | null>(
    null
  );

  const loadAll = async () => {
    setLoading(true);
    setError('');
    try {
      const [pRes, tRes] = await Promise.all([
        fetch('/api/admin/partner-withdrawals'),
        fetch('/api/admin/team-withdrawals'),
      ]);
      if (!pRes.ok || !tRes.ok) {
        throw new Error('Erro ao carregar saques');
      }
      const [pJson, tJson] = await Promise.all([pRes.json(), tRes.json()]);
      setPartners(Array.isArray(pJson) ? pJson : []);
      setTeams(Array.isArray(tJson) ? tJson : []);
    } catch (e) {
      setError((e as Error).message || 'Erro ao carregar saques');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAll();
  }, []);

  const triggerUpload = (kind: 'partner' | 'team', id: string) => {
    setUploadContext({ kind, id });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileChange: React.ChangeEventHandler<HTMLInputElement> = async (event) => {
    const file = event.target.files?.[0];
    if (!file || !uploadContext) return;
    setSavingId(uploadContext.id);
    setError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const uploadRes = await fetch('/api/admin/upload', { method: 'POST', body: fd });
      const uploadJson = await uploadRes.json();
      if (!uploadRes.ok || !uploadJson?.url) {
        throw new Error(uploadJson?.error || 'Erro no upload do recibo');
      }
      const receiptUrl: string = uploadJson.url;
      const endpoint =
        uploadContext.kind === 'partner'
          ? `/api/admin/partner-withdrawals/${uploadContext.id}/receipt`
          : `/api/admin/team-withdrawals/${uploadContext.id}/receipt`;
      const res = await fetch(endpoint, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiptUrl }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || 'Erro ao salvar recibo');
      }
      await loadAll();
    } catch (e) {
      setError((e as Error).message || 'Erro ao enviar recibo');
    } finally {
      setSavingId(null);
      setUploadContext(null);
    }
  };

  const handleMarkPaid = async (kind: 'partner' | 'team', id: string) => {
    const reference = window.prompt('Referência do pagamento (opcional):') ?? '';
    setSavingId(id);
    setError('');
    try {
      const endpoint =
        kind === 'partner'
          ? `/api/admin/partner-withdrawals/${id}/pay`
          : `/api/admin/team-withdrawals/${id}/pay`;
      const res = await fetch(endpoint, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentReference: reference || null }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || 'Erro ao marcar como pago');
      }
      await loadAll();
    } catch (e) {
      setError((e as Error).message || 'Erro ao marcar saque como pago');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 space-y-10">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Saques</h1>
        <p className="text-netflix-light">
          Aprove saques de parceiros e times. Anexe o recibo e depois marque como pago. Prazo padrão: até 3 dias úteis.
        </p>
      </div>

      {error && (
        <div className="rounded border border-red-500/40 bg-red-900/30 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-netflix-light">Carregando...</p>
      ) : (
        <>
          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-white">Parceiros</h2>
            {partners.length === 0 ? (
              <p className="text-netflix-light text-sm">Nenhum saque de parceiro até o momento.</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-white/10 bg-netflix-dark">
                <table className="min-w-full text-sm">
                  <thead className="bg-white/5 text-netflix-light">
                    <tr>
                      <th className="px-4 py-3 text-left">Parceiro</th>
                      <th className="px-4 py-3 text-right">Valor</th>
                      <th className="px-4 py-3 text-left">Favorecido / PIX</th>
                      <th className="px-4 py-3 text-left">Status</th>
                      <th className="px-4 py-3 text-left">Solicitado em</th>
                      <th className="px-4 py-3 text-left">Pago em</th>
                      <th className="px-4 py-3 text-left">Recibo</th>
                      <th className="px-4 py-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {partners.map((w) => (
                      <tr key={w.id}>
                        <td className="px-4 py-3 text-netflix-light">
                          <div className="font-medium text-white">{w.partnerName}</div>
                          <div className="text-xs text-netflix-light">
                            {w.partnerCompanyName || ''} {w.partnerRefCode && ` · ${w.partnerRefCode}`}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right text-white font-semibold">
                          {formatMoney(w.amountCents)}
                        </td>
                        <td className="px-4 py-3 text-netflix-light text-xs max-w-[180px]">
                          {w.pixName && <span className="block font-medium text-white">{w.pixName}</span>}
                          {w.pixKey ? (
                            <span className="text-netflix-light" title={w.pixKey}>
                              {(w.pixKeyType && `${w.pixKeyType} • `) || ''}{w.pixKey}
                            </span>
                          ) : (
                            <span className="opacity-60">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-netflix-light">
                          {w.status === 'paid'
                            ? 'Pago'
                            : w.status === 'processing'
                            ? 'Em processamento'
                            : w.status === 'canceled'
                            ? 'Cancelado'
                            : 'Solicitado'}
                        </td>
                        <td className="px-4 py-3 text-netflix-light">{formatDate(w.requestedAt)}</td>
                        <td className="px-4 py-3 text-netflix-light">{formatDate(w.paidAt)}</td>
                        <td className="px-4 py-3 text-netflix-light">
                          {w.receiptUrl ? (
                            <a
                              href={w.receiptUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-netflix-red hover:underline"
                            >
                              Ver recibo
                            </a>
                          ) : (
                            <span className="text-xs opacity-60">Sem recibo</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right space-x-2">
                          <button
                            type="button"
                            onClick={() => triggerUpload('partner', w.id)}
                            className="inline-flex items-center rounded bg-white/5 px-3 py-1 text-xs text-netflix-light hover:bg-white/10"
                            disabled={savingId === w.id}
                          >
                            {savingId === w.id && uploadContext?.kind === 'partner'
                              ? 'Enviando...'
                              : w.receiptUrl
                              ? 'Alterar recibo'
                              : 'Subir recibo'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMarkPaid('partner', w.id)}
                            disabled={savingId === w.id || w.status === 'paid'}
                            className="inline-flex items-center rounded bg-netflix-red px-3 py-1 text-xs text-white hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {savingId === w.id ? 'Salvando...' : 'Marcar como pago'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold text-white">Times</h2>
            {teams.length === 0 ? (
              <p className="text-netflix-light text-sm">Nenhum saque de time até o momento.</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-white/10 bg-netflix-dark">
                <table className="min-w-full text-sm">
                  <thead className="bg-white/5 text-netflix-light">
                    <tr>
                      <th className="px-4 py-3 text-left">Time</th>
                      <th className="px-4 py-3 text-right">Valor</th>
                      <th className="px-4 py-3 text-left">Favorecido / PIX</th>
                      <th className="px-4 py-3 text-left">Status</th>
                      <th className="px-4 py-3 text-left">Solicitado em</th>
                      <th className="px-4 py-3 text-left">Pago em</th>
                      <th className="px-4 py-3 text-left">Recibo</th>
                      <th className="px-4 py-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {teams.map((w) => (
                      <tr key={w.id}>
                        <td className="px-4 py-3 text-netflix-light">
                          <div className="font-medium text-white">{w.teamName}</div>
                        </td>
                        <td className="px-4 py-3 text-right text-white font-semibold">
                          {formatMoney(w.amountCents)}
                        </td>
                        <td className="px-4 py-3 text-netflix-light text-xs max-w-[180px]">
                          {w.pixName && <span className="block font-medium text-white">{w.pixName}</span>}
                          {w.pixKey ? (
                            <span className="text-netflix-light" title={w.pixKey}>
                              {(w.pixKeyType && `${w.pixKeyType} • `) || ''}{w.pixKey}
                            </span>
                          ) : (
                            <span className="opacity-60">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-netflix-light">
                          {w.status === 'paid'
                            ? 'Pago'
                            : w.status === 'processing'
                            ? 'Em processamento'
                            : w.status === 'canceled'
                            ? 'Cancelado'
                            : 'Solicitado'}
                        </td>
                        <td className="px-4 py-3 text-netflix-light">{formatDate(w.requestedAt)}</td>
                        <td className="px-4 py-3 text-netflix-light">{formatDate(w.paidAt)}</td>
                        <td className="px-4 py-3 text-netflix-light">
                          {w.receiptUrl ? (
                            <a
                              href={w.receiptUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-netflix-red hover:underline"
                            >
                              Ver recibo
                            </a>
                          ) : (
                            <span className="text-xs opacity-60">Sem recibo</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right space-x-2">
                          <button
                            type="button"
                            onClick={() => triggerUpload('team', w.id)}
                            className="inline-flex items-center rounded bg-white/5 px-3 py-1 text-xs text-netflix-light hover:bg-white/10"
                            disabled={savingId === w.id}
                          >
                            {savingId === w.id && uploadContext?.kind === 'team'
                              ? 'Enviando...'
                              : w.receiptUrl
                              ? 'Alterar recibo'
                              : 'Subir recibo'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMarkPaid('team', w.id)}
                            disabled={savingId === w.id || w.status === 'paid'}
                            className="inline-flex items-center rounded bg-netflix-red px-3 py-1 text-xs text-white hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {savingId === w.id ? 'Salvando...' : 'Marcar como pago'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}

      {/* Input hidden para upload de recibos */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}

