'use client';

import { useRef, useState } from 'react';

export default function CadastrarTimePage() {
  const crestFileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [uploadingCrest, setUploadingCrest] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState({
    name: '',
    shortName: '',
    city: '',
    state: '',
    foundedYear: '',
    crestUrl: '',
    responsibleName: '',
    responsibleEmail: '',
    instagram: '',
    whatsapp: '',
    description: '',
  });

  const handleCrestUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml'];
    if (!allowed.includes(file.type)) {
      setError('Formato inválido. Use PNG, JPG, WebP ou SVG.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('Arquivo muito grande. Máximo 2MB.');
      return;
    }
    setError('');
    setUploadingCrest(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/upload/team-crest', { method: 'POST', body: fd });
      const data = await res.json();
      if (res.ok && data.url) {
        const url = data.url.startsWith('http') ? data.url : (typeof window !== 'undefined' ? window.location.origin : '') + data.url;
        setForm((f) => ({ ...f, crestUrl: url }));
      } else {
        setError(data.error || 'Erro no upload');
      }
    } catch {
      setError('Erro de conexão no upload.');
    } finally {
      setUploadingCrest(false);
      e.target.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const payload = {
        name: form.name.trim(),
        shortName: form.shortName.trim() || undefined,
        city: form.city.trim() || undefined,
        state: form.state.trim() || undefined,
        foundedYear: form.foundedYear ? Number(form.foundedYear) : undefined,
        crestUrl: form.crestUrl.trim() || undefined,
        responsibleName: form.responsibleName.trim() || undefined,
        responsibleEmail: form.responsibleEmail.trim() || undefined,
        instagram: form.instagram.trim() || undefined,
        whatsapp: form.whatsapp.replace(/\D/g, '') || undefined,
        description: form.description.trim() || undefined,
      };
      const res = await fetch('/api/team-portal/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      let data: { error?: string } = {};
      try {
        data = await res.json();
      } catch {
        setError('Resposta inválida do servidor. Tente novamente.');
        return;
      }
      if (!res.ok) {
        setError(data.error || 'Erro ao cadastrar time. Tente novamente.');
        return;
      }
      setSuccess('Time enviado para aprovação. Quando for aprovado, você receberá um e-mail com um link exclusivo para acessar o painel (comissões e elenco).');
      setForm({
        name: '',
        shortName: '',
        city: '',
        state: '',
        foundedYear: '',
        crestUrl: '',
        responsibleName: '',
        responsibleEmail: '',
        instagram: '',
        whatsapp: '',
        description: '',
      });
    } catch {
      setError('Erro de conexão. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pt-20 sm:pt-24 pb-16 px-4 sm:px-6 lg:px-12 min-h-screen bg-futvar-darker">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Cadastrar time</h1>
        <p className="text-futvar-light mb-6 text-sm sm:text-base">
          Preencha os dados do seu time para análise. Não é necessário ter conta. Após aprovação, você receberá
          um e-mail com um link exclusivo para acessar o painel (comissões e elenco).
        </p>

        <form onSubmit={handleSubmit} className="space-y-5 bg-futvar-dark border border-white/10 rounded-2xl p-6 sm:p-8">
          {error && (
            <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded px-3 py-2">
              {error}
            </p>
          )}
          {success && (
            <p className="text-sm text-futvar-green bg-futvar-green/10 border border-futvar-green/40 rounded px-3 py-2">
              {success}
            </p>
          )}

          <div>
            <label className="block text-sm font-medium text-futvar-light mb-2">Nome do time *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
              className="w-full px-4 py-3 rounded bg-futvar-darker border border-white/20 text-white placeholder-futvar-light focus:outline-none focus:ring-2 focus:ring-futvar-green"
              placeholder="Ex: Esporte Clube Várzea"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-futvar-light mb-2">Nome curto / Sigla</label>
              <input
                type="text"
                value={form.shortName}
                onChange={(e) => setForm((f) => ({ ...f, shortName: e.target.value.toUpperCase() }))}
                className="w-full px-4 py-3 rounded bg-futvar-darker border border-white/20 text-white placeholder-futvar-light focus:outline-none focus:ring-2 focus:ring-futvar-green"
                placeholder="Ex: ECV"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-futvar-light mb-2">Ano de fundação</label>
              <input
                type="number"
                value={form.foundedYear}
                min={1800}
                max={new Date().getFullYear()}
                onChange={(e) => setForm((f) => ({ ...f, foundedYear: e.target.value }))}
                className="w-full px-4 py-3 rounded bg-futvar-darker border border-white/20 text-white placeholder-futvar-light focus:outline-none focus:ring-2 focus:ring-futvar-green"
                placeholder="Ex: 1998"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-futvar-light mb-2">Cidade</label>
              <input
                type="text"
                value={form.city}
                onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                className="w-full px-4 py-3 rounded bg-futvar-darker border border-white/20 text-white placeholder-futvar-light focus:outline-none focus:ring-2 focus:ring-futvar-green"
                placeholder="Ex: Porto Alegre"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-futvar-light mb-2">UF</label>
              <input
                type="text"
                value={form.state}
                onChange={(e) => setForm((f) => ({ ...f, state: e.target.value.toUpperCase().slice(0, 2) }))}
                maxLength={2}
                className="w-full px-4 py-3 rounded bg-futvar-darker border border-white/20 text-white placeholder-futvar-light focus:outline-none focus:ring-2 focus:ring-futvar-green"
                placeholder="Ex: RS"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-futvar-light mb-2">Escudo</label>
            <div className="flex flex-col sm:flex-row gap-3 items-start">
              <input
                type="text"
                value={form.crestUrl}
                onChange={(e) => setForm((f) => ({ ...f, crestUrl: e.target.value }))}
                className="flex-1 w-full px-4 py-3 rounded bg-futvar-darker border border-white/20 text-white placeholder-futvar-light focus:outline-none focus:ring-2 focus:ring-futvar-green"
                placeholder="URL da imagem ou use o botão para carregar"
              />
              <input
                ref={crestFileRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
                className="hidden"
                onChange={handleCrestUpload}
              />
              <button
                type="button"
                onClick={() => crestFileRef.current?.click()}
                disabled={uploadingCrest}
                className="px-4 py-3 rounded bg-white/10 text-white border border-white/20 hover:bg-white/20 disabled:opacity-50 whitespace-nowrap font-medium"
              >
                {uploadingCrest ? 'Carregando...' : 'Carregar escudo'}
              </button>
            </div>
            {form.crestUrl && (
              <div className="mt-2 flex items-center gap-3">
                <img
                  src={form.crestUrl}
                  alt="Escudo"
                  className="h-14 w-14 object-contain rounded bg-white/5 border border-white/10"
                />
                <span className="text-futvar-light text-sm">Preview</span>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-futvar-light mb-2">Nome do responsável pelo time</label>
            <input
              type="text"
              value={form.responsibleName}
              onChange={(e) => setForm((f) => ({ ...f, responsibleName: e.target.value }))}
              className="w-full px-4 py-3 rounded bg-futvar-darker border border-white/20 text-white placeholder-futvar-light focus:outline-none focus:ring-2 focus:ring-futvar-green"
              placeholder="Ex: João Silva"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-futvar-light mb-2">E-mail do responsável</label>
            <input
              type="email"
              value={form.responsibleEmail}
              onChange={(e) => setForm((f) => ({ ...f, responsibleEmail: e.target.value }))}
              className="w-full px-4 py-3 rounded bg-futvar-darker border border-white/20 text-white placeholder-futvar-light focus:outline-none focus:ring-2 focus:ring-futvar-green"
              placeholder="Ex: responsavel@clubedotime.com.br"
            />
            <p className="text-futvar-light/80 text-xs mt-1">
              Para receber a confirmação do cadastro e o e-mail de aprovação com acesso ao painel.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-futvar-light mb-2">Instagram</label>
              <input
                type="text"
                value={form.instagram}
                onChange={(e) => setForm((f) => ({ ...f, instagram: e.target.value }))}
                className="w-full px-4 py-3 rounded bg-futvar-darker border border-white/20 text-white placeholder-futvar-light focus:outline-none focus:ring-2 focus:ring-futvar-green"
                placeholder="@seutime"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-futvar-light mb-2">WhatsApp do responsável</label>
              <input
                type="text"
                value={form.whatsapp}
                onChange={(e) => setForm((f) => ({ ...f, whatsapp: e.target.value.replace(/\D/g, '') }))}
                className="w-full px-4 py-3 rounded bg-futvar-darker border border-white/20 text-white placeholder-futvar-light focus:outline-none focus:ring-2 focus:ring-futvar-green"
                placeholder="(51) 99999-9999"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-futvar-light mb-2">Descrição</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={3}
              className="w-full px-4 py-3 rounded bg-futvar-darker border border-white/20 text-white placeholder-futvar-light focus:outline-none focus:ring-2 focus:ring-futvar-green"
              placeholder="Fale um pouco sobre o time, história, títulos, bairro..."
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full sm:w-auto px-6 py-3 rounded bg-futvar-green text-futvar-darker font-semibold hover:bg-futvar-green-light disabled:opacity-50"
          >
            {loading ? 'Enviando...' : 'Enviar para aprovação'}
          </button>
        </form>
      </div>
    </div>
  );
}

