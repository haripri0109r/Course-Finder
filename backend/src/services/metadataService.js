import axios from 'axios';
import * as cheerio from 'cheerio';
import { DEFAULT_IMAGE } from '../config/constants.js';
import { MetadataCache, AnalyticsEvent } from '../models/index.js';

// In-flight request lock to prevent cache stampede
const inFlightRequests = new Map();

/**
 * Smart URL Normalization: Preserves 'v=' for YouTube, strips query for others.
 */
const normalizeUrl = (url) => {
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtube.com')) {
      const v = u.searchParams.get('v');
      u.search = v ? `?v=${v}` : '';
    } else if (u.hostname.includes('youtu.be')) {
      u.search = '';
    } else {
      u.search = ''; // Strip for generic platforms
    }
    return u.toString();
  } catch {
    return url;
  }
};

/**
 * Utility to format ISO 8601 duration (PT#H#M#S) to readable string
 */
const formatDuration = (iso) => {
  if (!iso) return 'N/A';
  const match = iso.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
  if (!match) return 'N/A';

  const hours = (match[1] || '').replace('H', '');
  const minutes = (match[2] || '').replace('M', '');
  const seconds = (match[3] || '').replace('S', '');

  let result = '';
  if (hours) result += `${hours}h `;
  if (minutes) result += `${minutes}m `;
  if (!hours && seconds) result += `${seconds}s`;

  return result.trim() || 'N/A';
};

/**
 * Fetch YouTube Metadata using Data API v3
 */
export const fetchYouTubeMetadata = async (videoId) => {
  const API_KEY = process.env.YOUTUBE_API_KEY;

  if (!API_KEY || API_KEY === 'your_google_cloud_youtube_v3_api_key_here') {
    throw new Error('YouTube API key missing or invalid');
  }

  const response = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
    params: {
      id: videoId,
      key: API_KEY,
      part: 'snippet,contentDetails',
    },
    timeout: 5000,
  });

  if (!response.data.items || response.data.items.length === 0) {
    throw new Error('YouTube video not found');
  }

  const video = response.data.items[0];
  const { snippet, contentDetails } = video;

  return {
    title: snippet.title,
    image: snippet.thumbnails?.high?.url || snippet.thumbnails?.default?.url || DEFAULT_IMAGE,
    provider: snippet.channelTitle || 'YouTube',
    duration: formatDuration(contentDetails.duration),
  };
};

/**
 * Scrape Generic Metadata (Open Graph) using Cheerio
 */
export const scrapeGenericMetadata = async (url) => {
  const { data } = await axios.get(url, {
    timeout: 5000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    },
  });

  const $ = cheerio.load(data);
  const domain = new URL(url).hostname.replace('www.', '');

  const title = 
    $('meta[property="og:title"]').attr('content') || 
    $('title').text() || 
    'Untitled Course';

  const image = 
    $('meta[property="og:image"]').attr('content') || 
    $('meta[name="twitter:image"]').attr('content') || 
    null;

  const provider = 
    $('meta[property="og:site_name"]').attr('content') || 
    domain.charAt(0).toUpperCase() + domain.slice(1);

  return {
    title: title.trim(),
    image,
    provider: provider.trim(),
    duration: 'N/A',
  };
};

/**
 * Exposed service to fetch and cache metadata
 */
export const getMetadata = async (url) => {
  const normalized = normalizeUrl(url);

  // 1. Check in-flight lock for cache stampede protection
  if (inFlightRequests.has(normalized)) {
    console.log(`Lock Match: ${normalized} (reusing promise)`);
    return inFlightRequests.get(normalized);
  }

  const fetchPromise = (async () => {
    try {
      // 2. Check DB Cache
      const cached = await MetadataCache.findOne({ url: normalized });
      if (cached) {
        console.log(`DB Cache Hit: ${normalized}`);
        return { ...cached.toObject(), success: true };
      }

      // 3. Persistent Fetch with 5s Timeout Fallback
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Fetch Timeout')), 5000)
      );

      const performFetch = async () => {
        let data;
        const { extractYouTubeId } = await import('../utils/extractYouTubeId.js');
        const videoId = extractYouTubeId(url);

        if (videoId) {
          try {
            data = await fetchYouTubeMetadata(videoId);
          } catch (ytError) {
            console.warn(`YouTube API failed, falling back to scraper: ${ytError.message}`);
            data = await scrapeGenericMetadata(url);
          }
        } else {
          data = await scrapeGenericMetadata(url);
        }

        // Standardize
        return {
          ...data,
          image: data.image || DEFAULT_IMAGE,
          url: normalized,
        };
      };

      let resultData;
      try {
        resultData = await Promise.race([performFetch(), timeoutPromise]);
      } catch (raceErr) {
        console.warn(`Primary fetch timed out or failed, absolute generic fallback: ${raceErr.message}`);
        resultData = await scrapeGenericMetadata(url);
        resultData.url = normalized;
        resultData.image = resultData.image || DEFAULT_IMAGE;
      }

      // 4. Upsert Cache
      await MetadataCache.findOneAndUpdate(
        { url: normalized },
        { ...resultData, cachedAt: Date.now() },
        { upsert: true, new: true }
      );

      // 5. Asynchronous Analytics (Non-blocking)
      setImmediate(() => {
        AnalyticsEvent.create({
          event: 'metadata_fetch_success',
          metadata: { url: normalized, provider: resultData.provider }
        }).catch(err => console.error('Analytics failed:', err.message));
      });

      return { ...resultData, success: true };
    } catch (error) {
      setImmediate(() => {
        AnalyticsEvent.create({
          event: 'metadata_fetch_failed',
          metadata: { url: normalized, error: error.message }
        }).catch(() => {});
      });
      throw error;
    }
  })();

  // Set lock
  inFlightRequests.set(normalized, fetchPromise);

  // Safety cleanup for Map (15s deadman switch)
  setTimeout(() => inFlightRequests.delete(normalized), 15000);

  try {
    const finalData = await fetchPromise;
    return finalData;
  } finally {
    inFlightRequests.delete(normalized);
  }
};
