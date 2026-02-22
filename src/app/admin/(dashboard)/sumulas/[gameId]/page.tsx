'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

type Member = { id: string; name: string; number: number | null; position: string | null; role: string };
type Team = { id: string; name: string; shortName: string | null; crestUrl: string | null; members: Member[] };
type StatRow = { teamMemberId: string; goals: number; assists: number; fouls: number; yellowCard: boolean; redCard: boolean; highlight: boolean };
type Approval = { teamId: string; status: string; rejectionReason: string | null; rejectedAt: string | null; approvedAt: string | null };

type GameSumula = {
  id: string;
  title: string;
  championship: string;
  gameDate: string;
  homeScore: number | null;
  awayScore: number | null;
  venue: string | null;
  referee: string | null;
  sumulaPublishedAt: string | null;
  homeTeam: Team | null;
  awayTeam: Team | null;
  homeStats: StatRow[];
  awayStats: StatRow[];
  sumulaApprovals: Approval[];
};

export default function AdminSumulaGamePage() {
  const params = useParams();
  const router = useRouter();
  const gameId = params.gameId as string;
  const [data, setData] = useState<GameSumula | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [homeScore, setHomeScore] = useState<string>('');
  const [awayScore, setAwayScore] = useState<string>('');
  const [homeStats, setHomeStats] = useState<Record<string, StatRow>>({});
  const [awayStats, setAwayStats] = useState<Record<string, StatRow>>({});

  useEffect(() => {
    fetch(`/api/admin/sumulas/games/${gameId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) {
          setError(d.error);
          return;
        }
        setData(d);
        setHomeScore(d.homeScore != null ? String(d.homeScore) : '');
        setAwayScore(d.awayScore != null ? String(d.awayScore) : '');
        const homeMap: Record<string, StatRow> = {};
        for (const s of d.homeStats || []) {
          homeMap[s.teamMemberId] = s;
        }
        for (const m of d.homeTeam?.members || []) {
          if (!homeMap[m.id]) homeMap[m.id] = { teamMemberId: m.id, goals: 0, assists: 0, fouls: 0, yellowCard: false, redCard: false, highlight: false };
        }
        setHomeStats(homeMap);
        const awayMap: Record<string, StatRow> = {};
        for (const s of d.awayStats || []) {
          awayMap[s.teamMemberId] = s;
        }
        for (const m of d.awayTeam?.members || []) {
          if (!awayMap[m.id]) awayMap[m.id] = { teamMemberId: m.id, goals: 0, assists: 0, fouls: 0, yellowCard: false, redCard: false, highlight: false };
        }
        setAwayStats(awayMap);
      })
      .catch(() => setError('Erro ao carregar'))
      .finally(() => setLoading(false));
  }, [gameId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/sumulas/games/${gameId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          homeScore: homeScore === '' ? null : parseInt(homeScore, 10),
          awayScore: awayScore === '' ? null : parseInt(awayScore, 10),
          homeStats: Object.values(homeStats),
          awayStats: Object.values(awayStats),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Erro ao salvar');
        return;
      }
      router.refresh();
      setData(null);
      setLoading(true);
      fetch(`/api/admin/sumulas/games/${gameId}`)
        .then((r) => r.json())
        .then((d) => {
          if (!d.error) setData(d);
          setHomeScore(d.homeScore != null ? String(d.homeScore) : '');
          setAwayScore(d.awayScore != null ? String(d.awayScore) : '');
          const homeMap: Record<string, StatRow> = {};
          for (const s of d.homeStats || []) homeMap[s.teamMemberId] = s;
          for (const m of d.homeTeam?.members || []) {
            if (!homeMap[m.id]) homeMap[m.id] = { teamMemberId: m.id, goals: 0, assists: 0, fouls: 0, yellowCard: false, redCard: false, highlight: false };
          }
          setHomeStats(homeMap);
          const awayMap: Record<string, StatRow> = {};
          for (const s of d.awayStats || []) awayMap[s.teamMemberId] = s;
          for (const m of d.awayTeam?.members || []) {
            if (!awayMap[m.id]) awayMap[m.id] = { teamMemberId: m.id, goals: 0, assists: 0, fouls: 0, yellowCard: false, redCard: false, highlight: false };
          }
          setAwayStats(awayMap);
        })
        .finally(() => setLoading(false));
    } finally {
      setSaving(false);
    }
  };

  const updateHomeStat = (memberId: string, field: keyof StatRow, value: number | boolean) => {
    setHomeStats((prev) => ({
      ...prev,
      [memberId]: { ...(prev[memberId] || { teamMemberId: memberId, goals: 0, assists: 0, fouls: 0, yellowCard: false, redCard: false, highlight: false }), [field]: value },
    }));
  };
  const updateAwayStat = (memberId: string, field: keyof StatRow, value: number | boolean) => {
    setAwayStats((prev) => ({
      ...prev,
      [memberId]: { ...(prev[memberId] || { teamMemberId: memberId, goals: 0, assists: 0, fouls: 0, yellowCard: false, redCard: false, highlight: false }), [field]: value },
    }));
  };

  if (loading && !data) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-10">
        <p className="text-netflix-light">Carregando...</p>
      </div>
    );
  }
  if (error && !data) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-10">
        <p className="text-red-400">{error}</p>
        <Link href="/admin/sumulas" className="text-netflix-red hover:underline mt-4 inline-block">← Voltar</Link>
      </div>
    );
  }
  if (!data) return null;

  const homeApproval = data.sumulaApprovals.find((a) => a.teamId === data.homeTeam?.id);
  const awayApproval = data.sumulaApprovals.find((a) => a.teamId === data.awayTeam?.id);

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <div className="mb-6">
        <Link href="/admin/sumulas" className="text-netflix-light hover:text-white text-sm">← Voltar à lista de súmulas</Link>
      </div>

      <h2 className="text-xl font-bold text-white mb-4">{data.title}</h2>
      <p className="text-netflix-light text-sm mb-6">{data.championship} · {new Date(data.gameDate).toLocaleDateString('pt-BR')}</p>

      {(homeApproval?.status === 'REJEITADA' || awayApproval?.status === 'REJEITADA') && (
        <div className="rounded-lg border border-red-500/50 bg-red-900/20 p-4 mb-6">
          <p className="text-red-300 font-medium mb-2">Motivos de rejeição (visíveis aos times)</p>
          {homeApproval?.status === 'REJEITADA' && homeApproval.rejectionReason && (
            <p className="text-netflix-light text-sm"><strong>Mandante:</strong> {homeApproval.rejectionReason}</p>
          )}
          {awayApproval?.status === 'REJEITADA' && awayApproval.rejectionReason && (
            <p className="text-netflix-light text-sm mt-1"><strong>Visitante:</strong> {awayApproval.rejectionReason}</p>
          )}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-8">
        <div>
          <h3 className="text-lg font-semibold text-white mb-3">Placar</h3>
          <div className="flex items-center gap-3">
            <input
              type="number"
              min={0}
              value={homeScore}
              onChange={(e) => setHomeScore(e.target.value)}
              className="w-20 px-3 py-2 rounded bg-netflix-gray border border-white/20 text-white text-center"
            />
            <span className="text-netflix-light">x</span>
            <input
              type="number"
              min={0}
              value={awayScore}
              onChange={(e) => setAwayScore(e.target.value)}
              className="w-20 px-3 py-2 rounded bg-netflix-gray border border-white/20 text-white text-center"
            />
          </div>
        </div>

        {data.homeTeam && data.homeTeam.members.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-white mb-3">Stats — {data.homeTeam.shortName ?? data.homeTeam.name}</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-netflix-light border-b border-white/10">
                    <th className="py-2 pr-2">Jogador</th>
                    <th className="py-2 px-1 w-14 text-center">G</th>
                    <th className="py-2 px-1 w-14 text-center">A</th>
                    <th className="py-2 px-1 w-14 text-center">F</th>
                    <th className="py-2 px-1 w-10 text-center">Am</th>
                    <th className="py-2 px-1 w-10 text-center">Vm</th>
                    <th className="py-2 px-1 text-center">Destaque</th>
                  </tr>
                </thead>
                <tbody>
                  {data.homeTeam.members.map((m) => (
                    <tr key={m.id} className="border-b border-white/5">
                      <td className="py-1.5 pr-2 text-white">{m.number != null ? `${m.number} · ` : ''}{m.name}</td>
                      <td className="px-1"><input type="number" min={0} value={homeStats[m.id]?.goals ?? 0} onChange={(e) => updateHomeStat(m.id, 'goals', parseInt(e.target.value, 10) || 0)} className="w-12 px-1 py-0.5 rounded bg-netflix-gray border border-white/20 text-white text-center" /></td>
                      <td className="px-1"><input type="number" min={0} value={homeStats[m.id]?.assists ?? 0} onChange={(e) => updateHomeStat(m.id, 'assists', parseInt(e.target.value, 10) || 0)} className="w-12 px-1 py-0.5 rounded bg-netflix-gray border border-white/20 text-white text-center" /></td>
                      <td className="px-1"><input type="number" min={0} value={homeStats[m.id]?.fouls ?? 0} onChange={(e) => updateHomeStat(m.id, 'fouls', parseInt(e.target.value, 10) || 0)} className="w-12 px-1 py-0.5 rounded bg-netflix-gray border border-white/20 text-white text-center" /></td>
                      <td className="px-1 text-center"><input type="checkbox" checked={homeStats[m.id]?.yellowCard ?? false} onChange={(e) => updateHomeStat(m.id, 'yellowCard', e.target.checked)} className="rounded" /></td>
                      <td className="px-1 text-center"><input type="checkbox" checked={homeStats[m.id]?.redCard ?? false} onChange={(e) => updateHomeStat(m.id, 'redCard', e.target.checked)} className="rounded" /></td>
                      <td className="px-1 text-center"><input type="checkbox" checked={homeStats[m.id]?.highlight ?? false} onChange={(e) => updateHomeStat(m.id, 'highlight', e.target.checked)} className="rounded" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {data.awayTeam && data.awayTeam.members.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-white mb-3">Stats — {data.awayTeam.shortName ?? data.awayTeam.name}</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-netflix-light border-b border-white/10">
                    <th className="py-2 pr-2">Jogador</th>
                    <th className="py-2 px-1 w-14 text-center">G</th>
                    <th className="py-2 px-1 w-14 text-center">A</th>
                    <th className="py-2 px-1 w-14 text-center">F</th>
                    <th className="py-2 px-1 w-10 text-center">Am</th>
                    <th className="py-2 px-1 w-10 text-center">Vm</th>
                    <th className="py-2 px-1 text-center">Destaque</th>
                  </tr>
                </thead>
                <tbody>
                  {data.awayTeam.members.map((m) => (
                    <tr key={m.id} className="border-b border-white/5">
                      <td className="py-1.5 pr-2 text-white">{m.number != null ? `${m.number} · ` : ''}{m.name}</td>
                      <td className="px-1"><input type="number" min={0} value={awayStats[m.id]?.goals ?? 0} onChange={(e) => updateAwayStat(m.id, 'goals', parseInt(e.target.value, 10) || 0)} className="w-12 px-1 py-0.5 rounded bg-netflix-gray border border-white/20 text-white text-center" /></td>
                      <td className="px-1"><input type="number" min={0} value={awayStats[m.id]?.assists ?? 0} onChange={(e) => updateAwayStat(m.id, 'assists', parseInt(e.target.value, 10) || 0)} className="w-12 px-1 py-0.5 rounded bg-netflix-gray border border-white/20 text-white text-center" /></td>
                      <td className="px-1"><input type="number" min={0} value={awayStats[m.id]?.fouls ?? 0} onChange={(e) => updateAwayStat(m.id, 'fouls', parseInt(e.target.value, 10) || 0)} className="w-12 px-1 py-0.5 rounded bg-netflix-gray border border-white/20 text-white text-center" /></td>
                      <td className="px-1 text-center"><input type="checkbox" checked={awayStats[m.id]?.yellowCard ?? false} onChange={(e) => updateAwayStat(m.id, 'yellowCard', e.target.checked)} className="rounded" /></td>
                      <td className="px-1 text-center"><input type="checkbox" checked={awayStats[m.id]?.redCard ?? false} onChange={(e) => updateAwayStat(m.id, 'redCard', e.target.checked)} className="rounded" /></td>
                      <td className="px-1 text-center"><input type="checkbox" checked={awayStats[m.id]?.highlight ?? false} onChange={(e) => updateAwayStat(m.id, 'highlight', e.target.checked)} className="rounded" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {error && <p className="text-red-400 text-sm">{error}</p>}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 rounded bg-netflix-red text-white font-medium hover:bg-red-700 disabled:opacity-50"
          >
            {saving ? 'Salvando...' : 'Salvar e enviar para os times'}
          </button>
        </div>
      </form>
    </div>
  );
}
