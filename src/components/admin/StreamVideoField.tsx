'use client';

import { useState, useRef } from 'react';

interface StreamVideoFieldProps {
  value: string;
  onChange: (videoUrl: string) => void;
  label?: string;
  placeholder?: string;
  helpText?: string;
  required?: boolean;
  className?: string;
}

export function StreamVideoField({
  value,
  onChange,
  label = 'Link do vídeo',
  placeholder = 'YouTube, Vimeo, PandaVideo ou stream:VIDEO_ID',
  helpText,
  required = true,
  className = '',
}: StreamVideoFieldProps) {
  const [importUrl, setImportUrl] = useState('');
  const [importing, setImporting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportFromUrl = async () => {
    const url = importUrl.trim();
    if (!url) {
      setError('Informe a URL do vídeo MP4 ou stream:VIDEO_ID');
      return;
    }
    setError('');
    // Se já é stream:VIDEO_ID, apenas aplica no campo principal (não chama API)
    if (url.toLowerCase().startsWith('stream:') && url.length > 7) {
      onChange(url);
      setImportUrl('');
      return;
    }
    setImporting(true);
    try {
      const res = await fetch('/api/admin/stream/import-from-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao importar');
      const videoUrl = data.videoUrl || (data.videoId ? `stream:${data.videoId}` : '');
      if (videoUrl) onChange(videoUrl);
      setImportUrl('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao importar');
    } finally {
      setImporting(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const input = e.target;
    if (!file) return;
    setError('');
    setUploading(true);
    try {
      const createRes = await fetch('/api/admin/stream/create-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ maxDurationSeconds: 3600 }),
      });
      const createData = await createRes.json();
      if (!createRes.ok) throw new Error(createData.error || 'Erro ao criar upload');
      const { uploadUrl, videoId, videoUrl } = createData;
      const finalUrl = videoUrl || (videoId ? `stream:${videoId}` : '');

      const formData = new FormData();
      formData.append('file', file);
      const uploadRes = await fetch(uploadUrl, { method: 'POST', body: formData });
      if (!uploadRes.ok) {
        const err = await uploadRes.text();
        throw new Error(err || 'Erro no upload (máx. 200MB)');
      }
      if (finalUrl) onChange(finalUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro no upload');
    } finally {
      setUploading(false);
      input.value = '';
    }
  };

  const isStream = value.startsWith('stream:');

  return (
    <div className={className}>
      <label className="block text-sm font-medium text-netflix-light mb-2">{label}{required ? ' *' : ''}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => {
          setError('');
          onChange(e.target.value);
        }}
        required={required}
        placeholder={placeholder}
        className="w-full px-4 py-3 rounded bg-netflix-gray border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-netflix-red"
      />
      {(helpText || isStream) && (
        <p className="text-xs text-netflix-light mt-1">
          {helpText}
          {isStream && ' Vídeo Cloudflare Stream (URL assinada na reprodução).'}
        </p>
      )}

      {/* Cloudflare Stream: Importar / Upload */}
      <div className="mt-3 p-4 rounded-lg bg-white/5 border border-white/10 space-y-3">
        <p className="text-sm font-medium text-white">Cloudflare Stream</p>
        <p className="text-xs text-netflix-light">Importe MP4 por URL, envie arquivo (até 200MB) ou cole stream:VIDEO_ID e clique em Importar.</p>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <div className="flex flex-wrap gap-2">
          <input
            type="text"
            value={importUrl}
            onChange={(e) => setImportUrl(e.target.value)}
            placeholder="URL MP4 (https://...mp4) ou stream:VIDEO_ID"
            className="flex-1 min-w-[200px] px-3 py-2 rounded bg-netflix-dark border border-white/20 text-white text-sm"
          />
          <button
            type="button"
            onClick={handleImportFromUrl}
            disabled={importing}
            className="px-4 py-2 rounded bg-netflix-red text-white text-sm hover:bg-red-600 disabled:opacity-50"
          >
            {importing ? 'Importando...' : 'Importar URL'}
          </button>
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="video/mp4,video/*"
            className="hidden"
            onChange={handleFileSelect}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="px-4 py-2 rounded bg-netflix-gray text-white text-sm hover:bg-white/20 disabled:opacity-50"
          >
            {uploading ? 'Enviando...' : 'Enviar arquivo'}
          </button>
        </div>
      </div>
    </div>
  );
}
