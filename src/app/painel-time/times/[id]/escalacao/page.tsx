'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';

const PLAYER_ROLES = ['PLAYER', 'GOALKEEPER', 'ATLETA'];

function formationToLines(formation: string): number[] {
  const parts = formation.trim().split('-').map((p) => parseInt(p.trim(), 10));
  if (parts.length === 0 || parts.some((n) => Number.isNaN(n) || n < 0)) return [4, 4, 2];
  return parts;
}

function isValidCustomFormation(input: string): boolean {
  const parts = input.trim().split('-').map((p) => parseInt(p.trim(), 10));
  if (parts.length < 2 || parts.length > 5) return false;
  const valid = parts.every((n) => !Number.isNaN(n) && n >= 1 && n <= 8);
  const sum = parts.reduce((a, b) => a + b, 0);
  return valid && sum >= 1 && sum <= 11;
}

const PRESET_CLASSIC = ['4-4-2', '4-3-3', '3-5-2', '3-4-3', '4-5-1', '5-4-1', '5-3-2'];
const PRESET_ALTERNATIVE = ['4-2-3-1', '4-3-2-1', '3-4-2-1', '4-2-2-2', '3-3-3-1', '4-1-4-1', '3-4-1-2'];
const PRESET_LIVRE = ['2-2-6', '6-2-2', '2-3-5', '5-2-3', '2-4-4', '4-2-4', '1-4-3-2', '1-3-3-3'];

type Member = {
  id: string;
  name: string;
  role: string;
  number: number | null;
  position: string | null;
  photoUrl: string | null;
  isActive: boolean;
};

type LineupSlot = {
  teamMemberId: string;
  lineIndex: number;
  slotIndex: number;
  member?: { id: string; name: string; position: string | null; photoUrl: string | null; number: number | null };
};

function fullUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (typeof window !== 'undefined') {
    const base = window.location.origin;
    return url.startsWith('/') ? `${base}${url}` : `${base}/${url}`;
  }
  const base = process.env.NEXT_PUBLIC_APP_URL || '';
  return url.startsWith('/') ? `${base}${url}` : `${base}/${url}`;
}

