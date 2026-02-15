'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { BannerForm } from '@/components/admin/BannerForm';

export default function AdminBannerNovoPage() {
  const router = useRouter();
  const [games, setGames] = useState<{ id: string; title: string }[]>([]);
  const [preSales, setPreSales] = useState<{ id: string; title: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/games').then((r) => r.json()).then((d) => setGames(Array.isArray(d) ? d : [])),
      fetch('/api/admin/pre-sale-games').then((r) => r.json()).then((d) => setPreSales(Array.isArray(d) ? d : [])),
    ]).finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (data: Record<string, unknown>) => {
    const res = await fetch('/api/admin/home-banners', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Erro ao criar');
    router.push('/admin/banner');
  };

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <Link href="/admin/banner" className="text-netflix-light hover:text-white text-sm mb-6 inline-block">Voltar</Link>
      <h1 className="text-2xl font-bold text-white mb-8">Novo banner</h1>
      {loading ? <p className="text-netflix-light">Carregando...</p> : (
        <BannerForm games={games} preSales={preSales} onSubmit={handleSubmit} />
      )}
    </div>
  );
}
