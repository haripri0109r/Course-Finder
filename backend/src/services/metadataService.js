import axios from 'axios';
import * as cheerio from 'cheerio';
import { DEFAULT_IMAGE } from '../config/constants.js';
import { MetadataCache, AnalyticsEvent } from '../models/index.js';
import { extractYouTubeId } from '../utils/extractYouTubeId.js';
import { fetchLinkMetadata } from './linkMetadataService.js';

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


const isUsefulMetadata = (metadata = {}) => {
  const title = asText(metadata.title);
  const description = asText(metadata.description);
  const thumbnail = asText(metadata.thumbnail);
  const author = asText(metadata.author);
  const publisher = asText(metadata.publisher);
  return Boolean(title && title !== 'Untitled Course') || Boolean(description) || Boolean(thumbnail) || Boolean(author) || Boolean(publisher);
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

// Tech term mapping for intelligent slug-to-title conversion
// Longer, more specific terms should be listed first to prevent partial matches
const TECH_TERM_MAP = {
  'react-native': 'React Native',
  'full-stack': 'Full Stack',
  'node-js': 'Node.js',
  'next-js': 'Next.js',
  'express-js': 'Express.js',
  'machine-learning': 'Machine Learning',
  'deep-learning': 'Deep Learning',
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

const isGenericUdemyMetadata = (metadata = {}) => {
  const title = asText(metadata.title).toLowerCase();
  const author = asText(metadata.author).toLowerCase();
  const thumbnail = asText(metadata.thumbnail || metadata.image).toLowerCase();

  // Pattern 1: Exact generic homepage titles
  const GENERIC_TITLES = [
    "online courses - learn anything, on your schedule | udemy",
    "online courses - learn anything, on your schedule",
    "udemy: online courses"
  ];
  if (GENERIC_TITLES.includes(title)) return true;
  if (title === "udemy") return true;

  // Pattern 2: "| Udemy" suffix ONLY if the prefix is generic
  if (title.includes("| udemy")) {
    const prefix = title.split("|")[0].trim();
    const GENERIC_PREFIXES = ["udemy", "home", "page", "online courses"];
    if (!prefix || GENERIC_PREFIXES.includes(prefix)) return true;
  }

  // Pattern 3: Generic author with generic title
  if (author === "udemy" && (title.includes("online courses") || title.includes("learn anything"))) return true;

  // Pattern 4: Known generic brand assets
  if (thumbnail.includes("udemy-logo") || thumbnail.includes("default-meta-image")) return true;

  return false;
};

const extractUdemySlug = (url = '') => {
  try {
    const parsed = new URL(String(url));
    const path = parsed.pathname.toLowerCase();
    // Format: /course/course-name/ or /course/course-name
    const match = path.match(/^\/course\/([a-z0-9\-]+)/);
    return match?.[1] || '';
  } catch {
    return '';
  }
};

const generateTitleFromSlug = (slug = '') => {
  if (!slug) return '';
  
  // Clean the slug: replace multiple hyphens and trim
  const cleanSlug = slug.replace(/-+/g, '-').trim();
  const words = cleanSlug.split('-').filter(Boolean);
  
  const titleWords = [];
  let i = 0;
  
  while (i < words.length) {
    let foundTerm = false;
    
    // Try to find matching tech terms (greedy: check multi-word combinations first)
    // Max length 3 for terms like "full-stack-web-development" if mapped
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
      // Not a tech term, capitalize normally
      const word = words[i];
      titleWords.push(word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
      i++;
    }
  }
  
  return titleWords.join(' ');
};

const getDefaultUdemyThumbnail = () => {
  return 'https://www.udemy.com/staticx/udemy/images/v4/default-meta-image.png';
};

const isLikelyEncodedToken = (title = '') => {
  const value = asText(title);
  if (!value) return false;
  if (value.includes('@')) return true;
  if (value.length > 80 && !value.includes(' ')) return true;
  return /^[A-Za-z0-9@_\-=]{25,}$/.test(value);
};

const isBadThumbnail = (thumbnail = '') => {
  const value = String(thumbnail || '').toLowerCase();
  if (!value) return true;
  if (/(logo|favicon|icon)/i.test(value)) return true;
  return false;
};

export const isValidMetadata = (metadata = {}, sourceUrl = '') => {
  const title = asText(metadata.title);
  const thumbnail = asText(metadata.thumbnail || metadata.image);
  const description = asText(metadata.description);
  const author = asText(metadata.author);
  const publisher = asText(metadata.publisher || metadata.provider);
  const platform = detectPlatform(sourceUrl || metadata.sourceUrl || '');
  const isUdemyShare = String(sourceUrl || metadata.sourceUrl || '').toLowerCase().includes('udemy.com/share/');

  if (!title) return false;
  if (isLikelyEncodedToken(title)) return false;
  if (!thumbnail) return false;
  if (isBadThumbnail(thumbnail)) return false;

  const hasReadableSignal = Boolean(description) || Boolean(author) || Boolean(publisher);
  if (!hasReadableSignal) return false;

  if (platform === 'udemy' && isUdemyShare) {
    if (isLikelyEncodedToken(title)) return false;
    if (isBadThumbnail(thumbnail)) return false;
    if (!author && !publisher && !description) return false;
  }

  return true;
};

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

const pickJsonLdCourseObject = (objects = []) => {
  return objects.find((obj) => {
    const type = obj?.['@type'];
    return type === 'Course' || (Array.isArray(type) && type.includes('Course'));
  }) || objects.find((obj) => obj?.name || obj?.headline) || {};
};

const mergePrefer = (base = {}, enrich = {}) => ({
  ...base,
  ...Object.fromEntries(Object.entries(enrich).filter(([, v]) => v != null && String(v).trim() !== '')),
});

const fetchUdemyCourseMetadata = async (originalUrl, finalUrl) => {
  // Accept only canonical Udemy course pages.
  if (isUdemyShareUrl(originalUrl)) {
    return { invalidUdemyCourse: true };
  }
  if (!isUdemyCourseUrl(originalUrl) || !isUdemyCourseUrl(finalUrl)) {
    return { invalidUdemyCourse: true };
  }

  try {
    const response = await axios.get(finalUrl, {
      timeout: 10000,
      maxRedirects: 5,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
        Accept: 'text/html',
        Referer: 'https://www.google.com/',
      },
    });

    const $ = cheerio.load(response.data || '');
    const jsonLd = getJsonLdObjects($);
    const courseObj = pickJsonLdCourseObject(jsonLd);

    const jsonLdTitle = courseObj?.name || courseObj?.headline || '';
    const ogTitle = $('meta[property="og:title"]').attr('content') || '';
    const twitterTitle = $('meta[name="twitter:title"]').attr('content') || '';
    const pageTitle = $('title').text() || '';

    const title = asText(jsonLdTitle || ogTitle || twitterTitle || pageTitle);

    const jsonLdImage = Array.isArray(courseObj?.image) ? courseObj.image[0] : courseObj?.image;
    const thumbnail = asText(
      jsonLdImage ||
      $('meta[property="og:image"]').attr('content') ||
      $('meta[name="twitter:image"]').attr('content') ||
      ''
    );

    const jsonLdInstructor =
      courseObj?.creator?.name ||
      courseObj?.instructor?.name ||
      (Array.isArray(courseObj?.creator) ? courseObj.creator[0]?.name : '') ||
      (Array.isArray(courseObj?.instructor) ? courseObj.instructor[0]?.name : '') ||
      '';

    const author = asText(
      jsonLdInstructor ||
      $('meta[name="author"]').attr('content') ||
      $('[data-purpose="instructor-name-top"] span').first().text() ||
      ''
    );

    const durationRaw = courseObj?.timeRequired || '';
    const duration = asText(formatIsoDuration(durationRaw) || durationRaw);

    const description = asText(
      courseObj?.description ||
      $('meta[property="og:description"]').attr('content') ||
      $('meta[name="description"]').attr('content') ||
      ''
    );

    if (!title || isGenericUdemyMetadata({ title, thumbnail, author }) || isBadThumbnail(thumbnail)) {
      return { invalidUdemyCourse: true };
    }

    return {
      title,
      thumbnail,
      author,
      duration,
      description,
      publisher: 'Udemy',
    };
  } catch {
    return { invalidUdemyCourse: true };
  }
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
        if (!isValidMetadata(normalized, cached.sourceUrl || finalUrl)) {
          return buildFailureResponse('low_quality_metadata');
        }
        return buildSuccessResponse(normalized, cached.platform || platform, cached.sourceUrl || finalUrl);
      }

      let enrichment = {};

      // API-first strategy (Iframely). Manual scraping remains fallback.
      const apiMetadata = await fetchLinkMetadata(finalUrl);
      const normalizedApi = normalizeShape(apiMetadata, platform, finalUrl);
      if (isUsefulMetadata(apiMetadata) && isValidMetadata(normalizedApi, finalUrl)) {
        enrichment = apiMetadata;
      }

      if (!isUsefulMetadata(enrichment)) {
        if (platform === 'youtube') {
          enrichment = await fetchYouTubeMetadata(finalUrl);
        } else if (platform === 'udemy') {
          enrichment = await fetchUdemyCourseMetadata(originalUrl, finalUrl);
        } else if (platform === 'coursera') {
          enrichment = await fetchCourseraMetadata(finalUrl);
          if (!isUsefulMetadata(enrichment)) {
            enrichment = await fetchGenericMetadata(finalUrl);
          }
        } else {
          enrichment = await fetchGenericMetadata(finalUrl);
        }
      }

      if (enrichment?.invalidUdemyCourse) {
        // For Udemy course URLs, generate smart fallback from slug instead of failing
        const isUdemyDomain = /udemy\.com/i.test(finalUrl);
        if (isUdemyDomain && isUdemyCourseUrl(finalUrl)) {
          const slug = extractUdemySlug(finalUrl);
          if (slug) {
            const generatedTitle = generateTitleFromSlug(slug);
            if (generatedTitle) {
              const fallbackMetadata = {
                title: generatedTitle,
                thumbnail: null,
                author: 'Instructor unavailable',
                duration: '',
                description: '',
                publisher: 'Udemy',
              };
              const normalizedFallback = normalizeShape(fallbackMetadata, platform, finalUrl);
              await MetadataCache.findOneAndUpdate(
                { url: finalUrl },
                {
                  url: finalUrl,
                  title: normalizedFallback.title,
                  image: null,
                  thumbnail: null,
                  author: normalizedFallback.author,
                  duration: normalizedFallback.duration,
                  provider: normalizedFallback.providerBadge,
                  platform: normalizedFallback.platform,
                  sourceUrl: normalizedFallback.sourceUrl,
                  description: normalizedFallback.description || '',
                  publisher: normalizedFallback.publisher || '',
                  logo: normalizedFallback.logo || '',
                  cachedAt: Date.now(),
                },
                { upsert: true, new: true }
              );
              return buildSuccessResponse(fallbackMetadata, platform, finalUrl, true);
            }
          }
        }
        return buildFailureResponse('invalid_udemy_course');
      }

      if (enrichment?.providerBlocked) {
        return buildFailureResponse('provider_blocked');
      }

      // Merge: enrichment values override any existing values when present
      const merged = mergePrefer({}, enrichment);

      const normalized = normalizeShape(merged, platform, finalUrl);

      // For Udemy, check if we got generic metadata and generate fallback instead
      const isUdemyDomain = /udemy\.com/i.test(finalUrl);
      if (isUdemyDomain && isUdemyCourseUrl(finalUrl)) {
        if (isGenericUdemyMetadata(normalized)) {
          const slug = extractUdemySlug(finalUrl);
          if (slug) {
            const generatedTitle = generateTitleFromSlug(slug);
            if (generatedTitle && generatedTitle !== 'Untitled Course') {
              const fallbackMetadata = {
                title: generatedTitle,
                thumbnail: null,
                author: 'Instructor unavailable',
                duration: '',
                description: '',
                publisher: 'Udemy',
              };
              const normalizedFallback = normalizeShape(fallbackMetadata, platform, finalUrl);
              await MetadataCache.findOneAndUpdate(
                { url: finalUrl },
                {
                  url: finalUrl,
                  title: normalizedFallback.title,
                  image: null,
                  thumbnail: null,
                  author: normalizedFallback.author,
                  duration: normalizedFallback.duration,
                  provider: normalizedFallback.providerBadge,
                  platform: normalizedFallback.platform,
                  sourceUrl: normalizedFallback.sourceUrl,
                  description: normalizedFallback.description || '',
                  publisher: normalizedFallback.publisher || '',
                  logo: normalizedFallback.logo || '',
                  cachedAt: Date.now(),
                },
                { upsert: true, new: true }
              );
              return buildSuccessResponse(fallbackMetadata, platform, finalUrl, true);
            }
          }
        }
      }

      // Determine if result is useful: at least title or thumbnail or description
      const hasUseful = (normalized.title && normalized.title !== 'Untitled Course') || normalized.thumbnail || normalized.description;
      if (!hasUseful || !isValidMetadata(normalized, finalUrl)) {
        return buildFailureResponse('low_quality_metadata');
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
