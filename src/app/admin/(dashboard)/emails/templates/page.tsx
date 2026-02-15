'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

const TEMPLATE_LABELS: Record<string, string> = {
  WELCOME: 'Boas-vindas',
  VERIFY_EMAIL: 'Verificar e-mail',
  RESET_PASSWORD: 'Recuperar senha',
  PASSWORD_CHANGED: 'Senha alterada',
};

const TEMPLATE_VARS: Record<string, string[]> = {
  WELCOME: ['name', 'login_url'],
  VERIFY_EMAIL: ['name', 'verify_url', 'expires_in'],
  RESET_PASSWORD: ['name', 'reset_url', 'expires_in'],
  PASSWORD_CHANGED: ['name', 'support_url'],
};

type Template = { id: string; key: string; subject: string; htmlBody: string; isActive: boolean };

export default function AdminEmailTemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/emails/templates')
      .then((r) => r.json())
      .then((d) => setTemplates(Array.isArray(d) ? d : []))
      .catch(() => setTemplates([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="max-w-4xl mx-auto px-6 py-10 text-netflix-light">Carregando...</div>;

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-bold text-white mb-6">Templates de E-mail</h1>
      <div className="space-y-4">
        {templates.map((t) => (
          <div key={t.id} className="bg-netflix-dark border border-white/10 rounded-lg p-4 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-white">{TEMPLATE_LABELS[t.key] ?? t.key}</h3>
              <p className="text-sm text-netflix-light mt-1">{t.subject}</p>
              <p className="text-xs text-netflix-light/70 mt-1">
                Variáveis: {TEMPLATE_VARS[t.key]?.map((v) => `{{${v}}}`).join(', ') ?? '-'}
              </p>
              <span className={`inline-block mt-2 px-2 py-1 rounded text-xs ${t.isActive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                {t.isActive ? 'Ativo' : 'Inativo'}
              </span>
            </div>
            <Link
              href={`/admin/emails/templates/${t.key}`}
              className="px-4 py-2 rounded bg-netflix-gray text-white text-sm hover:bg-white/20"
            >
              Editar
            </Link>
          </div>
        ))}
      </div>
      {templates.length === 0 && (
        <p className="text-netflix-light">Nenhum template. Execute: <code className="bg-netflix-gray px-2 py-1 rounded">npm run db:seed-emails</code></p>
      )}
      <Link href="/admin/emails/settings" className="inline-block mt-6 text-netflix-light hover:text-white text-sm">← Configurações</Link>
    </div>
  );
}
