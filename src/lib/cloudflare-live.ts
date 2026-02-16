/**
 * Cloudflare Stream Live – Live Inputs para transmissão com OBS.
 * Docs: https://developers.cloudflare.com/stream/stream-live/
 */

import { getStreamBaseUrl } from './cloudflare-stream';

const CF_API_BASE = 'https://api.cloudflare.com/client/v4';

function getAccountId(): string {
  const id = process.env.CLOUDFLARE_ACCOUNT_ID;
  if (!id) throw new Error('CLOUDFLARE_ACCOUNT_ID não configurado');
  return id;
}

function getApiToken(): string {
  const token = process.env.CLOUDFLARE_STREAM_API_TOKEN;
  if (!token) throw new Error('CLOUDFLARE_STREAM_API_TOKEN não configurado');
  return token;
}

export type CreateLiveInputResult = {
  uid: string;
  ingestUrl: string;
  streamKey: string;
  rtmpsUrl: string;
};

/**
 * Cria um Live Input no Cloudflare Stream.
 * Retorna uid (live input id), ingest URL e stream key para usar no OBS.
 */
export async function createLiveInput(options?: {
  name?: string;
  recordingMode?: 'automatic' | 'off';
}): Promise<CreateLiveInputResult> {
  const accountId = getAccountId();
  const token = getApiToken();

  const body = {
    meta: { name: options?.name ?? 'Live' },
    recording: { mode: options?.recordingMode ?? 'automatic' },
  };

  const res = await fetch(
    `${CF_API_BASE}/accounts/${accountId}/stream/live_inputs`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  );

  const data = await res.json();
  if (!res.ok) {
    const err = data?.errors?.[0] || { message: 'Erro ao criar Live Input' };
    throw new Error(err.message || JSON.stringify(err));
  }

  const result = data?.result;
  const uid = result?.uid;
  const rtmps = result?.rtmps;
  if (!uid || !rtmps?.url || !rtmps?.streamKey) {
    throw new Error('Resposta do Stream Live sem uid, rtmps.url ou rtmps.streamKey');
  }

  // RTMPS: url + streamKey. Ingest = mesma URL com key no final para OBS.
  const baseIngest = rtmps.url.replace(/\/$/, '');
  const ingestUrl = `${baseIngest}${rtmps.streamKey}`;

  return {
    uid,
    ingestUrl,
    streamKey: rtmps.streamKey,
    rtmpsUrl: rtmps.url,
  };
}

/**
 * Retorna a URL HLS para reprodução ao vivo (usa Live Input UID).
 * Formato: https://customer-XXX.cloudflarestream.com/<uid>/manifest/video.m3u8
 */
export function getLiveHlsUrl(liveInputUid: string): string {
  const baseUrl = getStreamBaseUrl();
  return `${baseUrl}/${liveInputUid}/manifest/video.m3u8`;
}

/**
 * Retorna a URL HLS para replay (vídeo gravado) usando o video uid.
 * Use cloudflare_playback_id (uid do vídeo) quando status = ENDED.
 */
export function getReplayHlsUrl(videoUid: string): string {
  const baseUrl = getStreamBaseUrl();
  return `${baseUrl}/${videoUid}/manifest/video.m3u8`;
}

/**
 * Lista vídeos gravados de um Live Input (para obter playback id do último replay).
 * GET /accounts/{account}/stream/live_inputs/{uid}/videos
 */
export async function getLiveInputVideos(liveInputUid: string): Promise<{ uid: string }[]> {
  const accountId = getAccountId();
  const token = getApiToken();

  const res = await fetch(
    `${CF_API_BASE}/accounts/${accountId}/stream/live_inputs/${liveInputUid}/videos`,
    {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  const data = await res.json();
  if (!res.ok) {
    const err = data?.errors?.[0] || { message: 'Erro ao listar vídeos do Live Input' };
    throw new Error(err.message || JSON.stringify(err));
  }

  const list = data?.result ?? [];
  return Array.isArray(list) ? list.map((v: { uid?: string }) => ({ uid: v?.uid ?? '' })).filter((v: { uid: string }) => v.uid) : [];
}
