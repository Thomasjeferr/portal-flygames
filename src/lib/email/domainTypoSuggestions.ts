/** Domínios corretos conhecidos (para sugestão por similaridade). */
const KNOWN_DOMAINS = [
  'gmail.com', 'googlemail.com',
  'hotmail.com', 'outlook.com', 'live.com',
  'yahoo.com', 'yahoo.com.br',
  'icloud.com',
  'bol.com.br', 'uol.com.br', 'ig.com.br',
] as const;

/**
 * Distância de Levenshtein entre duas strings.
 */
function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[m][n];
}

/**
 * Mapa de domínios digitados errado → domínio correto.
 * Usado para sugerir "Você quis dizer xxx@gmail.com?" em formulários de e-mail.
 */
const DOMAIN_TYPO_TO_CORRECT: Record<string, string> = {
  // Gmail
  'gmial.com': 'gmail.com',
  'gmal.com': 'gmail.com',
  'gmai.com': 'gmail.com',
  'gmail.con': 'gmail.com',
  'gmail.co': 'gmail.com',
  'gmail.cm': 'gmail.com',
  'gmail.ocm': 'gmail.com',
  'gmail.om': 'gmail.com',
  'gmail.com.br': 'gmail.com',
  'googlemail.com': 'gmail.com',
  'gmaill.com': 'gmail.com',
  'qmail.com': 'gmail.com',
  'qmaoil.com': 'gmail.com',
  'gemail.com': 'gmail.com',
  'gnail.com': 'gmail.com',
  // Hotmail / Outlook
  'hotmal.com': 'hotmail.com',
  'hotmial.com': 'hotmail.com',
  'hotmeil.com': 'hotmail.com',
  'hotmail.con': 'hotmail.com',
  'hotmail.co': 'hotmail.com',
  'hotmail.com.br': 'hotmail.com',
  'outlok.com': 'outlook.com',
  'outloo.com': 'outlook.com',
  'outlook.con': 'outlook.com',
  'outlook.com.br': 'outlook.com',
  'live.con': 'live.com',
  'live.com.br': 'live.com',
  // Yahoo
  'yaho.com': 'yahoo.com',
  'yahooo.com': 'yahoo.com',
  'yahho.com': 'yahoo.com',
  'yahoo.con': 'yahoo.com',
  'yahoo.co': 'yahoo.com',
  'yahoo.com.br': 'yahoo.com',
  // iCloud
  'icloud.con': 'icloud.com',
  'icoud.com': 'icloud.com',
  // Provedores comuns BR
  'bol.con': 'bol.com.br',
  'boll.com.br': 'bol.com.br',
  'uoll.com': 'uol.com.br',
  'uol.con': 'uol.com.br',
  'uol.com.br.br': 'uol.com.br',
  'ig.con': 'ig.com.br',
  'ig.com.br.br': 'ig.com.br',
};

const MAX_EDIT_DISTANCE = 2;

/**
 * Se o domínio não está no mapa de typos, tenta sugerir o domínio conhecido mais parecido (Levenshtein).
 * Só retorna sugestão se a distância for <= MAX_EDIT_DISTANCE e for a única melhor opção.
 */
function suggestDomainBySimilarity(domain: string): string | null {
  if (!domain || domain.length < 5) return null;
  let best: { domain: string; distance: number } | null = null;
  for (const known of KNOWN_DOMAINS) {
    if (domain === known) return null;
    const d = levenshtein(domain, known);
    if (d > MAX_EDIT_DISTANCE) continue;
    if (!best || d < best.distance) best = { domain: known, distance: d };
    else if (best && d === best.distance) best = null; // empate: não sugerir
  }
  return best ? best.domain : null;
}

/**
 * Retorna o e-mail sugerido se o domínio for um typo conhecido ou parecido; caso contrário null.
 * Ex.: getSuggestedEmail('user@gmial.com') => 'user@gmail.com'
 *      getSuggestedEmail('meudeu@qmaoil.com') => 'meudeu@gmail.com'
 */
export function getSuggestedEmail(email: string): string | null {
  if (!email || typeof email !== 'string') return null;
  // Remove espaços para normalizar e evitar sugestão com espaço
  const normalized = email.replace(/\s/g, '').trim().toLowerCase();
  const at = normalized.indexOf('@');
  if (at <= 0 || at === normalized.length - 1) return null;
  const local = normalized.slice(0, at);
  const domain = normalized.slice(at + 1);
  const correctDomain = DOMAIN_TYPO_TO_CORRECT[domain] ?? suggestDomainBySimilarity(domain);
  if (!correctDomain) return null;
  return `${local}@${correctDomain}`;
}
