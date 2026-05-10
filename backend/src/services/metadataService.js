import axios from 'axios';
import * as cheerio from 'cheerio';
import { DEFAULT_IMAGE } from '../config/constants.js';
import { MetadataCache, AnalyticsEvent } from '../models/index.js';
import { extractYouTubeId } from '../utils/extractYouTubeId.js';

const inFlightRequests = new Map();
const SUPPORTED_PLATFORMS = new Set([
  'youtube',
  'udemy',
  'coursera',
  'edx',
  'skillshare',
  'freecodecamp',
  'khanacademy',
  'pluralsight',
]);

const PLATFORM_LABELS = {
  youtube: 'YouTube',
  udemy: 'Udemy',
  coursera: 'Coursera',
  edx: 'edX',
  skillshare: 'Skillshare',
  freecodecamp: 'freeCodeCamp',
  khanacademy: 'Khan Academy',
  pluralsight: 'Pluralsight',
  other: 'Other',
};

export const detectPlatform = (url = '') => {
  const value = url.toLowerCase();
  if (value.includes('youtube.com') || value.includes('youtu.be')) return 'youtube';
  if (value.includes('udemy.com')) return 'udemy';
  if (value.includes('coursera.org')) return 'coursera';
  if (value.includes('edx.org')) return 'edx';
  if (value.includes('skillshare.com')) return 'skillshare';
  if (value.includes('freecodecamp.org')) return 'freecodecamp';
  if (value.includes('khanacademy.org')) return 'khanacademy';
  if (value.includes('pluralsight.com')) return 'pluralsight';
  return 'other';
};

const normalizeUrl = (url) => {
  try {
    const parsed = new URL(url);
    parsed.hash = '';
    if (parsed.hostname.includes('youtube.com')) {
      const id = parsed.searchParams.get('v');
      parsed.search = id ? `v=${id}` : '';
    } else if (parsed.hostname.includes('youtu.be')) {
      parsed.search = '';
    } else {
      parsed.search = '';
    }
    return parsed.toString();
  } catch {
    return url;
  }
};

const asText = (value = '') => String(value).trim();

const humanDuration = (seconds) => {
  const n = Number(seconds);
  if (!Number.isFinite(n) || n <= 0) return '';
  const hours = Math.floor(n / 3600);
  const minutes = Math.floor((n % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

const formatIsoDuration = (iso) => {
  if (!iso) return '';
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/i);
  if (!match) return '';
  const hours = Number(match[1] || 0);
  const minutes = Number(match[2] || 0);
  const seconds = Number(match[3] || 0);
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m`;
  if (seconds > 0) return `${seconds}s`;
  return '';
};

const scrapePage = async (url) => {
  const response = await axios.get(url, {
    timeout: 10000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; CourseFinderBot/1.0)',
      Accept: 'text/html,application/xhtml+xml',
    },
  });
  return cheerio.load(response.data);
};

const getJsonLdObjects = ($) => {
  const objects = [];
  $('script[type="application/ld+json"]').each((_, node) => {
    try {
      const raw = $(node).contents().text();
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) objects.push(...parsed);
      else objects.push(parsed);
    } catch {
      // ignore invalid blocks
    }
  });
  return objects;
};

const normalizeShape = (data, platform, sourceUrl) => ({
  title: asText(data.title) || 'Untitled Course',
  thumbnail: asText(data.thumbnail || data.image) || DEFAULT_IMAGE,
  author: asText(data.author) || '',
  duration: asText(data.duration) || '',
  platform,
  providerBadge: PLATFORM_LABELS[platform] || 'Other',
  sourceUrl,
});

const fetchYouTubeMetadata = async (url) => {
  const videoId = extractYouTubeId(url);
  if (!videoId) throw new Error('Unable to read YouTube video id');

  const oembed = await axios.get('https://www.youtube.com/oembed', {
    params: { url: `https://www.youtube.com/watch?v=${videoId}`, format: 'json' },
    timeout: 8000,
  });

  let duration = '';
  try {
    const details = await axios.get(
      `https://www.youtube.com/watch?v=${videoId}&pbj=1`,
      { timeout: 8000, headers: { 'User-Agent': 'Mozilla/5.0' } }
    );
    const content = JSON.stringify(details.data);
    const match = content.match(/"lengthSeconds":"(\d+)"/);
    if (match?.[1]) duration = humanDuration(match[1]);
  } catch {
    // duration optional; keep empty when blocked
  }

  return {
    title: oembed.data?.title,
    thumbnail: oembed.data?.thumbnail_url,
    author: oembed.data?.author_name,
    duration,
  };
};

