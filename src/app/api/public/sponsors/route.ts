import { NextResponse } from 'next/server';
import { getPublicSponsors } from '@/services/sponsorsService';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const sponsors = await getPublicSponsors();
    return NextResponse.json(sponsors, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Erro ao carregar patrocinadores' }, { status: 500 });
  }
}
