'use client';

import React, { useCallback, useEffect, useState } from 'react';

export interface CommentItem {
  id: string;
  body: string;
  createdAt: string;
  userName: string;
  status?: 'approved' | 'pending';
}

interface PlayerCommentSectionProps {
  apiBasePath: string;
  placeholder?: string;
  submitLabel?: string;
  title?: string;
  className?: string;
}

export function PlayerCommentSection({
  apiBasePath,
  placeholder = 'Escreva um comentário...',
  submitLabel = 'Enviar',
  title = 'Comentários',
  className = '',
}: PlayerCommentSectionProps) {
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(
    (pageNum: number = 1) => {
      setLoading(true);
      fetch(`${apiBasePath}?page=${pageNum}`, { credentials: 'include' })
        .then(async (r) => {
          const text = await r.text();
          return text ? (() => { try { return JSON.parse(text); } catch { return {}; } })() : {};
        })
        .then((d) => {
          const pending = d.myPendingComments ?? [];
          const approved = d.comments ?? [];
          setComments([...pending, ...approved]);
          setTotal(d.total ?? 0);
          setPage(d.page ?? 1);
          setTotalPages(d.totalPages ?? 1);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    },
    [apiBasePath]
  );

  useEffect(() => {
    load(1);
  }, [load]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = body.trim();
    if (!text || submitting) return;
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch(apiBasePath, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ body: text }),
      });
      const resText = await res.text();
      const data = resText ? (() => { try { return JSON.parse(resText); } catch { return {}; } })() : {};
      if (res.ok) {
        setBody('');
        setError('');
        load(1);
      } else if (res.status === 401) {
        setError(data.error || 'Faça login para comentar.');
        window.location.href = `/entrar?redirect=${encodeURIComponent(window.location.pathname)}`;
      } else {
        setError(data.error || 'Erro ao enviar.');
      }
    } catch {
      setError('Erro de conexão.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (iso: string) => {
    try {
      const d = new Date(iso);
      const now = new Date();
      const diff = now.getTime() - d.getTime();
      if (diff < 60000) return 'Agora';
      if (diff < 3600000) return `${Math.floor(diff / 60000)} min atrás`;
      if (d.toDateString() === now.toDateString()) return `Hoje, ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
      return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    } catch {
      return iso;
    }
  };

  return (
    <div className={className}>
      <h3 className="text-white font-semibold mb-3">{title}</h3>
      <form onSubmit={handleSubmit} className="mb-4">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value.slice(0, 500))}
          placeholder={placeholder}
          rows={2}
          maxLength={500}
          className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none text-sm"
        />
        <div className="flex items-center justify-between mt-2">
          <span className="text-white/50 text-xs">{body.length}/500</span>
          <button
            type="submit"
            disabled={!body.trim() || submitting}
            className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Enviando...' : submitLabel}
          </button>
        </div>
        {error && <p className="text-amber-300 text-sm mt-2">{error}</p>}
      </form>
      {loading ? (
        <p className="text-white/60 text-sm">Carregando comentários...</p>
      ) : comments.length === 0 ? (
        <p className="text-white/50 text-sm">Nenhum comentário ainda. Seja o primeiro!</p>
      ) : (
        <ul className="space-y-3">
          {comments.map((c) => (
            <li key={c.id} className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                {(c.userName || 'T').charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-white/80 text-sm font-medium">{c.userName}</p>
                <p className="text-white/90 text-sm">{c.body}</p>
                <p className="text-white/40 text-xs mt-0.5">{formatDate(c.createdAt)}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
      {totalPages > 1 && (
        <div className="mt-4 flex justify-center gap-2">
          <button
            type="button"
            onClick={() => load(page - 1)}
            disabled={page <= 1}
            className="px-3 py-1 rounded bg-white/10 text-white text-sm disabled:opacity-50"
          >
            Anterior
          </button>
          <span className="text-white/60 text-sm py-1">Página {page} de {totalPages}</span>
          <button
            type="button"
            onClick={() => load(page + 1)}
            disabled={page >= totalPages}
            className="px-3 py-1 rounded bg-white/10 text-white text-sm disabled:opacity-50"
          >
            Próxima
          </button>
        </div>
      )}
    </div>
  );
}
