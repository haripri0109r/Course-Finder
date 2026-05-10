import axios from 'axios';
import * as cheerio from 'cheerio';
import { DEFAULT_IMAGE } from '../config/constants.js';
import { MetadataCache, AnalyticsEvent } from '../models/index.js';
import { extractYouTubeId } from '../utils/extractYouTubeId.js';

const inFlightRequests = new Map();

const PLATFORM_LABELS = {
  youtube: 'YouTube',
  udemy: 'Udemy',
  coursera: 'Coursera',
  edx: 'edX',
  skillshare: 'Skillshare',
  freecodecamp: 'freeCodeCamp',
  khanacademy: 'Khan Academy',
  pluralsight: 'Pluralsight',
  linkedin: 'LinkedIn Learning',
  udacity: 'Udacity',
  simplilearn: 'Simplilearn',
  greatlearning: 'Great Learning',
  geeksforgeeks: 'GeeksforGeeks',
  other: 'Other',
};

export const detectPlatform = (url = '') => {
  const value = String(url).toLowerCase();
  if (value.includes('youtube.com') || value.includes('youtu.be')) return 'youtube';
  if (value.includes('udemy.com')) return 'udemy';
  if (value.includes('coursera.org')) return 'coursera';
  if (value.includes('edx.org')) return 'edx';
  if (value.includes('skillshare.com')) return 'skillshare';
  if (value.includes('freecodecamp.org')) return 'freecodecamp';
  if (value.includes('khanacademy.org')) return 'khanacademy';
  if (value.includes('pluralsight.com')) return 'pluralsight';
  if (value.includes('linkedin.com/learning')) return 'linkedin';
  if (value.includes('udacity.com')) return 'udacity';
  if (value.includes('simplilearn.com')) return 'simplilearn';
  if (value.includes('greatlearning.in') || value.includes('greatlearning.com')) return 'greatlearning';
  if (value.includes('geeksforgeeks.org')) return 'geeksforgeeks';
  return 'other';
};

const asText = (value = '') => String(value || '').trim();

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

// Hardened axios GET with retries and sensible headers
const httpGet = async (url, opts = {}) => {
  const retries = opts.retries ?? 2;
  const timeout = opts.timeout ?? 10000;
  const headers = Object.assign(
    {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml',
      'Accept-Language': 'en-US,en;q=0.9',
      Referer: 'https://www.google.com/',
    },
    opts.headers || {}
  );

  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await axios.get(url, {
        timeout,
        headers,
        maxRedirects: 5,
        responseType: 'text',
        decompress: true,
        validateStatus: (s) => s >= 200 && s < 400,
      });
      return res;
    } catch (err) {
      lastErr = err;
      if (attempt === retries) throw lastErr;
      await new Promise((r) => setTimeout(r, 300 * (attempt + 1)));
    }
  }
  throw lastErr;
};

// Resolve final URL following redirects (best-effort)
const resolveFinalUrl = async (url) => {
  try {
    const res = await axios.head(url, { maxRedirects: 5, timeout: 8000, validateStatus: () => true, headers: { 'User-Agent': 'Mozilla/5.0', Referer: 'https://www.google.com/' } });
    // try to read final URL from response.request
    const final = res.request?.res?.responseUrl || res.request?.path || res.config?.url || url;
    return String(final);
  } catch (headErr) {
    try {
      const res = await httpGet(url, { timeout: 8000, retries: 1 });
      const final = res.request?.res?.responseUrl || res.request?.path || res.config?.url || url;
      return String(final);
    } catch {
      return url;
    }
  }
};