export default function EscalacaoPage() {
  const params = useParams();
  const teamId = params.id as string;
  const [members, setMembers] = useState<Member[]>([]);
  const [formation, setFormation] = useState('4-4-2');
  const [customInput, setCustomInput] = useState('');
  const [slots, setSlots] = useState<LineupSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [draggedMember, setDraggedMember] = useState<Member | null>(null);
  const [dragOverSlot, setDragOverSlot] = useState<{ lineIndex: number; slotIndex: number } | null>(null);

  const lines = [1, ...formationToLines(formation)];

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [membersRes, lineupRes] = await Promise.all([
        fetch(`/api/team-portal/teams/${teamId}/members`),
        fetch(`/api/team-portal/teams/${teamId}/lineup`),
      ]);
      const membersData = await membersRes.json();
      const lineupData = await lineupRes.json();

      if (membersData.error) {
        setError(membersData.error);
        setMembers([]);
      } else {
        const list = Array.isArray(membersData) ? membersData : [];
        setMembers(list.filter((m: Member) => PLAYER_ROLES.includes(m.role) && m.isActive));
      }

      if (lineupData.error) {
        setSlots([]);
        setFormation('4-4-2');
      } else {
        setFormation(lineupData.formation || '4-4-2');
        setSlots(lineupData.slots || []);
      }
    } catch {
      setError('Erro ao carregar');
      setMembers([]);
      setSlots([]);
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    if (teamId) load();
  }, [teamId, load]);

  const handleDragStart = (e: React.DragEvent, member: Member) => {
    setDraggedMember(member);
    e.dataTransfer.setData('application/json', JSON.stringify({ id: member.id, name: member.name, position: member.position, photoUrl: member.photoUrl, number: member.number }));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDraggedMember(null);
    setDragOverSlot(null);
  };

  const getSlot = (lineIndex: number, slotIndex: number) =>
    slots.find((s) => s.lineIndex === lineIndex && s.slotIndex === slotIndex);

  const handleDropOnSlot = (e: React.DragEvent, lineIndex: number, slotIndex: number) => {
    e.preventDefault();
    setDragOverSlot(null);
    let data: { id: string; name: string; position: string | null; photoUrl: string | null; number: number | null };
    try {
      data = JSON.parse(e.dataTransfer.getData('application/json'));
    } catch {
      return;
    }
    if (!data?.id) return;

    const memberFromList = members.find((m) => m.id === data.id);
    const memberInfo = memberFromList
      ? { id: memberFromList.id, name: memberFromList.name, position: memberFromList.position, photoUrl: memberFromList.photoUrl, number: memberFromList.number }
      : { id: data.id, name: data.name, position: data.position, photoUrl: data.photoUrl, number: data.number };

    setSlots((prev) => {
      const without = prev.filter((s) => s.teamMemberId !== data.id);
      return [...without, { teamMemberId: data.id, lineIndex, slotIndex, member: memberInfo }];
    });
  };

  const handleRemoveFromSlot = (lineIndex: number, slotIndex: number) => {
    setSlots((prev) => prev.filter((s) => !(s.lineIndex === lineIndex && s.slotIndex === slotIndex)));
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`/api/team-portal/teams/${teamId}/lineup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formation,
          slots: slots.map((s) => ({ teamMemberId: s.teamMemberId, lineIndex: s.lineIndex, slotIndex: s.slotIndex })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Erro ao salvar');
        return;
      }
      setSuccess('Escalação salva com sucesso.');
      if (Array.isArray(data.slots)) setSlots(data.slots);
      if (data.formation) setFormation(data.formation);
    } catch {
      setError('Erro ao salvar escalação');
    } finally {
      setSaving(false);
    }
  };

  const handleFormationChange = (newFormation: string) => {
    setFormation(newFormation);
    setCustomInput('');
    setSlots((prev) => {
      const newLines = [1, ...formationToLines(newFormation)];
      return prev.filter((s) => s.lineIndex < newLines.length && s.slotIndex < newLines[s.lineIndex]);
    });
  };

  const applyCustomFormation = () => {
    const v = customInput.trim();
    if (!v) return;
    if (!isValidCustomFormation(v)) {
      setError('Formação inválida. Use números separados por hífen (ex: 4-4-2 ou 2-2-6). Total de jogadores de linha deve ser até 10.');
      return;
    }
    setError('');
    handleFormationChange(v);
  };

  if (loading) {
    return (
      <div className="text-futvar-light py-10">Carregando...</div>
    );
  }

  return (
    <>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white">Escalação do time</h2>
        <p className="text-futvar-light text-sm mt-1">
          Escolha a formação e arraste os jogadores para as posições no campo.
        </p>
      </div>

      {error && (
        <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 mb-5">
          {error}
        </p>
      )}
      {success && (
        <p className="text-sm text-futvar-green bg-futvar-green/10 border border-futvar-green/30 rounded-xl px-4 py-3 mb-5">
          {success}
        </p>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 xl:gap-8">
        {/* Coluna esquerda: elenco */}
        <div className="xl:col-span-4">
          <div className="rounded-2xl border border-white/10 bg-futvar-dark overflow-hidden shadow-lg">
            <div className="px-5 py-4 border-b border-white/10 bg-futvar-darker/50">
              <h3 className="text-lg font-semibold text-white">Elenco</h3>
              <p className="text-futvar-light text-xs mt-1">Arraste os jogadores para o campo</p>
              {members.length > 0 && (
                <p className="text-futvar-green/90 text-xs mt-2">{members.length} jogador(es) ativo(s)</p>
              )}
            </div>
            <ul className="p-4 space-y-3 max-h-[520px] overflow-y-auto">
              {members.length === 0 ? (
                <li className="text-futvar-light text-sm py-8 text-center">Nenhum jogador ativo.</li>
              ) : (
                members.map((m) => {
                  const inField = slots.some((s) => s.teamMemberId === m.id);
                  const src = fullUrl(m.photoUrl);
                  return (
                    <li
                      key={m.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, m)}
                      onDragEnd={handleDragEnd}
                      className={`flex items-center gap-4 rounded-xl border-2 px-4 py-3 cursor-grab active:cursor-grabbing bg-futvar-darker/60 border-white/10 hover:border-futvar-green/50 hover:bg-white/[0.03] transition-all ${draggedMember?.id === m.id ? 'opacity-50 scale-[0.98]' : ''}`}
                    >
                      {src ? (
                        <img src={src} alt="" className="h-12 w-12 rounded-full object-cover shrink-0 ring-2 ring-white/10" />
                      ) : (
                        <div className="h-12 w-12 rounded-full bg-futvar-green/20 flex items-center justify-center text-futvar-green text-sm font-bold shrink-0 ring-2 ring-white/10">
                          {(m.name || '?').slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-white font-medium truncate">{m.name}</p>
                        <p className="text-futvar-light text-xs">
                          {m.position || '—'}
                          {m.number != null ? ` · #${m.number}` : ''}
                        </p>
                      </div>
                      {inField && (
                        <span className="text-futvar-green text-xs font-semibold shrink-0 bg-futvar-green/15 px-2 py-1 rounded-lg">No campo</span>
                      )}
                    </li>
                  );
                })
              )}
            </ul>
          </div>
        </div>

        {/* Coluna direita: formação + campo */}
        <div className="xl:col-span-8">
          <div className="rounded-2xl border border-white/10 bg-futvar-dark overflow-hidden shadow-lg">
            {/* Seletor de formação */}
            <div className="px-6 py-5 border-b border-white/10 bg-futvar-darker/40">
              <h3 className="text-lg font-semibold text-white mb-4">Formação</h3>

              <div className="mb-4">
                <p className="text-futvar-light text-xs font-medium uppercase tracking-wider mb-2">Clássicas</p>
                <div className="flex flex-wrap gap-2">
                  {PRESET_CLASSIC.map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => handleFormationChange(f)}
                      className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                        formation === f
                          ? 'bg-futvar-green text-futvar-darker shadow-lg shadow-futvar-green/20'
                          : 'bg-white/10 text-futvar-light hover:bg-white/15 hover:text-white'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-4">
                <p className="text-futvar-light text-xs font-medium uppercase tracking-wider mb-2">Alternativas</p>
                <div className="flex flex-wrap gap-2">
                  {PRESET_ALTERNATIVE.map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => handleFormationChange(f)}
                      className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                        formation === f
                          ? 'bg-futvar-green text-futvar-darker shadow-lg shadow-futvar-green/20'
                          : 'bg-white/10 text-futvar-light hover:bg-white/15 hover:text-white'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-4">
                <p className="text-futvar-light text-xs font-medium uppercase tracking-wider mb-2">Livres (ex.: 2-2-6, 6-2-2)</p>
                <div className="flex flex-wrap gap-2">
                  {PRESET_LIVRE.map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => handleFormationChange(f)}
                      className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                        formation === f
                          ? 'bg-futvar-green text-futvar-darker shadow-lg shadow-futvar-green/20'
                          : 'bg-white/10 text-futvar-light hover:bg-white/15 hover:text-white'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <label htmlFor="custom-formation" className="text-futvar-light text-sm">Personalizada:</label>
                <input
                  id="custom-formation"
                  type="text"
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value)}
                  placeholder="Ex: 4-3-2-1 ou 2-2-6"
                  className="w-40 px-3 py-2 rounded-xl bg-futvar-darker border border-white/20 text-white text-sm placeholder-futvar-light/50 focus:outline-none focus:ring-2 focus:ring-futvar-green"
                />
                <button
                  type="button"
                  onClick={applyCustomFormation}
                  className="px-4 py-2 rounded-xl bg-white/10 text-white text-sm font-medium hover:bg-white/15"
                >
                  Aplicar
                </button>
              </div>
            </div>

            {/* Campo */}
            <div className="p-6">
              <div
                className="rounded-2xl overflow-hidden border-2 border-futvar-green/30 shadow-xl"
                style={{
                  background: 'linear-gradient(180deg, rgba(21,128,61,0.35) 0%, rgba(21,128,61,0.2) 14%, rgba(21,128,61,0.2) 28%, rgba(21,128,61,0.25) 42%, rgba(21,128,61,0.25) 57%, rgba(21,128,61,0.2) 71%, rgba(21,128,61,0.2) 85%, rgba(21,128,61,0.35) 100%)',
                }}
              >
                <div className="min-h-[360px] flex flex-col justify-between py-6 px-4 sm:py-8 sm:px-6">
                  {lines.map((count, lineIndex) => (
                    <div key={lineIndex} className="flex justify-center gap-3 sm:gap-4 flex-wrap">
                      {Array.from({ length: count }, (_, slotIndex) => {
                        const slot = getSlot(lineIndex, slotIndex);
                        const isGol = lineIndex === 0;
                        const isOver = dragOverSlot?.lineIndex === lineIndex && dragOverSlot?.slotIndex === slotIndex;
                        return (
                          <div
                            key={`${lineIndex}-${slotIndex}`}
                            onDragOver={(e) => {
                              e.preventDefault();
                              e.dataTransfer.dropEffect = 'move';
                              setDragOverSlot({ lineIndex, slotIndex });
                            }}
                            onDrop={(e) => handleDropOnSlot(e, lineIndex, slotIndex)}
                            onDragLeave={() => setDragOverSlot(null)}
                            className={`rounded-2xl border-2 min-w-[80px] min-h-[76px] flex flex-col items-center justify-center p-2 transition-all ${
                              isOver
                                ? 'border-futvar-green bg-futvar-green/30 scale-105 shadow-lg shadow-futvar-green/30'
                                : 'border-white/25 bg-black/25 hover:border-white/40'
                            } ${isGol ? 'border-dashed border-futvar-green/50' : ''}`}
                          >
                            {isGol && count === 1 && (
                              <span className="text-[10px] font-bold text-futvar-green uppercase tracking-wider mb-1">GOL</span>
                            )}
                            {slot ? (
                              <div className="flex flex-col items-center gap-1 group">
                                {slot.member?.photoUrl ? (
                                  <img
                                    src={fullUrl(slot.member.photoUrl) || ''}
                                    alt=""
                                    className="h-10 w-10 rounded-full object-cover ring-2 ring-white/30"
                                  />
                                ) : (
                                  <div className="h-10 w-10 rounded-full bg-white/25 flex items-center justify-center text-white text-xs font-bold ring-2 ring-white/20">
                                    {(slot.member?.name || '?').slice(0, 2).toUpperCase()}
                                  </div>
                                )}
                                <span className="text-white text-[11px] font-medium truncate max-w-[72px] text-center leading-tight">
                                  {slot.member?.name || '—'}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveFromSlot(lineIndex, slotIndex)}
                                  className="text-red-400 hover:text-red-300 text-xs opacity-0 group-hover:opacity-100 font-bold"
                                  aria-label="Remover"
                                >
                                  ×
                                </button>
                              </div>
                            ) : (
                              <span className="text-futvar-light/40 text-2xl font-light">+</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="px-6 py-5 border-t border-white/10 bg-futvar-darker/40">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="w-full sm:w-auto px-10 py-3.5 rounded-xl bg-futvar-green text-futvar-darker font-semibold hover:bg-futvar-green-light disabled:opacity-50 transition-colors shadow-lg shadow-futvar-green/20"
              >
                {saving ? 'Salvando...' : 'Salvar escalação'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
