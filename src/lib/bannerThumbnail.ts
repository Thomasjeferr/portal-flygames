import { extractYouTubeVideoId, getYouTubeThumbnailUrl } from './youtube';

type BannerLike = {
  type: string;
  mediaType?: string;
  mediaUrl?: string | null;
  game?: { thumbnailUrl?: string | null } | null;
  preSale?: { thumbnailUrl?: string } | null;
};

/**
 * Resolve URL de thumbnail para preview de banner no admin.
 * - IMAGE + mediaUrl -> mediaUrl
 * - YOUTUBE_VIDEO -> https://img.youtube.com/vi/VIDEO_ID/hqdefault.jpg
 * - MP4_VIDEO -> null (placeholder "Vídeo")
 * - FEATURED_GAME sem mediaUrl -> game.thumbnailUrl fallback
 * - FEATURED_PRE_SALE sem mediaUrl -> preSale.thumbnailUrl fallback
 * Nunca retorna string vazia; retorna null quando não há imagem válida.
 */
export function getBannerThumbnailUrl(b: BannerLike): string | null {
  const url = (s: string | null | undefined) => (s && typeof s === 'string' && s.trim() ? s.trim() : null);

  const resolveYoutube = (raw: string | null | undefined): string | null => {
    const s = url(raw);
    if (!s) return null;
    const videoId = extractYouTubeVideoId(s);
    return videoId ? getYouTubeThumbnailUrl(videoId, 'hqdefault') : null;
  };

  if (b.type === 'FEATURED_GAME') {
    if (b.mediaType === 'YOUTUBE_VIDEO' && b.mediaUrl) {
      const thumb = resolveYoutube(b.mediaUrl);
      if (thumb) return thumb;
    }
    if (b.mediaType === 'IMAGE' && b.mediaUrl) {
      const u = url(b.mediaUrl);
      if (u && (u.startsWith('http') || u.startsWith('/'))) return u;
    }
    return url(b.game?.thumbnailUrl) ?? null;
  }

  if (b.type === 'FEATURED_PRE_SALE') {
    if (b.mediaType === 'YOUTUBE_VIDEO' && b.mediaUrl) {
      const thumb = resolveYoutube(b.mediaUrl);
      if (thumb) return thumb;
    }
    if (b.mediaType === 'IMAGE' && b.mediaUrl) {
      const u = url(b.mediaUrl);
      if (u && (u.startsWith('http') || u.startsWith('/'))) return u;
    }
    return url(b.preSale?.thumbnailUrl) ?? null;
  }

  if (b.type === 'MANUAL') {
    if (b.mediaType === 'IMAGE') {
      const u = url(b.mediaUrl);
      if (u && (u.startsWith('http') || u.startsWith('/'))) return u;
    }
    if (b.mediaType === 'YOUTUBE_VIDEO' && b.mediaUrl) {
      return resolveYoutube(b.mediaUrl);
    }
    // MP4_VIDEO -> não há thumbnail; retornar null (placeholder)
  }

  return null;
}
