import axios from 'axios';

const IFRAMELY_ENDPOINT = 'https://iframe.ly/api/iframely';

const asText = (value = '') => String(value || '').trim();

const detectPlatformFromUrl = (url = '') => {
  const value = String(url).toLowerCase();
  if (value.includes('youtube.com') || value.includes('youtu.be')) return 'youtube';
  if (value.includes('udemy.com')) return 'udemy';
  if (value.includes('coursera.org')) return 'coursera';
  if (value.includes('edx.org')) return 'edx';
  if (value.includes('skillshare.com')) return 'skillshare';
  if (value.includes('pluralsight.com')) return 'pluralsight';
  if (value.includes('freecodecamp.org')) return 'freecodecamp';
  if (value.includes('linkedin.com/learning')) return 'linkedin';
  return 'other';
};

const normalizeDuration = (value) => {
  if (!value) return '';
  const asNumber = Number(value);
  if (Number.isFinite(asNumber) && asNumber > 0) {
    const hours = Math.floor(asNumber / 3600);
    const minutes = Math.floor((asNumber % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  }

  const raw = asText(value);
  const match = raw.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/i);
  if (!match) return raw;
  const h = Number(match[1] || 0);
  const m = Number(match[2] || 0);
  const s = Number(match[3] || 0);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  if (s > 0) return `${s}s`;
  return '';
};

export const fetchLinkMetadata = async (url) => {
  const apiKey = process.env.IFRAMELY_API_KEY;
  if (!apiKey) {
    return {};
  }

  try {
    const response = await axios.get(IFRAMELY_ENDPOINT, {
      timeout: 10000,
      params: { url, api_key: apiKey },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36',
        Accept: 'application/json',
      },
    });

    const payload = response.data || {};
    const links = payload.links || {};
    const meta = payload.meta || {};

    const title = asText(payload.title || meta.title);
    const thumbnail = asText(
      links.thumbnail?.[0]?.href ||
      links.image?.[0]?.href ||
      links.player?.[0]?.thumbnail ||
      ''
    );
    const author = asText(
      meta.author ||
      payload.author ||
      meta.creator ||
      ''
    );
    const duration = normalizeDuration(meta.duration || payload.duration || payload.media?.duration);
    const platform = detectPlatformFromUrl(payload.url || url);

    return {
      title,
      thumbnail,
      author,
      duration,
      platform,
      publisher: asText(meta.site || meta.publisher || payload.site),
      sourceUrl: asText(payload.url || url),
    };
  } catch {
    return {};
  }
};
