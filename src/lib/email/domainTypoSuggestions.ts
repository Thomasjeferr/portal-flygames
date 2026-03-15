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
  'gmail.com.br': 'gmail.com',
  'googlemail.com': 'gmail.com',
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

/**
 * Retorna o e-mail sugerido se o domínio for um typo conhecido; caso contrário null.
 * Ex.: getSuggestedEmail('user@gmial.com') => 'user@gmail.com'
 */
export function getSuggestedEmail(email: string): string | null {
  if (!email || typeof email !== 'string') return null;
  const trimmed = email.trim().toLowerCase();
  const at = trimmed.indexOf('@');
  if (at <= 0 || at === trimmed.length - 1) return null;
  const local = trimmed.slice(0, at);
  const domain = trimmed.slice(at + 1);
  const correctDomain = DOMAIN_TYPO_TO_CORRECT[domain];
  if (!correctDomain) return null;
  return `${local}@${correctDomain}`;
}