const scrapeGenericPlatform = async (url) => {
  const $ = await scrapePage(url);
  const jsonLd = getJsonLdObjects($);
  const courseObj = jsonLd.find((obj) => {
    const type = obj?.['@type'];
    return type === 'Course' || (Array.isArray(type) && type.includes('Course'));
  });

  const title =
    $('meta[property="og:title"]').attr('content') ||
    courseObj?.name ||
    $('title').text();
  const thumbnail =
    $('meta[property="og:image"]').attr('content') ||
    $('meta[name="twitter:image"]').attr('content') ||
    courseObj?.image;
  const author =
    $('meta[name="author"]').attr('content') ||
    courseObj?.provider?.name ||
    courseObj?.author?.name ||
    '';

  return {
    title,
    thumbnail,
    author,
    duration: '',
  };
};

const fetchUdemyMetadata = async (url) => {
  const $ = await scrapePage(url);
  const jsonLd = getJsonLdObjects($);
  const courseObj = jsonLd.find((obj) => obj?.['@type'] === 'Course');
  const title = $('meta[property="og:title"]').attr('content') || courseObj?.name || $('title').text();
  const thumbnail = $('meta[property="og:image"]').attr('content') || courseObj?.image;
  const author =
    $('meta[name="author"]').attr('content') ||
    $('a[data-purpose="instructor-name-top"] span').first().text() ||
    courseObj?.provider?.name ||
    '';
  const duration =
    $('[data-purpose="curriculum-stats"] span').first().text() ||
    courseObj?.timeRequired ||
    '';

  return { title, thumbnail, author, duration: formatIsoDuration(duration) || duration };
};

const fetchCourseraMetadata = async (url) => {
  const $ = await scrapePage(url);
  const jsonLd = getJsonLdObjects($);
  const courseObj = jsonLd.find((obj) => obj?.['@type'] === 'Course');
  const title = $('meta[property="og:title"]').attr('content') || courseObj?.name || $('h1').first().text();
  const thumbnail = $('meta[property="og:image"]').attr('content') || courseObj?.image;
  const author =
    courseObj?.provider?.name ||
    $('[data-testid="instructor-name"]').first().text() ||
    $('[class*="instructor"]').first().text() ||
    '';
  const duration =
    $('[data-testid="CourseDuration"]').first().text() ||
    courseObj?.timeRequired ||
    '';
  return { title, thumbnail, author, duration: formatIsoDuration(duration) || duration };
};

const fetchByPlatform = async (platform, url) => {
  if (platform === 'youtube') return fetchYouTubeMetadata(url);
  if (platform === 'udemy') return fetchUdemyMetadata(url);
  if (platform === 'coursera') return fetchCourseraMetadata(url);
  if (SUPPORTED_PLATFORMS.has(platform)) return scrapeGenericPlatform(url);
  return null;
};

export const getMetadata = async (url) => {
  const sourceUrl = normalizeUrl(url);
  const platform = detectPlatform(sourceUrl);

  if (!SUPPORTED_PLATFORMS.has(platform)) {
    return { success: false, manualEntry: true };
  }

  if (inFlightRequests.has(sourceUrl)) {
    return inFlightRequests.get(sourceUrl);
  }

  const promise = (async () => {
    try {
      const cached = await MetadataCache.findOne({ url: sourceUrl });
      if (cached) {
        return {
          success: true,
          data: normalizeShape(
            {
              title: cached.title,
              thumbnail: cached.thumbnail || cached.image,
              author: cached.author,
              duration: cached.duration,
            },
            cached.platform || platform,
            cached.sourceUrl || sourceUrl
          ),
        };
      }

      const fetched = await fetchByPlatform(platform, sourceUrl);
      if (!fetched) return { success: false, manualEntry: true };

      const normalized = normalizeShape(fetched, platform, sourceUrl);

      await MetadataCache.findOneAndUpdate(
        { url: sourceUrl },
        {
          url: sourceUrl,
          title: normalized.title,
          image: normalized.thumbnail,
          thumbnail: normalized.thumbnail,
          author: normalized.author,
          duration: normalized.duration,
          provider: normalized.providerBadge,
          platform: normalized.platform,
          sourceUrl: normalized.sourceUrl,
          cachedAt: Date.now(),
        },
        { upsert: true, new: true }
      );

      setImmediate(() => {
        AnalyticsEvent.create({
          event: 'metadata_fetch_success',
          metadata: { url: sourceUrl, platform },
        }).catch(() => {});
      });

      return { success: true, data: normalized };
    } catch (error) {
      setImmediate(() => {
        AnalyticsEvent.create({
          event: 'metadata_fetch_failed',
          metadata: { url: sourceUrl, error: error.message },
        }).catch(() => {});
      });
      throw error;
    }
  })();

  inFlightRequests.set(sourceUrl, promise);
  try {
    return await promise;
  } finally {
    inFlightRequests.delete(sourceUrl);
  }
};
