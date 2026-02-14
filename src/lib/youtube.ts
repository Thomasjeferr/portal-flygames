/**
 * Extrai o ID do vídeo de qualquer URL do YouTube.
 * Suporta: watch?v=ID, youtu.be/ID, embed/ID, shorts/ID, v/ID
 */
export function extractYouTubeVideoId(url: string): string | null {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  try {
    // youtube.com/watch?v=ID
    if (trimmed.includes('youtube.com/watch')) {
      const u = new URL(trimmed);
      const v = u.searchParams.get('v');
      return v && /^[a-zA-Z0-9_-]{11}$/.test(v) ? v : null;
    }

    // youtu.be/ID
    if (trimmed.includes('youtu.be/')) {
      const match = trimmed.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
      return match ? match[1] : null;
    }

    // youtube.com/embed/ID ou youtube.com/shorts/ID ou youtube.com/v/ID
    const embedMatch = trimmed.match(/youtube\.com\/(embed|shorts|v)\/([a-zA-Z0-9_-]{11})/);
    return embedMatch ? embedMatch[2] : null;
  } catch {
    return null;
  }
}

/**
 * Verifica se a URL é de vídeo do YouTube.
 */
export function isYouTubeUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  return /youtube\.com|youtu\.be/.test(url.trim());
}

/**
 * Retorna a URL da thumbnail do YouTube (maxresdefault, fallback hqdefault).
 */
export function getYouTubeThumbnailUrl(videoId: string, quality: 'maxresdefault' | 'hqdefault' = 'maxresdefault'): string {
  return `https://img.youtube.com/vi/${videoId}/${quality}.jpg`;
}