const scrapePage = async (url) => {
  const res = await httpGet(url, { timeout: 10000, retries: 2 });
  return cheerio.load(res.data);
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

const normalizeShape = (data = {}, platform = 'other', sourceUrl = '') => {
  const thumbnail = asText(data.thumbnail || data.image) || DEFAULT_IMAGE;
  const providerBadge = PLATFORM_LABELS[platform] || 'Other';
  return {
    title: asText(data.title) || 'Untitled Course',
    thumbnail,
    image: thumbnail,
    author: asText(data.author) || '',
    publisher: asText(data.publisher || data.provider) || '',
    logo: asText(data.logo || '' ) || '',
    duration: asText(data.duration) || '',
    description: asText(data.description) || '',
    platform,
    providerBadge,
    provider: providerBadge,
    sourceUrl,
  };
};

const isUdemyShareUrl = (url = '') => String(url).toLowerCase().includes('udemy.com/share/');

const isUsefulMetadata = (metadata = {}) => {
  const title = asText(metadata.title);
  const description = asText(metadata.description);
  const thumbnail = asText(metadata.thumbnail);
  const author = asText(metadata.author);
  const publisher = asText(metadata.publisher);
  return Boolean(title && title !== 'Untitled Course') || Boolean(description) || Boolean(thumbnail) || Boolean(author) || Boolean(publisher);
};

const buildSuccessResponse = (metadata, platform, sourceUrl) => {
  const normalized = normalizeShape(metadata, platform, sourceUrl);
  return {
    success: true,
    metadata: {
      title: normalized.title,
      description: normalized.description,
      thumbnail: normalized.thumbnail,
      author: normalized.author,
      publisher: normalized.publisher,
      logo: normalized.logo,
      sourceUrl: normalized.sourceUrl,
      platform: normalized.platform,
    },
    data: normalized,
  };
};

const buildFailureResponse = (reason = 'metadata_unavailable') => ({
  success: false,
  manualEntry: true,
  reason,
});

// Platform-specific fetchers (keep existing behavior but used as enrichment only)
const fetchYouTubeMetadata = async (url) => {
  const videoId = extractYouTubeId(url);
  if (!videoId) return {};
  try {
    const oembed = await axios.get('https://www.youtube.com/oembed', {
      params: { url: `https://www.youtube.com/watch?v=${videoId}`, format: 'json' },
      timeout: 8000,
      headers: { 'User-Agent': 'Mozilla/5.0', Referer: 'https://www.google.com/' },
    });

    let duration = '';
    try {
      const details = await axios.get(`https://www.youtube.com/watch?v=${videoId}&pbj=1`, { timeout: 8000, headers: { 'User-Agent': 'Mozilla/5.0' } });
      const content = JSON.stringify(details.data);
      const match = content.match(/"lengthSeconds":"(\d+)"/);
      if (match?.[1]) duration = humanDuration(match[1]);
    } catch {
      // ignore
    }

    return {
      title: oembed.data?.title,
      thumbnail: oembed.data?.thumbnail_url,
      author: oembed.data?.author_name,
      publisher: 'YouTube',
      duration,
      logo: 'https://www.youtube.com/s/desktop/14cba078/img/favicon_144x144.png',
    };
  } catch {
    return {};
  }
};

const fetchUdemyMetadata = async (url) => {
  try {
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
  } catch {
    return {};
  }
};

const fetchCourseraMetadata = async (url) => {
  try {
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
  } catch {
    return {};
  }
};

// Generic extraction: OpenGraph, Twitter, Standard meta, JSON-LD
const scrapeGenericPlatform = async (url) => {
  // First try a robust metadata API (Microlink) to avoid fragile scraping
  try {
    const ml = await fetchMicrolink(url);
    if (ml && (ml.title || ml.thumbnail || ml.description)) return ml;
  } catch {
    // continue to fallback
  }

  // Fallback: scrape page directly
  try {
    const $ = await scrapePage(url);
    const jsonLd = getJsonLdObjects($);

    const firstCourseObj = jsonLd.find((obj) => {
      const type = obj?.['@type'];
      return type === 'Course' || (Array.isArray(type) && type.includes('Course'));
    });

    const title =
      $('meta[property="og:title"]').attr('content') ||
      $('meta[name="twitter:title"]').attr('content') ||
      firstCourseObj?.name ||
      $('title').text();

    const thumbnail =
      $('meta[property="og:image"]').attr('content') ||
      $('meta[name="twitter:image"]').attr('content') ||
      firstCourseObj?.image ||
      '';

    const description =
      $('meta[property="og:description"]').attr('content') ||
      $('meta[name="description"]').attr('content') ||
      $('meta[name="twitter:description"]').attr('content') ||
      firstCourseObj?.description ||
      '';

    const author =
      $('meta[name="author"]').attr('content') ||
      firstCourseObj?.provider?.name ||
      (firstCourseObj?.author?.name || '') ||
      '';

    // try to get duration from json-ld timeRequired or other hints
    let duration = '';
    if (firstCourseObj?.timeRequired) duration = formatIsoDuration(firstCourseObj.timeRequired) || firstCourseObj.timeRequired;

    return { title, thumbnail, author, duration, description };
  } catch {
    return {};
  }
};

// Try Microlink API for robust metadata extraction. Optional API key via MICROLINK_KEY.
const fetchMicrolink = async (url) => {
  try {
    const params = { url };
    if (process.env.MICROLINK_KEY) params.key = process.env.MICROLINK_KEY;
    // request minimal but useful data
    const res = await axios.get('https://api.microlink.io', {
      params,
      timeout: 8000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36',
        Accept: 'application/json',
        Referer: 'https://www.google.com/',
      },
    });
    const data = res.data?.data || res.data;
    if (!data) return {};

    const title = data.title || '';
    const thumbnail = data.image?.url || data.image || data.logo?.url || '';
    const description = data.description || '';
    const author = data.author?.name || data.author || data.publisher?.name || data.publisher || '';
    const publisher = data.publisher?.name || data.publisher || data.siteName || data.url || '';
    const logo = data.logo?.url || '';

    return { title, thumbnail, description, author, publisher, logo };
  } catch (err) {
    return {};
  }
};

const mergePrefer = (base = {}, enrich = {}) => ({
  ...base,
  ...Object.fromEntries(Object.entries(enrich).filter(([, v]) => v != null && String(v).trim() !== '')),
});

const fetchUdemyMetadata = async (url, finalUrl) => {
  const targetUrl = finalUrl || url;
  const microlinkUrl = targetUrl || url;
  const metadata = await fetchMicrolink(microlinkUrl);

  if (isUsefulMetadata(metadata)) {
    return metadata;
  }

  if (isUdemyShareUrl(url)) {
    return { providerBlocked: true };
  }

  return {};
};

