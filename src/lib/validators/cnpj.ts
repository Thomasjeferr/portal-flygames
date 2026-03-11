/**
 * Validação de CNPJ (Cadastro Nacional da Pessoa Jurídica) conforme regras da Receita Federal.
 * Retorna true apenas se o CNPJ tem 14 dígitos e os dígitos verificadores estão corretos.
 */
export function isValidCnpj(value: string | null | undefined): boolean {
  const digits = typeof value === 'string' ? value.replace(/\D/g, '') : '';
  if (digits.length !== 14) return false;

  // Rejeita sequências inválidas (todos iguais)
  if (/^(\d)\1+$/.test(digits)) return false;

  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

  let sum = 0;
  for (let i = 0; i < 12; i++) sum += parseInt(digits[i], 10) * weights1[i];
  let rest = sum % 11;
  const digit1 = rest < 2 ? 0 : 11 - rest;
  if (digit1 !== parseInt(digits[12], 10)) return false;

  sum = 0;
  for (let i = 0; i < 13; i++) sum += parseInt(digits[i], 10) * weights2[i];
  rest = sum % 11;
  const digit2 = rest < 2 ? 0 : 11 - rest;
  if (digit2 !== parseInt(digits[13], 10)) return false;

  return true;
}

/** Normaliza CNPJ para apenas dígitos (14 caracteres). */
export function normalizeCnpj(value: string): string {
  return value.replace(/\D/g, '').slice(0, 14);
}

/** Formata CNPJ como 00.000.000/0000-00. */
export function formatCnpj(digits: string): string {
  const d = digits.replace(/\D/g, '').slice(0, 14);
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
  if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}
