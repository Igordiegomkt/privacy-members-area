/**
 * Configuração das URLs base para fotos e vídeos
 * Ajuste estas URLs conforme seu bucket do Backblaze B2
 */

export const MEDIA_CONFIG = {
  // URLs base do Backblaze B2 (ou outro CDN)
  VIDEO_BASE_URL: 'https://conteudos.s3.us-east-005.backblazeb2.com/video/video',
  PHOTO_BASE_URL: 'https://conteudos.s3.us-east-005.backblazeb2.com/foto/foto',
  
  // Quantidade de mídias disponíveis
  TOTAL_VIDEOS: 21,
  TOTAL_PHOTOS: 44,
  
  // Extensões dos arquivos
  VIDEO_EXTENSION: '.mp4',
  PHOTO_EXTENSION: '.png',
};

/**
 * Gera array de vídeos
 */
export const generateVideos = () => {
  return Array.from({ length: MEDIA_CONFIG.TOTAL_VIDEOS }, (_, i) => ({
    id: `video-${i + 1}`,
    type: 'video' as const,
    url: `${MEDIA_CONFIG.VIDEO_BASE_URL}${i + 1}${MEDIA_CONFIG.VIDEO_EXTENSION}`,
    thumbnail: `${MEDIA_CONFIG.PHOTO_BASE_URL}${i + 1}${MEDIA_CONFIG.PHOTO_EXTENSION}`, // Thumbnail pode ser uma foto
  }));
};

/**
 * Gera array de fotos
 */
export const generatePhotos = () => {
  return Array.from({ length: MEDIA_CONFIG.TOTAL_PHOTOS }, (_, i) => ({
    id: `photo-${i + 1}`,
    type: 'image' as const,
    url: `${MEDIA_CONFIG.PHOTO_BASE_URL}${i + 1}${MEDIA_CONFIG.PHOTO_EXTENSION}`,
    thumbnail: `${MEDIA_CONFIG.PHOTO_BASE_URL}${i + 1}${MEDIA_CONFIG.PHOTO_EXTENSION}`,
  }));
};

/**
 * Combina e embaralha vídeos e fotos
 */
export const generateAllMedia = () => {
  const videos = generateVideos();
  const photos = generatePhotos();
  const allMedia = [...videos, ...photos];
  
  // Embaralhar array (Fisher-Yates shuffle)
  for (let i = allMedia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [allMedia[i], allMedia[j]] = [allMedia[j], allMedia[i]];
  }
  
  return allMedia;
};

