/**
 * Cloudflare Stream – upload, import e URLs assinadas para vídeos VOD.
 * Docs: https://developers.cloudflare.com/stream
 */

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

/** URL base do player Stream (customer-XXX.cloudflarestream.com). CLOUDFLARE_STREAM_CUSTOMER_CODE. */
export function getStreamBaseUrl(): string {
  const customerCode = process.env.CLOUDFLARE_STREAM_CUSTOMER_CODE;
  if (!customerCode) throw new Error('CLOUDFLARE_STREAM_CUSTOMER_CODE não configurado');
  return `https://customer-${customerCode}.cloudflarestream.com`;
}

/** Verifica se videoUrl é um vídeo Cloudflare Stream (prefixo stream:VIDEO_ID) */
export function isStreamVideo(videoUrl: string): boolean {
  return typeof videoUrl === 'string' && videoUrl.startsWith('stream:') && videoUrl.length > 7;
}

/** Extrai o videoId de videoUrl no formato stream:VIDEO_ID */
export function extractStreamVideoId(videoUrl: string): string | null {
  if (!isStreamVideo(videoUrl)) return null;
  const id = videoUrl.replace(/^stream:/, '').trim();
  return id || null;
}

/** Constrói o valor para videoUrl a partir do videoId do Stream */
export function toStreamVideoUrl(videoId: string): string {
  return `stream:${videoId}`;
}

/**
 * Importa vídeo a partir de URL (MP4 direto). Cloudflare baixa e transcodifica.
 * Retorna { videoId } ou lança em caso de erro.
 */
export async function importFromUrl(
  url: string,
  options?: { meta?: { name?: string }; requireSignedURLs?: boolean }
): Promise<{ videoId: string }> {
  const accountId = getAccountId();
  const token = getApiToken();

  const res = await fetch(`${CF_API_BASE}/accounts/${accountId}/stream/copy`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url: url.trim(),
      meta: options?.meta ?? {},
      requireSignedURLs: options?.requireSignedURLs ?? true,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    const err = data?.errors?.[0] || { message: 'Erro ao importar vídeo' };
    throw new Error(err.message || JSON.stringify(err));
  }

  const uid = data?.result?.uid;
  if (!uid) throw new Error('Resposta do Stream sem videoId');

  return { videoId: uid };
}

/**
 * Cria URL de upload direto (TUS) para o cliente enviar o arquivo.
 * Retorna { uploadUrl, videoId } – videoId é o uid após processamento.
 */
export async function createDirectUpload(options?: {
  maxDurationSeconds?: number;
  meta?: { name?: string };
  requireSignedURLs?: boolean;
}): Promise<{ uploadUrl: string; videoId: string }> {
  const accountId = getAccountId();
  const token = getApiToken();

  const body: Record<string, unknown> = {
    requireSignedURLs: options?.requireSignedURLs ?? true,
  };
  if (options?.maxDurationSeconds) body.maxDurationSeconds = options.maxDurationSeconds;
  if (options?.meta) body.meta = options.meta;

  const res = await fetch(`${CF_API_BASE}/accounts/${accountId}/stream/direct_upload`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!res.ok) {
    const err = data?.errors?.[0] || { message: 'Erro ao criar upload' };
    throw new Error(err.message || JSON.stringify(err));
  }

  const uid = data?.result?.uid;
  const uploadURL = data?.result?.uploadURL;
  if (!uid || !uploadURL) throw new Error('Resposta do Stream sem uploadURL ou videoId');

  return { uploadUrl: uploadURL, videoId: uid };
}

/**
 * Gera token assinado para reprodução (via API /token).
 * Use para conteúdo protegido; vídeo deve ter requireSignedURLs: true.
 */
export async function getPlaybackToken(
  videoId: string,
  options?: { exp?: number; downloadable?: boolean }
): Promise<string> {
  const accountId = getAccountId();
  const token = getApiToken();

  const body: Record<string, unknown> = {};
  if (options?.exp) body.exp = options.exp;
  if (options?.downloadable !== undefined) body.downloadable = options.downloadable;

  const res = await fetch(
    `${CF_API_BASE}/accounts/${accountId}/stream/${videoId}/token`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: Object.keys(body).length ? JSON.stringify(body) : undefined,
    }
  );

  const data = await res.json();
  if (!res.ok) {
    const err = data?.errors?.[0] || { message: 'Erro ao gerar token' };
    throw new Error(err.message || JSON.stringify(err));
  }

  const playbackToken = data?.result?.token;
  if (!playbackToken) throw new Error('Resposta do Stream sem token');

  return playbackToken;
}

/**
 * Retorna URL de iframe para reprodução com token assinado.
 * O token é colocado no lugar do videoId na URL do player.
 */
export async function getSignedPlaybackUrl(
  videoId: string,
  expiresInSeconds = 3600
): Promise<string> {
  const baseUrl = getStreamBaseUrl();
  const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const playbackToken = await getPlaybackToken(videoId, { exp });
  return `${baseUrl}/${playbackToken}/iframe`;
}

/**
 * Retorna URL HLS para player customizado (Video.js, etc.).
 */
export async function getSignedHlsUrl(
  videoId: string,
  expiresInSeconds = 3600
): Promise<string> {
  const baseUrl = getStreamBaseUrl();
  const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const playbackToken = await getPlaybackToken(videoId, { exp });
  return `${baseUrl}/${playbackToken}/manifest/video.m3u8`;
}

/** Retorna iframe URL e HLS URL em uma única chamada (reutiliza o token). */
export async function getSignedPlaybackUrls(
  videoId: string,
  expiresInSeconds = 3600
): Promise<{ iframeUrl: string; hlsUrl: string }> {
  const baseUrl = getStreamBaseUrl();
  const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const playbackToken = await getPlaybackToken(videoId, { exp });
  return {
    iframeUrl: `${baseUrl}/${playbackToken}/iframe`,
    hlsUrl: `${baseUrl}/${playbackToken}/manifest/video.m3u8`,
  };
}
