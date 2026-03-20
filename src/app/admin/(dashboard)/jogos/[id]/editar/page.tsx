'use client';

import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { formatLiveDatetimeForInput } from '@/lib/liveTimezone';
import { extractYouTubeVideoId, getYouTubeThumbnailUrl } from '@/lib/youtube';
import { StreamVideoField } from '@/components/admin/StreamVideoField';
import { GameHighlightsAdmin } from '@/components/admin/GameHighlightsAdmin';

export default function EditGamePage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const fileInput = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedOk, setSavedOk] = useState(false);
  const [error, setError] = useState('');
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [teams, setTeams] = useState<Array<{ id: string; name: string; shortName: string | null; crestUrl: string | null }>>([]);
  const [engagement, setEngagement] = useState<{ shareCount: number; likeCount: number; commentCount: number; pendingComments: number } | null>(null);
  type ContractCredRow = {
    side: string;
    active: boolean;
    maxConcurrentStreams: number;
    loginUsername: string;
    revokedAt: string | null;
    credentialsSentAt: string | null;
  };
  const [contractCredentials, setContractCredentials] = useState<ContractCredRow[]>([]);
  const [contractBusy, setContractBusy] = useState<'home' | 'away' | null>(null);
  const [contractFlash, setContractFlash] = useState<{ title: string; body: string } | null>(null);
  const [maxScreensHome, setMaxScreensHome] = useState('10');
  const [maxScreensAway, setMaxScreensAway] = useState('10');
  const [form, setForm] = useState({
    title: '',
    championship: '',
    gameDate: '',
    description: '',
    videoUrl: '',
    thumbnailUrl: '',
    categoryId: '' as string,
    featured: false,
    homeTeamId: '' as string,
    awayTeamId: '' as string,
    displayMode: 'internal' as 'internal' | 'public_no_media' | 'public_with_media',
    homeScore: '' as string,
    awayScore: '' as string,
    venue: '',
    referee: '',
    contractCredentialsEnabled: false,
  });

  useEffect(() => {
    fetch('/api/admin/categories?limit=100')
      .then((r) => r.json())
      .then((data) => setCategories(Array.isArray(data?.categories) ? data.categories : []))
      .catch(() => {});
  }, []);
  useEffect(() => {
    fetch('/api/admin/teams?limit=100')
      .then((r) => r.json())
      .then((data) => setTeams(Array.isArray(data?.teams) ? data.teams : []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch(`/api/admin/games/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
          return;
        }
        let thumbnailUrl = data.thumbnailUrl || '';
        if (!thumbnailUrl && data.videoUrl) {
          const vid = extractYouTubeVideoId(data.videoUrl);
          if (vid) thumbnailUrl = getYouTubeThumbnailUrl(vid);
        }
        setForm({
          title: data.title,
          championship: data.championship,
          gameDate: formatLiveDatetimeForInput(data.gameDate),
          description: data.description || '',
          videoUrl: data.videoUrl || '',
          thumbnailUrl,
          categoryId: data.categoryId || '',
          featured: data.featured ?? false,
          homeTeamId: data.homeTeamId || '',
          awayTeamId: data.awayTeamId || '',
          displayMode: data.displayMode ?? 'internal',
          homeScore: data.homeScore != null ? String(data.homeScore) : '',
          awayScore: data.awayScore != null ? String(data.awayScore) : '',
          venue: data.venue || '',
          referee: data.referee || '',
          contractCredentialsEnabled: data.contractCredentialsEnabled ?? false,
        });
        if (Array.isArray(data.contractCredentials)) {
          setContractCredentials(data.contractCredentials);
        }
        setEngagement({
          shareCount: data.shareCount ?? 0,
          likeCount: data.likeCount ?? 0,
          commentCount: data.commentCount ?? 0,
          pendingComments: data.pendingComments ?? 0,
        });
      })
      .catch(() => setError('Erro ao carregar'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/admin/upload', { method: 'POST', body: fd });
    const data = await res.json();
    if (res.ok && data.url) {
      const url = data.url.startsWith('http') ? data.url : (typeof window !== 'undefined' ? window.location.origin : '') + data.url;
      setForm((f) => ({ ...f, thumbnailUrl: url }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSavedOk(false);
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/games/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          thumbnailUrl: form.thumbnailUrl || '',
          categoryId: form.categoryId || null,
          homeTeamId: form.homeTeamId || null,
          awayTeamId: form.awayTeamId || null,
          homeScore: form.homeScore === '' ? null : Number(form.homeScore),
          awayScore: form.awayScore === '' ? null : Number(form.awayScore),
          contractCredentialsEnabled: form.contractCredentialsEnabled,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Erro ao atualizar');
        return;
      }
      setSavedOk(true);
      await reloadGameCredentials();
      router.refresh();
    } catch {
      setError('Erro de conexão');
    } finally {
      setSaving(false);
    }
  };

  const reloadGameCredentials = async () => {
    const r = await fetch(`/api/admin/games/${id}`);
    const data = await r.json();
    if (!data.error) {
      setForm((f) => ({ ...f, contractCredentialsEnabled: data.contractCredentialsEnabled ?? false }));
      if (Array.isArray(data.contractCredentials)) setContractCredentials(data.contractCredentials);
    }
  };

  const runContractAction = async (body: Record<string, unknown>, side: 'home' | 'away') => {
    setContractBusy(side);
    setContractFlash(null);
    try {
      const r = await fetch(`/api/admin/games/${id}/contract-credentials`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await r.json();
      if (!r.ok) {
        setContractFlash({ title: 'Erro', body: data.error || 'Falha na operação' });
        return;
      }
      if (data.username && data.password) {
        setContractFlash({
          title: 'Credenciais geradas',
          body: `Usuário (cole no campo E-mail em Entrar):\n${data.username}\n\nSenha:\n${data.password}`,
        });
      } else {
        setContractFlash({ title: 'OK', body: data.message || 'Operação concluída.' });
      }
      await reloadGameCredentials();
    } catch {
      setContractFlash({ title: 'Erro', body: 'Falha de conexão' });
    } finally {
      setContractBusy(null);
    }
  };

  const credFor = (side: string) => contractCredentials.find((c) => c.side === side);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-10">
        <p className="text-netflix-light">Carregando...</p>
      </div>
    );
  }

  if (error && !form.title) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-10">
        <p className="text-netflix-red">{error}</p>
        <Link href="/admin/jogos" className="text-netflix-light hover:text-white mt-4 inline-block">
          Voltar aos jogos
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <div className="mb-8">
        <Link href="/admin/jogos" className="text-netflix-light hover:text-white text-sm">
          ← Voltar aos jogos
        </Link>
      </div>
      <h1 className="text-2xl font-bold text-white mb-6">Editar jogo</h1>
      {engagement != null && (
        <div className="mb-6 p-4 rounded-lg bg-netflix-dark border border-white/10">
          <h2 className="text-sm font-semibold text-white mb-2">Engajamento</h2>
          <div className="flex flex-wrap gap-4 text-sm text-netflix-light">
            <span>Compartilhamentos: <strong className="text-white">{engagement.shareCount}</strong></span>
            <span>Curtidas: <strong className="text-white">{engagement.likeCount}</strong></span>
            <span>Comentários: <strong className="text-white">{engagement.commentCount}</strong>{engagement.pendingComments > 0 && <span className="text-amber-400"> ({engagement.pendingComments} pendentes)</span>}</span>
            <Link href={`/admin/comentarios?type=game&gameId=${id}`} className="text-netflix-red hover:underline">
              Ver comentários →
            </Link>
          </div>
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-5 bg-netflix-dark border border-white/10 rounded-lg p-6">
        {savedOk && (
          <p className="text-emerald-200 text-sm bg-emerald-500/10 border border-emerald-500/30 rounded px-3 py-2">
            Jogo salvo. Você pode gerar credenciais de contrato na seção abaixo do formulário.
          </p>
        )}
        {error && (
          <p className="text-netflix-red text-sm bg-red-500/10 border border-red-500/30 rounded px-3 py-2">
            {error}
          </p>
        )}
        <div>
          <label className="block text-sm font-medium text-netflix-light mb-2">Times (opcional)</label>
          <p className="text-xs text-netflix-light mb-2">Selecione times já cadastrados para exibir nome e logo nos cards da home.</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-netflix-light mb-1">Mandante</label>
              <select
                value={form.homeTeamId}
                onChange={(e) => {
                  const v = e.target.value;
                  setForm((f) => {
                    const next = { ...f, homeTeamId: v };
                    if (v && f.awayTeamId) {
                      const home = teams.find((t) => t.id === v);
                      const away = teams.find((t) => t.id === f.awayTeamId);
                      if (home && away && !f.title) next.title = `${home.name} x ${away.name}`;
                    }
                    return next;
                  });
                }}
                className="w-full px-4 py-3 rounded bg-netflix-gray border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-netflix-red"
              >
                <option value="">— Selecionar —</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>{t.shortName ? `${t.name} (${t.shortName})` : t.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-netflix-light mb-1">Visitante</label>
              <select
                value={form.awayTeamId}
                onChange={(e) => {
                  const v = e.target.value;
                  setForm((f) => {
                    const next = { ...f, awayTeamId: v };
                    if (v && f.homeTeamId) {
                      const home = teams.find((t) => t.id === f.homeTeamId);
                      const away = teams.find((t) => t.id === v);
                      if (home && away && !f.title) next.title = `${home.name} x ${away.name}`;
                    }
                    return next;
                  });
                }}
                className="w-full px-4 py-3 rounded bg-netflix-gray border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-netflix-red"
              >
                <option value="">— Selecionar —</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>{t.shortName ? `${t.name} (${t.shortName})` : t.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-netflix-light mb-2">Título *</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            required
            className="w-full px-4 py-3 rounded bg-netflix-gray border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-netflix-red"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-netflix-light mb-2">Campeonato *</label>
          <input
            type="text"
            value={form.championship}
            onChange={(e) => setForm((f) => ({ ...f, championship: e.target.value }))}
            required
            className="w-full px-4 py-3 rounded bg-netflix-gray border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-netflix-red"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-netflix-light mb-2">Categoria</label>
          <select
            value={form.categoryId}
            onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
            className="w-full px-4 py-3 rounded bg-netflix-gray border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-netflix-red"
          >
            <option value="">Nenhuma</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-netflix-light mb-2">Data do jogo *</label>
          <input
            type="datetime-local"
            value={form.gameDate}
            onChange={(e) => setForm((f) => ({ ...f, gameDate: e.target.value }))}
            required
            className="w-full px-4 py-3 rounded bg-netflix-gray border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-netflix-red"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-netflix-light mb-2">Modo de exibição</label>
          <select
            value={form.displayMode}
            onChange={(e) => setForm((f) => ({ ...f, displayMode: e.target.value as typeof form.displayMode }))}
            className="w-full px-4 py-3 rounded bg-netflix-gray border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-netflix-red"
          >
            <option value="internal">Somente interno (painel do time, não aparece na home)</option>
            <option value="public_no_media">Público sem vídeo (aparece na home como publicação)</option>
            <option value="public_with_media">Público com vídeo/live</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-netflix-light mb-2">Placar – Mandante</label>
            <input
              type="number"
              min={0}
              value={form.homeScore}
              onChange={(e) => setForm((f) => ({ ...f, homeScore: e.target.value }))}
              placeholder="—"
              className="w-full px-4 py-3 rounded bg-netflix-gray border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-netflix-red"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-netflix-light mb-2">Placar – Visitante</label>
            <input
              type="number"
              min={0}
              value={form.awayScore}
              onChange={(e) => setForm((f) => ({ ...f, awayScore: e.target.value }))}
              placeholder="—"
              className="w-full px-4 py-3 rounded bg-netflix-gray border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-netflix-red"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-netflix-light mb-2">Local da partida</label>
          <input
            type="text"
            value={form.venue}
            onChange={(e) => setForm((f) => ({ ...f, venue: e.target.value }))}
            placeholder="Ex: Campo do Bairro"
            className="w-full px-4 py-3 rounded bg-netflix-gray border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-netflix-red"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-netflix-light mb-2">Árbitro</label>
          <input
            type="text"
            value={form.referee}
            onChange={(e) => setForm((f) => ({ ...f, referee: e.target.value }))}
            placeholder="Nome do árbitro"
            className="w-full px-4 py-3 rounded bg-netflix-gray border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-netflix-red"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-netflix-light mb-2">Descrição</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            rows={3}
            className="w-full px-4 py-3 rounded bg-netflix-gray border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-netflix-red resize-none"
          />
        </div>
        <StreamVideoField
          value={form.videoUrl}
          onChange={(url) => {
            setForm((f) => {
              const next = { ...f, videoUrl: url };
              if (url) {
                const vid = extractYouTubeVideoId(url);
                if (vid && !f.thumbnailUrl) next.thumbnailUrl = getYouTubeThumbnailUrl(vid);
              }
              return next;
            });
          }}
          required={false}
          label="Link do vídeo (opcional)"
          helpText="YouTube, Vimeo ou PandaVideo. Se for YouTube e o campo thumbnail estiver vazio, será preenchido automaticamente."
        />
        <div>
          <label className="block text-sm font-medium text-netflix-light mb-2">Thumbnail</label>
          <input type="file" ref={fileInput} accept="image/*" className="hidden" onChange={handleUpload} />
          <div className="flex gap-3 items-center flex-wrap">
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              className="px-4 py-2 rounded bg-netflix-gray text-white text-sm hover:bg-white/20"
            >
              Upload imagem
            </button>
            <span className="text-xs text-netflix-light">ou</span>
            <input
              type="url"
              value={form.thumbnailUrl}
              onChange={(e) => setForm((f) => ({ ...f, thumbnailUrl: e.target.value }))}
              placeholder="URL da imagem"
              className="flex-1 min-w-[200px] px-4 py-2 rounded bg-netflix-gray border border-white/20 text-white text-sm focus:outline-none focus:ring-2 focus:ring-netflix-red"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="featured"
            checked={form.featured}
            onChange={(e) => setForm((f) => ({ ...f, featured: e.target.checked }))}
            className="rounded border-white/30 text-netflix-red focus:ring-netflix-red"
          />
          <label htmlFor="featured" className="text-sm text-netflix-light">
            Destacar na página inicial
          </label>
        </div>
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-2">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="contractCredentialsEnabled"
              checked={form.contractCredentialsEnabled}
              onChange={(e) => setForm((f) => ({ ...f, contractCredentialsEnabled: e.target.checked }))}
              className="rounded border-white/30 text-emerald-500 focus:ring-emerald-500"
            />
            <label htmlFor="contractCredentialsEnabled" className="text-sm font-medium text-white">
              Acesso por contrato (credenciais por time)
            </label>
          </div>
          <p className="text-xs text-netflix-light leading-relaxed">
            <strong className="text-emerald-200/90">Desligado por padrão.</strong> Quando ativo, você pode gerar usuário e senha separados para mandante e visitante (pagamento fora da plataforma), cada um com limite de telas.
            O jogo continua podendo aparecer na grade normal. Assinantes e compradores não são afetados.
            <span className="block mt-1">Após marcar, clique em <strong>Salvar</strong>; só então use a seção abaixo para gerar credenciais.</span>
          </p>
        </div>
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3 rounded bg-netflix-red text-white font-semibold hover:bg-red-600 disabled:opacity-50"
          >
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
          <Link
            href="/admin/jogos"
            className="px-6 py-3 rounded bg-netflix-gray text-white font-semibold hover:bg-white/20"
          >
            Cancelar
          </Link>
        </div>
      </form>

      <div className="mt-8 rounded-lg border border-white/10 bg-netflix-dark p-6 space-y-4">
        <h2 className="text-lg font-semibold text-white border-l-4 border-emerald-500 pl-3">
          Credenciais de contrato (mandante / visitante)
        </h2>
        {!form.contractCredentialsEnabled && (
          <p className="text-sm text-amber-200/90">
            Ative a opção acima, salve o jogo, e recarregue se necessário — assim você poderá gerar logins sem conflito com pré-estreia ou assinaturas.
          </p>
        )}
        {contractFlash && (
          <div className="rounded border border-white/20 bg-black/30 p-3 text-sm">
            <p className="font-semibold text-white mb-1">{contractFlash.title}</p>
            <pre className="text-emerald-100/90 whitespace-pre-wrap break-all text-xs">{contractFlash.body}</pre>
            <button
              type="button"
              onClick={() => setContractFlash(null)}
              className="mt-2 text-xs text-netflix-light underline"
            >
              Fechar
            </button>
          </div>
        )}
        <div className="grid md:grid-cols-2 gap-6">
          {(['home', 'away'] as const).map((side) => {
            const label = side === 'home' ? 'Mandante' : 'Visitante';
            const c = credFor(side);
            const active = c?.active && !c?.revokedAt;
            const busy = contractBusy === side;
            return (
              <div key={side} className="rounded-lg border border-white/10 p-4 space-y-3">
                <h3 className="text-sm font-semibold text-white">{label}</h3>
                {c ? (
                  <div className="text-xs text-netflix-light space-y-1">
                    <p>
                      Status:{' '}
                      <strong className={active ? 'text-emerald-400' : 'text-amber-400'}>
                        {active ? 'Ativa' : 'Revogada / inativa'}
                      </strong>
                    </p>
                    <p className="break-all">
                      Usuário: <strong className="text-white">{c.loginUsername}</strong>
                    </p>
                    <p>Telas simultâneas: {c.maxConcurrentStreams}</p>
                  </div>
                ) : (
                  <p className="text-xs text-netflix-light">Nenhuma credencial gerada.</p>
                )}
                <div className="flex flex-col gap-2">
                  <label className="text-xs text-netflix-light">Limite de telas (nova credencial)</label>
                  <input
                    type="number"
                    min={1}
                    max={500}
                    value={side === 'home' ? maxScreensHome : maxScreensAway}
                    onChange={(e) =>
                      side === 'home' ? setMaxScreensHome(e.target.value) : setMaxScreensAway(e.target.value)
                    }
                    className="w-full px-3 py-2 rounded bg-netflix-gray border border-white/20 text-white text-sm"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busy || !form.contractCredentialsEnabled}
                    onClick={() =>
                      runContractAction(
                        {
                          action: 'generate',
                          side,
                          maxConcurrentStreams: parseInt(side === 'home' ? maxScreensHome : maxScreensAway, 10) || 10,
                        },
                        side
                      )
                    }
                    className="px-3 py-1.5 rounded bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-500 disabled:opacity-40"
                  >
                    {busy ? '...' : 'Gerar credencial'}
                  </button>
                  <button
                    type="button"
                    disabled={busy || !form.contractCredentialsEnabled || !active}
                    onClick={() => runContractAction({ action: 'regenerate', side }, side)}
                    className="px-3 py-1.5 rounded bg-netflix-gray text-white text-xs hover:bg-white/20 disabled:opacity-40"
                  >
                    Regenerar senha
                  </button>
                  <button
                    type="button"
                    disabled={busy || !c}
                    onClick={() => runContractAction({ action: 'revoke', side }, side)}
                    className="px-3 py-1.5 rounded bg-red-900/80 text-white text-xs hover:bg-red-800 disabled:opacity-40"
                  >
                    Revogar
                  </button>
                </div>
                {c && active && (
                  <button
                    type="button"
                    disabled={busy || !form.contractCredentialsEnabled}
                    onClick={() =>
                      runContractAction(
                        {
                          action: 'update_max',
                          side,
                          maxConcurrentStreams: parseInt(side === 'home' ? maxScreensHome : maxScreensAway, 10) || 10,
                        },
                        side
                      )
                    }
                    className="text-xs text-emerald-400 hover:underline disabled:opacity-40"
                  >
                    Atualizar só o limite de telas
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <GameHighlightsAdmin gameId={id} />
    </div>
  );
}
