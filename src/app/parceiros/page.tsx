'use client';

import { useState } from 'react';
import Link from 'next/link';

type PartnerType = 'revendedor' | 'influencer' | 'lojista' | 'outro';

export default function ParceirosPage() {
  const [form, setForm] = useState<{
    name: string;
    companyName: string;
    type: PartnerType;
    whatsapp: string;
    city: string;
    state: string;
  }>({
    name: '',
    companyName: '',
    type: 'revendedor',
    whatsapp: '',
    city: '',
    state: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/public/partners/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          companyName: form.companyName.trim() || undefined,
          type: form.type,
          whatsapp: form.whatsapp.trim(),
          city: form.city.trim() || undefined,
          state: form.state.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Não foi possível enviar seu cadastro. Tente novamente.');
        return;
      }
      setSuccess(
        'Recebemos seu interesse em ser parceiro. Vamos analisar e entrar em contato pelo WhatsApp informado.'
      );
      setForm({
        name: '',
        companyName: '',
        type: 'revendedor',
        whatsapp: '',
        city: '',
        state: '',
      });
    } catch {
      setError('Erro de conexão. Tente novamente em alguns instantes.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 lg:px-12 bg-futvar-darker">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <Link href="/" className="text-futvar-green hover:text-futvar-green-light text-sm font-semibold">
            ← Voltar para a página inicial
          </Link>
        </div>

        <h1 className="text-2xl md:text-3xl font-bold text-white mb-3">Programa de parceiros</h1>
        <p className="text-futvar-light mb-6">
          Cadastre-se para ser parceiro da Fly Games. Após análise do seu cadastro, liberamos um código exclusivo para
          você indicar assinantes, vendas de jogos e patrocinadores, com comissão sobre cada venda gerada.
        </p>

        <div className="mb-6 p-4 rounded-lg bg-futvar-dark border border-futvar-green/20 text-sm text-futvar-light">
          <p className="font-semibold text-white mb-1">Como funciona:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Você preenche o formulário abaixo com seus dados.</li>
            <li>Nosso time analisa o cadastro e entra em contato pelo WhatsApp.</li>
            <li>Após aprovado, você recebe um código de parceiro e orientações de uso.</li>
          </ul>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-sm text-futvar-red">{error}</p>}
          {success && <p className="text-sm text-futvar-green">{success}</p>}

          <div>
            <label className="block text-sm font-medium text-futvar-light mb-1" htmlFor="name">
              Nome completo
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              value={form.name}
              onChange={handleChange}
              className="w-full rounded-md bg-futvar-dark border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-futvar-green"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-futvar-light mb-1" htmlFor="companyName">
              Nome da empresa (opcional)
            </label>
            <input
              id="companyName"
              name="companyName"
              type="text"
              value={form.companyName}
              onChange={handleChange}
              className="w-full rounded-md bg-futvar-dark border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-futvar-green"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-futvar-light mb-1" htmlFor="type">
              Tipo de parceria
            </label>
            <select
              id="type"
              name="type"
              value={form.type}
              onChange={handleChange}
              className="w-full rounded-md bg-futvar-dark border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-futvar-green"
            >
              <option value="revendedor">Revendedor</option>
              <option value="influencer">Influencer / Criador de conteúdo</option>
              <option value="lojista">Lojista</option>
              <option value="outro">Outro</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-futvar-light mb-1" htmlFor="whatsapp">
              WhatsApp (com DDD)
            </label>
            <input
              id="whatsapp"
              name="whatsapp"
              type="tel"
              required
              placeholder="(11) 99999-9999"
              value={form.whatsapp}
              onChange={handleChange}
              className="w-full rounded-md bg-futvar-dark border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-futvar-green"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-futvar-light mb-1" htmlFor="city">
                Cidade
              </label>
              <input
                id="city"
                name="city"
                type="text"
                value={form.city}
                onChange={handleChange}
                className="w-full rounded-md bg-futvar-dark border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-futvar-green"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-futvar-light mb-1" htmlFor="state">
                Estado (UF)
              </label>
              <input
                id="state"
                name="state"
                type="text"
                maxLength={2}
                value={form.state}
                onChange={handleChange}
                className="w-full rounded-md bg-futvar-dark border border-white/10 px-3 py-2 text-sm text-white uppercase focus:outline-none focus:ring-2 focus:ring-futvar-green"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-futvar-green text-futvar-darker font-semibold text-sm hover:bg-futvar-green-light disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? 'Enviando...' : 'Enviar cadastro para análise'}
          </button>
        </form>
      </div>
    </div>
  );
}

