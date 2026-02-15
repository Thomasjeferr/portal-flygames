import { createHash } from 'crypto';
import { prisma } from '@/lib/db';

export type GeoData = {
  country?: string;
  countryCode?: string;
  region?: string;
  regionName?: string;
  city?: string;
  lat?: number;
  lng?: number;
  timezone?: string;
  isp?: string;
};

const CACHE_DAYS = 7;

function hashIp(ip: string): string {
  return createHash('sha256').update(ip + (process.env.GEO_SALT || 'portal-futvar')).digest('hex').slice(0, 32);
}

async function getCachedGeo(ipHash: string): Promise<GeoData | null> {
  const cached = await prisma.ipGeoCache.findUnique({
    where: { ipHash },
  });
  if (!cached) return null;
  const expiry = new Date();
  expiry.setDate(expiry.getDate() - CACHE_DAYS);
  if (cached.cachedAt < expiry) return null;
  return {
    country: cached.country ?? undefined,
    countryCode: cached.countryCode ?? undefined,
    region: cached.region ?? undefined,
    regionName: cached.regionName ?? undefined,
    city: cached.city ?? undefined,
    lat: cached.lat ?? undefined,
    lng: cached.lng ?? undefined,
    timezone: cached.timezone ?? undefined,
    isp: cached.isp ?? undefined,
  };
}

async function fetchGeoFromApi(ip: string): Promise<GeoData | null> {
  if (!ip || ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
    return { country: 'Local', countryCode: 'LOC', city: 'Localhost', lat: -23.5505, lng: -46.6333 };
  }
  try {
    const res = await fetch(
      `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,country,countryCode,region,regionName,city,lat,lon,timezone,isp`,
      { next: { revalidate: 0 } }
    );
    const data = (await res.json()) as { status?: string; country?: string; countryCode?: string; region?: string; regionName?: string; city?: string; lat?: number; lon?: number; timezone?: string; isp?: string };
    if (data.status !== 'success') return null;
    return {
      country: data.country,
      countryCode: data.countryCode,
      region: data.region,
      regionName: data.regionName,
      city: data.city,
      lat: data.lat,
      lng: data.lon,
      timezone: data.timezone,
      isp: data.isp,
    };
  } catch {
    return null;
  }
}

async function saveToCache(ipHash: string, geo: GeoData): Promise<void> {
  try {
    await prisma.ipGeoCache.upsert({
      where: { ipHash },
      create: {
        ipHash,
        country: geo.country ?? null,
        countryCode: geo.countryCode ?? null,
        region: geo.region ?? null,
        regionName: geo.regionName ?? null,
        city: geo.city ?? null,
        lat: geo.lat ?? null,
        lng: geo.lng ?? null,
        timezone: geo.timezone ?? null,
        isp: geo.isp ?? null,
      },
      update: {
        country: geo.country ?? null,
        countryCode: geo.countryCode ?? null,
        region: geo.region ?? null,
        regionName: geo.regionName ?? null,
        city: geo.city ?? null,
        lat: geo.lat ?? null,
        lng: geo.lng ?? null,
        timezone: geo.timezone ?? null,
        isp: geo.isp ?? null,
        cachedAt: new Date(),
      },
    });
  } catch (e) {
    console.error('[Geo] Erro ao salvar cache:', e);
  }
}

export async function getGeoForIp(ip: string): Promise<{ ipHash: string; geo: GeoData }> {
  const ipHash = hashIp(ip);
  const cached = await getCachedGeo(ipHash);
  if (cached) return { ipHash, geo: cached };
  const geo = await fetchGeoFromApi(ip) ?? {};
  await saveToCache(ipHash, geo);
  return { ipHash, geo };
}

export async function trackVisit(params: {
  ip: string;
  userAgent: string | null;
  pagePath: string;
  referrer: string | null;
}): Promise<void> {
  const { ipHash, geo } = await getGeoForIp(params.ip);
  try {
    await prisma.visitLog.create({
      data: {
        ipHash,
        country: geo.country ?? null,
        countryCode: geo.countryCode ?? null,
        region: geo.region ?? null,
        regionName: geo.regionName ?? null,
        city: geo.city ?? null,
        lat: geo.lat ?? null,
        lng: geo.lng ?? null,
        timezone: geo.timezone ?? null,
        isp: geo.isp ?? null,
        userAgent: params.userAgent ?? null,
        pagePath: params.pagePath,
        referrer: params.referrer ?? null,
      },
    });
  } catch (e) {
    console.error('[Geo] Erro ao registrar visita:', e);
  }
}
