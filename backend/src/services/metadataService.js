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

const resolveFinalUrl = async (url) => {
  try {
    const res = await axios.head(url, { maxRedirects: 5, timeout: 8000, validateStatus: () => true, headers: { 'User-Agent': 'Mozilla/5.0', Referer: 'https://www.google.com/' } });
    const final = res.request?.res?.responseUrl || res.request?.path || res.config?.url || url;
    return String(final);
  } catch {
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
      // ignore
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

const isUdemyCourseUrl = (url = '') => {
  try {
    const parsed = new URL(String(url));
    const host = parsed.hostname.toLowerCase();
    const path = parsed.pathname.toLowerCase();
    return host.includes('udemy.com') && path.startsWith('/course/');
  } catch {
    return false;
  }
};

const buildSuccessResponse = (metadata, platform, sourceUrl, generatedFallback = false) => {
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
      generatedFallback,
    },
    data: { ...normalized, generatedFallback },
  };
};

const buildFailureResponse = (reason = 'metadata_unavailable') => ({
  success: false,
  manualEntry: true,
  reason,
});

const TECH_TERM_MAP = {
  'react-native': 'React Native',
  'full-stack': 'Full Stack',
  'node-js': 'Node.js',
  'next-js': 'Next.js',
  'express-js': 'Express.js',
  'machine-learning': 'Machine Learning',
  'deep-learning': 'Deep Learning',
  'node-js-complete-guide': 'Node.js Complete Guide',
  javascript: 'JavaScript',
  typescript: 'TypeScript',
  nodejs: 'Node.js',
  nextjs: 'Next.js',
  expressjs: 'Express.js',
  mongodb: 'MongoDB',
  graphql: 'GraphQL',
  js: 'JavaScript',
  ts: 'TypeScript',
  react: 'React',
  node: 'Node.js',
  python: 'Python',
  sql: 'SQL',
  aws: 'AWS',
  html: 'HTML',
  css: 'CSS',
  php: 'PHP',
  java: 'Java',
  cpp: 'C++',
  csharp: 'C#',
  go: 'Go',
  rust: 'Rust',
  swift: 'Swift',
  kotlin: 'Kotlin',
  ruby: 'Ruby',
  vue: 'Vue',
  angular: 'Angular',
  docker: 'Docker',
  kubernetes: 'Kubernetes',
  rest: 'REST',
  api: 'API',
  ai: 'AI',
  ml: 'Machine Learning',
  dl: 'Deep Learning',
  nlp: 'NLP',
  backend: 'Backend',
  frontend: 'Frontend',
};

const isGenericUdemyThumbnail = (image = "") => {
  const img = String(image || "").toLowerCase();
  if (!img) return true;
  return (
    img.includes("udemy.com/staticx") ||
    img.includes("udemy-logo") ||
    img.includes("logo-udemy") ||
    img.includes("default-meta-image") ||
    img.includes("brand-logo")
  );
};

const extractUdemySlug = (url = '') => {
  try {
    const parsed = new URL(String(url));
    const path = parsed.pathname.toLowerCase();
    
    // Pattern 1: /course/slug/ (standard or learn page)
    const match = path.match(/\/course\/([^/]+)/);
    if (match?.[1]) return match[1];
    
    return '';
  } catch {
    return '';
  }
};

const generateTitleFromSlug = (slug = '') => {
  if (!slug) return '';
  const cleanSlug = slug.replace(/-+/g, '-').trim();
  const words = cleanSlug.split('-').filter(Boolean);
  const titleWords = [];
  let i = 0;
  while (i < words.length) {
    let foundTerm = false;
    for (let len = Math.min(3, words.length - i); len >= 1; len--) {
      const candidate = words.slice(i, i + len).join('-').toLowerCase();
      if (TECH_TERM_MAP[candidate]) {
        titleWords.push(TECH_TERM_MAP[candidate]);
        i += len;
        foundTerm = true;
        break;
      }
    }
    if (!foundTerm) {
      const word = words[i];
      titleWords.push(word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
      i++;
    }
  }
  return titleWords.join(' ');
};

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
    } catch { /* ignore */ }
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

const fetchCourseraMetadata = async (url) => {
  try {
    const $ = await scrapePage(url);
    const jsonLd = getJsonLdObjects($);
    const courseObj = jsonLd.find((obj) => obj?.['@type'] === 'Course');
    const title = $('meta[property="og:title"]').attr('content') || courseObj?.name || $('h1').first().text();
    const thumbnail = $('meta[property="og:image"]').attr('content') || courseObj?.image;
    const author = courseObj?.provider?.name || $('[data-testid="instructor-name"]').first().text() || '';
    const durationRaw = courseObj?.timeRequired || '';
    const duration = formatIsoDuration(durationRaw) || durationRaw;
    return { title, thumbnail, author, duration };
  } catch {
    return {};
  }
};