const fetchGenericMetadata = async (url) => {
  const metadata = await fetchMicrolink(url);
  if (isUsefulMetadata(metadata)) return metadata;

  // Best-effort HTML fallback for pages without Microlink coverage.
  try {
    const $ = await scrapePage(url);
    const jsonLd = getJsonLdObjects($);
    const firstCourseObj = jsonLd.find((obj) => {
      const type = obj?.['@type'];
      return type === 'Course' || (Array.isArray(type) && type.includes('Course'));
    });

    const fallback = {
      title:
        $('meta[property="og:title"]').attr('content') ||
        $('meta[name="twitter:title"]').attr('content') ||
        firstCourseObj?.name ||
        $('title').text(),
      thumbnail:
        $('meta[property="og:image"]').attr('content') ||
        $('meta[name="twitter:image"]').attr('content') ||
        firstCourseObj?.image ||
        '',
      description:
        $('meta[property="og:description"]').attr('content') ||
        $('meta[name="description"]').attr('content') ||
        $('meta[name="twitter:description"]').attr('content') ||
        firstCourseObj?.description ||
        '',
      author:
        $('meta[name="author"]').attr('content') ||
        firstCourseObj?.provider?.name ||
        (firstCourseObj?.author?.name || '') ||
        '',
      publisher:
        firstCourseObj?.provider?.name ||
        $('meta[property="og:site_name"]').attr('content') ||
        '',
      logo: $('link[rel="icon"]').attr('href') || '',
    };

    return fallback;
  } catch {
    return {};
  }
};

export const getMetadata = async (inputUrl) => {
  const originalUrl = String(inputUrl || '').trim();
  if (!originalUrl) return { success: false, manualEntry: true, reason: 'invalid_url' };

  // Resolve redirects to canonical final URL
  const finalUrl = await resolveFinalUrl(originalUrl);
  const platform = detectPlatform(finalUrl);

  if (inFlightRequests.has(finalUrl)) {
    return inFlightRequests.get(finalUrl);
  }

  const promise = (async () => {
    try {
      // check cache by final canonical URL
      const cached = await MetadataCache.findOne({ url: finalUrl });
      if (cached) {
        const normalized = normalizeShape(
          {
            title: cached.title,
            thumbnail: cached.thumbnail || cached.image,
            author: cached.author,
            duration: cached.duration,
            description: cached.description || '',
            publisher: cached.publisher || cached.provider || '',
            logo: cached.logo || '',
          },
          cached.platform || platform,
          cached.sourceUrl || finalUrl
        );
        return buildSuccessResponse(normalized, cached.platform || platform, cached.sourceUrl || finalUrl);
      }

      let enrichment = {};
      if (platform === 'youtube') {
        enrichment = await fetchYouTubeMetadata(finalUrl);
      } else if (platform === 'udemy') {
        enrichment = await fetchUdemyMetadata(originalUrl, finalUrl);
      } else {
        enrichment = await fetchGenericMetadata(finalUrl);
      }

      if (enrichment?.providerBlocked) {
        return buildFailureResponse('provider_blocked');
      }

      // Merge: enrichment values override any existing values when present
      const merged = mergePrefer({}, enrichment);

      const normalized = normalizeShape(merged, platform, finalUrl);

      // Determine if result is useful: at least title or thumbnail or description
      const hasUseful = (normalized.title && normalized.title !== 'Untitled Course') || normalized.thumbnail || normalized.description;
      if (!hasUseful) {
        return buildFailureResponse(platform === 'udemy' ? 'provider_blocked' : 'metadata_unavailable');
      }

      // store to cache
      await MetadataCache.findOneAndUpdate(
        { url: finalUrl },
        {
          url: finalUrl,
          title: normalized.title,
          image: normalized.thumbnail,
          thumbnail: normalized.thumbnail,
          author: normalized.author,
          duration: normalized.duration,
          provider: normalized.providerBadge,
          platform: normalized.platform,
          sourceUrl: normalized.sourceUrl,
          description: normalized.description || '',
          publisher: normalized.publisher || '',
          logo: normalized.logo || '',
          cachedAt: Date.now(),
        },
        { upsert: true, new: true }
      );

      setImmediate(() => {
        AnalyticsEvent.create({ event: 'metadata_fetch_success', metadata: { url: finalUrl, platform } }).catch(() => {});
      });

      return buildSuccessResponse(normalized, platform, finalUrl);
    } catch (error) {
      setImmediate(() => {
        AnalyticsEvent.create({ event: 'metadata_fetch_failed', metadata: { url: originalUrl, error: String(error?.message || error) } }).catch(() => {});
      });
      return buildFailureResponse(platform === 'udemy' ? 'provider_blocked' : 'metadata_unavailable');
    }
  })();

  inFlightRequests.set(finalUrl, promise);
  try {
    return await promise;
  } finally {
    inFlightRequests.delete(finalUrl);
  }
};
