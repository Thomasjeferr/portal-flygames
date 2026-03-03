/**
 * Datas e horários do projeto são exibidos e agendados em horário do Brasil (America/Sao_Paulo).
 * O banco guarda em UTC. Use estas funções para parse (ao salvar) e formatação (ao exibir/carregar).
 */

export const BRAZIL_TZ = 'America/Sao_Paulo';
/** Offset BRT (Brasília), sem horário de verão: UTC-3 */
const BRT_OFFSET = '-03:00';

/**
 * Converte string de data/hora enviada pelo admin (datetime-local = "YYYY-MM-DDTHH:mm")
 * para Date em UTC. Valores sem timezone são interpretados como horário de Brasília.
 */
export function parseLiveDatetime(value: string | null | undefined): Date | null {
  if (value == null || value === '') return null;
  const s = String(value).trim();
  if (!s) return null;
  // Se já tem indicador de timezone (Z ou ±HH:MM), usar como está
  if (/Z$/.test(s) || /[+-]\d{2}:\d{2}$/.test(s)) {
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  // datetime-local envia "YYYY-MM-DDTHH:mm" = horário que o usuário vê (Brasil)
  const d = new Date(s + BRT_OFFSET);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Formata um ISO string (UTC) para o valor do input datetime-local em horário de Brasília.
 * Uso: ao carregar a live no admin, exibir startAt/endAt no fuso do Brasil.
 */
export function formatLiveDatetimeForInput(isoString: string | null | undefined): string {
  if (isoString == null || isoString === '') return '';
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return '';
  const formatted = d.toLocaleString('en-CA', {
    timeZone: BRAZIL_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  return formatted.replace(', ', 'T');
}

/**
 * Opções comuns para exibir data/hora da live em pt-BR no fuso do Brasil.
 */
export const LIVE_DISPLAY_OPTIONS: Intl.DateTimeFormatOptions = {
  timeZone: BRAZIL_TZ,
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
};

/**
 * Formata um ISO string (UTC) para exibição na home/header/página da live (horário Brasil).
 */
export function formatLiveDatetimeDisplay(isoString: string | null | undefined): string {
  if (isoString == null || isoString === '') return '';
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('pt-BR', LIVE_DISPLAY_OPTIONS);
}

/**
 * Formata para card da live: "25 OUT • 19:00" (dia, mês abreviado em maiúsculas, hora).
 */
export function formatLiveCardDate(isoString: string | null | undefined): string {
  if (isoString == null || isoString === '') return '';
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return '';
  const day = d.toLocaleString('pt-BR', { timeZone: BRAZIL_TZ, day: '2-digit' });
  const month = d.toLocaleString('pt-BR', { timeZone: BRAZIL_TZ, month: 'short' }).replace('.', '').toUpperCase().slice(0, 3);
  const time = d.toLocaleString('pt-BR', { timeZone: BRAZIL_TZ, hour: '2-digit', minute: '2-digit', hour12: false });
  return `${day} ${month} • ${time}`;
}

/**
 * Formata data (só dia) em horário do Brasil para input type="date" (YYYY-MM-DD).
 */
export function formatBrazilDateOnly(isoString: string | null | undefined): string {
  if (isoString == null || isoString === '') return '';
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('en-CA', { timeZone: BRAZIL_TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-');
}

/**
 * Formata hora (HH:mm) em horário do Brasil para input type="time".
 */
export function formatBrazilTimeOnly(isoString: string | null | undefined): string {
  if (isoString == null || isoString === '') return '';
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return '';
  const h = d.toLocaleString('en-CA', { timeZone: BRAZIL_TZ, hour: '2-digit', minute: '2-digit', hour12: false });
  return h;
}

/**
 * Formata data apenas (dia/mês/ano) para exibição em pt-BR no fuso do Brasil.
 */
export function formatBrazilDate(isoString: string | null | undefined): string {
  if (isoString == null || isoString === '') return '';
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('pt-BR', { timeZone: BRAZIL_TZ });
}

/**
 * Formata data e hora para exibição em pt-BR no fuso do Brasil (dateStyle + timeStyle).
 */
export function formatBrazilDateTime(isoString: string | null | undefined): string {
  if (isoString == null || isoString === '') return '';
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: BRAZIL_TZ });
}
