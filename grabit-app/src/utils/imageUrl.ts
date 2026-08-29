import api from '../services/api';

/**
 * Resolves relative image URLs (e.g. backend /uploads/...) to absolute HTTP URLs.
 * Handles null/undefined/empty gracefully and preserves absolute URLs (http, https, data, file, blob).
 *
 * @param url The image URL or path string from API/local asset
 * @returns Fully qualified image URL string, or null if invalid/empty
 */
export function resolveImageUrl(url?: string | null, width: number = 720): string | null {
  if (!url || typeof url !== 'string' || !url.trim()) {
    return null;
  }

  let trimmed = url.trim();

  // If it's an Unsplash image, optimize size & quality for blazing fast mobile rendering
  if (trimmed.includes('images.unsplash.com')) {
    if (/w=\d+/.test(trimmed)) {
      trimmed = trimmed.replace(/w=\d+/, `w=${width}`).replace(/q=\d+/, 'q=75');
    } else {
      trimmed += `${trimmed.includes('?') ? '&' : '?'}w=${width}&q=75&auto=format`;
    }
  }

  // Already absolute or scheme-based URI
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('file:') ||
    trimmed.startsWith('blob:')
  ) {
    return trimmed;
  }

  // Backend static uploads path
  if (trimmed.startsWith('/uploads/') || trimmed.startsWith('uploads/')) {
    const rawBase = typeof api?.getBaseURL === 'function' ? api.getBaseURL() : 'http://localhost:5000/api';
    const cleanBase = rawBase.replace(/\/api\/?$/, '');
    const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
    return `${cleanBase}${cleanPath}`;
  }

  return trimmed;
}

export default resolveImageUrl;
