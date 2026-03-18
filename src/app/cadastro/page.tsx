'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState, useRef, useEffect, useMemo } from 'react';
import { useStoreApp } from '@/lib/StoreAppContext';
import { StoreAppRedirectToHome } from '@/components/StoreAppRedirectToHome';
import { getSuggestedEmail } from '@/lib/email/domainTypoSuggestions';

function safeRedirect(path: string | null): string {
  if (!path || typeof path !== 'string') return '/';
  if (!path.startsWith('/') || path.startsWith('//')) return '/';
  return path;
}

const PASSWORD_REQUIREMENTS = [
  { key: 'length', label: 'Mínimo 8 caracteres', test: (p: string) => p.length >= 8 },
  { key: 'upper', label: 'Uma letra maiúscula', test: (p: string) => /[A-Z]/.test(p) },
  { key: 'lower', label: 'Uma letra minúscula', test: (p: string) => /[a-z]/.test(p) },
  { key: 'number', label: 'Um número', test: (p: string) => /[0-9]/.test(p) },
] as const;

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = safeRedirect(searchParams.get('redirect'));
  const [email, setEmail] = useState('');
  const [emailConfirm, setEmailConfirm] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState('');
  const [nameFieldError, setNameFieldError] = useState('');
  const [loading, setLoading] = useState(false);
  const formTopRef = useRef<HTMLDivElement>(null);

  const validateName = (value: string) => value.trim().split(/\s+/).filter(Boolean).length >= 2;

  const suggestedEmail = useMemo(() => getSuggestedEmail(email), [email]);
  const passwordChecks = useMemo(
    () => PASSWORD_REQUIREMENTS.map((r) => ({ ...r, ok: r.test(password) })),
    [password]
  );
  const emailsMatch =
    email.trim().toLowerCase() === emailConfirm.trim().toLowerCase() && emailConfirm.length > 0;
  const passwordsMatch = password === passwordConfirm && passwordConfirm.length > 0;

  const formIsValid = useMemo(() => {
    const nameOk = validateName(name) && !nameFieldError;
    const emailOk = email.trim().length > 0;
    const emailConfirmOk = emailsMatch;
    const passwordOk = passwordChecks.every((c) => c.ok);
    const passwordConfirmOk = passwordsMatch;
    return nameOk && emailOk && emailConfirmOk && passwordOk && passwordConfirmOk && acceptedTerms;
  }, [name, nameFieldError, email, emailConfirm, emailsMatch, passwordChecks, passwordConfirm, passwordsMatch, acceptedTerms]);

  useEffect(() => {
    if (error && formTopRef.current) {
      formTopRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [error]);

  const handleNameBlur = () => {
    if (!name.trim()) {
      setNameFieldError('');
      return;
    }
    if (!validateName(name)) {
      setNameFieldError('Informe nome e sobrenome (pelo menos dois nomes).');
    } else {
      setNameFieldError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setNameFieldError('');
    if (!acceptedTerms) {
      setError('Você precisa aceitar os Termos de Uso e a Política de Privacidade.');
      return;
    }
    if (email.trim().toLowerCase() !== emailConfirm.trim().toLowerCase()) {
      setError('Os e-mails não coincidem. Verifique se não há erro de digitação.');
      return;
    }
    if (password !== passwordConfirm) {
      setError('As senhas não coincidem.');
      return;
    }
    if (!validateName(name)) {
      setNameFieldError('Informe nome e sobrenome (pelo menos dois nomes).');
      return;
    }
    setLoading(true);
    try {
      const payload = {
        email: email.trim().toLowerCase(),
        name: name.trim(),
        password,
      };
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Erro ao cadastrar');
        return;
      }
      if (data.needsVerification && data.user?.email) {
        const params = new URLSearchParams({ email: data.user.email });
        if (redirectTo !== '/') params.set('redirect', redirectTo);
        router.push(`/verificar-email?${params.toString()}`);
        return;
      }
      router.push(redirectTo);
      router.refresh();
    } catch {
      setError('Erro de conexão');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-28 pb-16 px-4 flex items-center justify-center">
      <div className="w-full max-w-md">
        <div className="bg-futvar-dark/95 border border-futvar-green/20 rounded-2xl p-8 shadow-2xl shadow-futvar-green/5">
          <div ref={formTopRef}>
            <h1 className="text-3xl font-bold text-white mb-6">Cadastrar</h1>
          </div>
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <p role="alert" className="text-amber-400 text-sm bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2">
                {error}
              </p>
            )}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-futvar-light mb-2">
                Nome completo (nome e sobrenome)
              </label>
              <input
                id="name"
                type="text"
                autoComplete="name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (nameFieldError && validateName(e.target.value)) setNameFieldError('');
                }}
                onBlur={handleNameBlur}
                required
                minLength={3}
                className={`w-full px-4 py-3 rounded bg-futvar-gray border text-white placeholder-futvar-light/60 focus:outline-none focus:ring-2 focus:border-transparent ${
                  nameFieldError ? 'border-amber-500/50 focus:ring-amber-500' : 'border-futvar-green/20 focus:ring-futvar-green'
                }`}
                placeholder="Ex: Maria Silva"
                aria-describedby={nameFieldError ? 'name-field-error' : undefined}
              />
              {nameFieldError && (
                <p id="name-field-error" role="alert" className="mt-2 text-sm text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2">
                  {nameFieldError}
                </p>
              )}
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-futvar-light mb-2">
                E-mail
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value.replace(/\s/g, ''))}
                required
                className={`w-full px-4 py-3 rounded bg-futvar-gray border text-white placeholder-futvar-light/60 focus:outline-none focus:ring-2 focus:border-transparent ${
                  suggestedEmail && suggestedEmail !== email.trim().toLowerCase()
                    ? 'border-amber-500/50 focus:ring-amber-500'
                    : 'border-futvar-green/20 focus:ring-futvar-green'
                }`}
                placeholder="seu@email.com"
                aria-describedby={suggestedEmail && suggestedEmail !== email.trim().toLowerCase() ? 'email-suggestion' : undefined}
              />
              {suggestedEmail && suggestedEmail !== email.trim().toLowerCase() && (
                <p id="email-suggestion" role="alert" className="mt-2 text-sm text-amber-400 flex flex-wrap items-center gap-2 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2">
                  <span>E-mail com possível erro de digitação. Você quis dizer <strong className="text-amber-300">{suggestedEmail}</strong>?</span>
                  <button
                    type="button"
                    onClick={() => {
                      setEmail(suggestedEmail);
                      setEmailConfirm(suggestedEmail);
                    }}
                    className="underline hover:no-underline font-medium text-amber-300"
                  >
                    Usar este e-mail
                  </button>
                </p>
              )}
            </div>
            <div>
              <label htmlFor="emailConfirm" className="block text-sm font-medium text-futvar-light mb-2">
                Repetir e-mail
              </label>
              <input
                id="emailConfirm"
                type="email"
                autoComplete="email"
                value={emailConfirm}
                onChange={(e) => setEmailConfirm(e.target.value.replace(/\s/g, ''))}
                required
                className={`w-full px-4 py-3 rounded bg-futvar-gray border text-white placeholder-futvar-light/60 focus:outline-none focus:ring-2 focus:border-transparent ${
                  emailConfirm.length > 0 && !emailsMatch
                    ? 'border-amber-500/50 focus:ring-amber-500'
                    : 'border-futvar-green/20 focus:ring-futvar-green'
                }`}
                placeholder="Repita o e-mail acima"
              />
              {emailConfirm.length > 0 && !emailsMatch && (
                <p className="mt-1 text-xs text-amber-400">Os e-mails não coincidem.</p>
              )}
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-futvar-light mb-2">
                Senha
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  className="w-full px-4 py-3 pr-20 rounded bg-futvar-gray border border-futvar-green/20 text-white placeholder-futvar-light/60 focus:outline-none focus:ring-2 focus:ring-futvar-green focus:border-transparent"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-futvar-light hover:text-white"
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showPassword ? 'Ocultar' : 'Ver'}
                </button>
              </div>
              <ul className="mt-2 space-y-1 text-xs text-futvar-light" aria-label="Requisitos da senha">
                {passwordChecks.map(({ key, label, ok }) => (
                  <li key={key} className={ok ? 'text-futvar-green' : ''}>
                    {ok ? '✓ ' : '○ '}{label}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <label htmlFor="passwordConfirm" className="block text-sm font-medium text-futvar-light mb-2">
                Repetir senha
              </label>
              <div className="relative">
                <input
                  id="passwordConfirm"
                  type={showPasswordConfirm ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  required
                  minLength={8}
                  className="w-full px-4 py-3 pr-20 rounded bg-futvar-gray border border-futvar-green/20 text-white placeholder-futvar-light/60 focus:outline-none focus:ring-2 focus:ring-futvar-green focus:border-transparent"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswordConfirm((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-futvar-light hover:text-white"
                  aria-label={showPasswordConfirm ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showPasswordConfirm ? 'Ocultar' : 'Ver'}
                </button>
              </div>
              {passwordConfirm.length > 0 && !passwordsMatch && (
                <p className="mt-1 text-xs text-amber-400">As senhas não coincidem.</p>
              )}
            </div>
            <div className="flex items-start gap-3">
              <input
                id="acceptedTerms"
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                required
                className="mt-1 h-4 w-4 rounded border-white/30 bg-futvar-gray text-futvar-green focus:ring-futvar-green"
              />
              <label htmlFor="acceptedTerms" className="text-sm text-futvar-light">
                Li e aceito os{' '}
                <Link href="/termos-de-uso" target="_blank" rel="noopener noreferrer" className="text-futvar-green hover:underline">
                  Termos de Uso
                </Link>
                {' '}e a{' '}
                <Link href="/politica-de-privacidade" target="_blank" rel="noopener noreferrer" className="text-futvar-green hover:underline">
                  Política de Privacidade
                </Link>.
              </label>
            </div>
            <button
              type="submit"
              disabled={!formIsValid || loading}
              className="w-full py-4 rounded-lg bg-futvar-green text-futvar-darker font-bold hover:bg-futvar-green-light disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title={!formIsValid ? 'Preencha todos os campos corretamente e aceite os termos' : undefined}
            >
              {loading ? 'Cadastrando...' : 'Cadastrar'}
            </button>
          </form>
          <p className="mt-6 text-center text-futvar-light text-sm">
            Já tem conta?{' '}
            <Link href={redirectTo === '/' ? '/entrar' : `/entrar?redirect=${encodeURIComponent(redirectTo)}`} className="text-white hover:underline">
              Entrar
            </Link>
          </p>
          <p className="mt-3 text-center text-futvar-light text-xs">
            <Link href="/" className="hover:text-white">
              ← Voltar para a página inicial
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  const isStoreApp = useStoreApp();
  if (isStoreApp) return <StoreAppRedirectToHome />;
  return (
    <Suspense fallback={<div className="min-h-screen pt-28 flex items-center justify-center text-futvar-light">Carregando...</div>}>
      <RegisterForm />
    </Suspense>
  );
}
