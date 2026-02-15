/**
 * Substitui {{var}} no template HTML de forma segura.
 * URLs nao sao escapadas; demais valores sao escapados para XSS.
 */
const URL_KEYS = ['action_url', 'verify_url', 'reset_url', 'login_url', 'support_url'];

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function renderTemplate(htmlBody: string, vars: Record<string, string>): string {
  let result = htmlBody;
  for (const [key, value] of Object.entries(vars)) {
    const placeholder = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
    const safeValue = URL_KEYS.includes(key)
      ? value
      : escapeHtml(String(value ?? ''));
    result = result.replace(placeholder, safeValue);
  }
  result = result.replace(/\{\{\s*[\w]+\s*\}\}/g, '');
  return result;
}

export function extractTextFromHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
