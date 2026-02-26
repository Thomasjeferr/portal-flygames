'use client';

import React, { useState, useEffect } from 'react';

const PIX_KEY_TYPES = [
  { value: 'cpf', label: 'CPF' },
  { value: 'cnpj', label: 'CNPJ' },
  { value: 'email', label: 'E-mail' },
  { value: 'phone', label: 'Telefone' },
  { value: 'aleatoria', label: 'Chave aleatória' },
] as const;

function maskPixKey(key: string, keyType: string | null): string {
  if (!key || key.length < 6) return '••••••';
  const k = key.replace(/\D/g, '');
  if (keyType === 'email') return key.replace(/(.{2}).*(@.*)/, '$1***$2');
  if (k.length <= 4) return '••••' + key.slice(-2);
  return key.slice(0, 3) + '••••••' + key.slice(-2);
}

export type WithdrawalPixPayload =
  | { useProfile: true }
  | { useProfile: false; pixKey: string; pixKeyType: string; pixName: string };

type ExistingPix = {
  key: string;
  keyType: string | null;
  name: string | null;
};

interface WithdrawalPixModalProps {
  open: boolean;
  onClose: () => void;
  amountCents: number;
  existingPix?: ExistingPix | null;
  onSubmit: (data: WithdrawalPixPayload) => void;
  submitting?: boolean;
}

function formatMoney(cents: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(cents / 100);
}

export function WithdrawalPixModal({
  open,
  onClose,
  amountCents,
  existingPix,
  onSubmit,
  submitting = false,
}: WithdrawalPixModalProps) {
  const [useOtherKey, setUseOtherKey] = useState(false);
  const [pixKeyType, setPixKeyType] = useState<string>('cpf');
  const [pixKey, setPixKey] = useState('');
  const [pixName, setPixName] = useState('');
  const [error, setError] = useState('');

  const showForm = !existingPix?.key || useOtherKey;

  useEffect(() => {
    if (!open) {
      setUseOtherKey(false);
      setPixKeyType('cpf');
      setPixKey('');
      setPixName('');
      setError('');
    }
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!showForm && existingPix) {
      onSubmit({ useProfile: true });
      return;
    }
    const key = pixKey.trim();
    const name = pixName.trim();
    if (!key || !name) {
      setError('Preencha a chave PIX e o nome do titular.');
      return;
    }
    onSubmit({
      useProfile: false,
      pixKey: key,
      pixKeyType,
      pixName: name,
    });
  };

  if (!open) return null;

  const typeLabel = PIX_KEY_TYPES.find((t) => t.value === existingPix?.keyType)?.label ?? 'Chave';
  const existingLabel = existingPix
    ? `${typeLabel} • ${maskPixKey(existingPix.key, existingPix.keyType)}${existingPix.name ? ` — ${existingPix.name}` : ''}`
    : '';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
      aria-labelledby="withdrawal-pix-title"
    >
      <div
        className="bg-futvar-dark border border-futvar-green/30 rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="withdrawal-pix-title" className="text-lg font-semibold text-white">
          Solicitar saque
        </h2>
        <p className="text-futvar-light text-sm">
          Informe onde deseja receber o pagamento por PIX.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {existingPix?.key && (
            <div className="rounded-lg border border-white/10 bg-white/5 p-4 space-y-3">
              <p className="text-futvar-light text-sm font-medium">Receber na chave cadastrada?</p>
              <p className="text-white text-sm">{existingLabel}</p>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useOtherKey}
                  onChange={(e) => setUseOtherKey(e.target.checked)}
                  className="rounded border-white/30 text-futvar-green focus:ring-futvar-green"
                />
                <span className="text-futvar-light text-sm">Usar outra chave nesta solicitação</span>
              </label>
            </div>
          )}

          {showForm && (
            <div className="space-y-3 pt-1">
              <p className="text-futvar-light text-sm font-medium">Dados PIX para este saque</p>
              <div>
                <label className="block text-xs text-futvar-light mb-1">Tipo de chave</label>
                <select
                  value={pixKeyType}
                  onChange={(e) => setPixKeyType(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-futvar-darker border border-white/20 text-white text-sm focus:outline-none focus:ring-2 focus:ring-futvar-green"
                >
                  {PIX_KEY_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-futvar-light mb-1">Chave PIX</label>
                <input
                  type="text"
                  value={pixKey}
                  onChange={(e) => setPixKey(e.target.value)}
                  placeholder="Digite a chave PIX"
                  className="w-full px-3 py-2 rounded-lg bg-futvar-darker border border-white/20 text-white text-sm placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-futvar-green"
                />
              </div>
              <div>
                <label className="block text-xs text-futvar-light mb-1">Nome do titular</label>
                <input
                  type="text"
                  value={pixName}
                  onChange={(e) => setPixName(e.target.value)}
                  placeholder="Nome completo ou razão social"
                  className="w-full px-3 py-2 rounded-lg bg-futvar-darker border border-white/20 text-white text-sm placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-futvar-green"
                />
              </div>
            </div>
          )}

          <p className="text-white font-medium text-sm pt-1">
            Valor a receber: <span className="text-futvar-green">{formatMoney(amountCents)}</span>
          </p>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg border border-white/20 text-futvar-light text-sm font-medium hover:bg-white/5"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-2.5 rounded-lg bg-futvar-green text-futvar-darker font-semibold text-sm hover:bg-futvar-green-light disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Enviando...' : 'Confirmar e solicitar saque'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