const fetchGenericMetadata = async (url) => {
  try {
    const $ = await scrapePage(url);
    const jsonLd = getJsonLdObjects($);
    const firstCourseObj = jsonLd.find((obj) => {
      const type = obj?.['@type'];
      return type === 'Course' || (Array.isArray(type) && type.includes('Course'));
    });
    return {
      title: $('meta[property="og:title"]').attr('content') || $('meta[name="twitter:title"]').attr('content') || firstCourseObj?.name || $('title').text(),
      thumbnail: $('meta[property="og:image"]').attr('content') || $('meta[name="twitter:image"]').attr('content') || firstCourseObj?.image || '',
      description: $('meta[property="og:description"]').attr('content') || $('meta[name="description"]').attr('content') || firstCourseObj?.description || '',
      author: $('meta[name="author"]').attr('content') || firstCourseObj?.provider?.name || '',
      publisher: firstCourseObj?.provider?.name || $('meta[property="og:site_name"]').attr('content') || '',
      logo: $('link[rel="icon"]').attr('href') || '',
    };
  } catch {
    return {};
  }
};

export const getMetadata = async (inputUrl) => {
  const originalUrl = String(inputUrl || '').trim();
  if (!originalUrl) return { success: false, manualEntry: true, reason: 'invalid_url' };

  const finalUrl = await resolveFinalUrl(originalUrl);
  const platform = detectPlatform(finalUrl);

  if (inFlightRequests.has(finalUrl)) return inFlightRequests.get(finalUrl);

  const promise = (async () => {
    try {
      const cached = await MetadataCache.findOne({ url: finalUrl });
      if (cached) {
        const normalized = normalizeShape({
          title: cached.title,
          thumbnail: cached.thumbnail || cached.image,
          author: cached.author,
          duration: cached.duration,
          description: cached.description || '',
          publisher: cached.publisher || '',
          logo: cached.logo || '',
        }, cached.platform || platform, finalUrl);
        return buildSuccessResponse(normalized, cached.platform || platform, finalUrl);
      }

      let enrichment = {};
      if (platform === 'youtube') {
        enrichment = await fetchYouTubeMetadata(finalUrl);
      } else if (platform === 'udemy') {
        const slug = extractUdemySlug(finalUrl);
        if (slug) {
          enrichment = {
            title: generateTitleFromSlug(slug) || 'Udemy Course',
            thumbnail: null,
            author: 'Instructor unavailable',
            publisher: 'Udemy',
            generatedFallback: true
          };
        } else if (originalUrl.includes('udemy.com/share/')) {
          // Fallback for share URLs that fail to resolve or have weird paths
          enrichment = {
            title: 'Udemy Course',
            thumbnail: null,
            author: 'Instructor unavailable',
            publisher: 'Udemy',
            generatedFallback: true
          };
        }
      } else if (platform === 'coursera') {
        enrichment = await fetchCourseraMetadata(finalUrl);
      } else {
        enrichment = await fetchGenericMetadata(finalUrl);
      }

      const normalized = normalizeShape(enrichment, platform, finalUrl);
      const isGenerated = enrichment?.generatedFallback || false;

      if (!normalized.title || normalized.title === 'Untitled Course') {
        const fallback = { title: 'Course Preview', author: 'Unknown', image: null };
        return buildSuccessResponse(fallback, platform, finalUrl, true);
      }

      // Safety: No generic Udemy logos in cache
      if (platform === 'udemy' && normalized.thumbnail && isGenericUdemyThumbnail(normalized.thumbnail)) {
        normalized.thumbnail = null;
        normalized.image = null;
      }

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

      return buildSuccessResponse(normalized, platform, finalUrl, isGenerated);
    } catch (error) {
      setImmediate(() => {
        AnalyticsEvent.create({ event: 'metadata_fetch_failed', metadata: { url: originalUrl, error: String(error?.message || error) } }).catch(() => {});
      });
      const recoveryFallback = { title: 'Course Preview', author: 'Unknown', image: null };
      return buildSuccessResponse(recoveryFallback, platform, finalUrl, true);
    }
  })();

  inFlightRequests.set(finalUrl, promise);
  try {
    return await promise;
  } finally {
    inFlightRequests.delete(finalUrl);
  }
};
