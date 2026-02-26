'use client';

import { useState, useCallback } from 'react';

const PARA_TIMES_PATH = '/para-times';
const WHATSAPP_MESSAGE = `Olá! Gostaria que nosso time fosse cadastrado no Portal Futvar. Aqui o link para o responsável cadastrar:`;

export function NaoEncontrouTimeCTA() {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [requestTeamName, setRequestTeamName] = useState('');
  const [requestSending, setRequestSending] = useState(false);
  const [requestDone, setRequestDone] = useState(false);
  const [requestError, setRequestError] = useState('');

  const fullUrl = typeof window !== 'undefined' ? `${window.location.origin}${PARA_TIMES_PATH}` : '';

  const handleCopyLink = useCallback(async () => {
    if (!fullUrl) return;
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }, [fullUrl]);

  const handleWhatsApp = useCallback(() => {
    const text = encodeURIComponent(`${WHATSAPP_MESSAGE} ${fullUrl}`);
    const url = `https://wa.me/?text=${text}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }, [fullUrl]);

  const handleSolicitar = useCallback(async () => {
    setRequestError('');
    setRequestSending(true);
    try {
      const res = await fetch('/api/public/team-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          teamName: requestTeamName.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        setRequestDone(true);
        setRequestTeamName('');
      } else {
        setRequestError(data.error || 'Erro ao enviar. Tente de novo.');
      }
    } catch {
      setRequestError('Erro de conexão. Tente de novo.');
    } finally {
      setRequestSending(false);
    }
  }, [requestTeamName]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm text-futvar-green hover:underline"
      >
        Não encontrou seu time?
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
          onClick={() => setOpen(false)}
          aria-modal="true"
          role="dialog"
          aria-labelledby="modal-title"
        >
          <div
            className="bg-futvar-dark border border-futvar-green/30 rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="modal-title" className="text-lg font-semibold text-white">
              Seu time não está na lista?
            </h2>
            <p className="text-futvar-light text-sm">
              Compartilhe com o responsável pelo seu time para que ele possa cadastrar o clube no portal. Ou solicite ao portal e acompanhamos a demanda.
            </p>

            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={handleCopyLink}
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-white/10 text-white hover:bg-white/15 text-sm font-medium"
              >
                {copied ? 'Link copiado!' : 'Copiar link para enviar'}
              </button>
              <button
                type="button"
                onClick={handleWhatsApp}
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-[#25D366]/20 text-white hover:bg-[#25D366]/30 text-sm font-medium border border-[#25D366]/40"
              >
                Abrir WhatsApp para enviar ao responsável
              </button>
            </div>

            <div className="pt-3 border-t border-white/10 space-y-2">
              <p className="text-futvar-light text-xs font-medium">Solicitar ao portal</p>
              {requestDone ? (
                <p className="text-futvar-green text-sm">Solicitação registrada. Obrigado!</p>
              ) : (
                <>
                  <input
                    type="text"
                    value={requestTeamName}
                    onChange={(e) => setRequestTeamName(e.target.value)}
                    placeholder="Nome do time (opcional)"
                    className="w-full px-3 py-2 rounded-lg bg-futvar-darker border border-white/20 text-white text-sm placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-futvar-green"
                  />
                  {requestError && <p className="text-red-400 text-xs">{requestError}</p>}
                  <button
                    type="button"
                    onClick={handleSolicitar}
                    disabled={requestSending}
                    className="w-full py-2 rounded-lg bg-futvar-green/20 text-futvar-green hover:bg-futvar-green/30 text-sm font-medium disabled:opacity-50"
                  >
                    {requestSending ? 'Enviando...' : 'Enviar solicitação'}
                  </button>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="w-full py-2 text-futvar-light hover:text-white text-sm"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </>
  );
}
