import { Image } from "react-native";

/**
 * Proactive Image Prefetching Utility.
 * Warms up the Expo/Native image cache after API fetch.
 * Defensive Check: Only prefetches valid http/https URLs.
 */
export const prefetchImages = (data = []) => {
  if (!Array.isArray(data)) return;

  data.forEach((item) => {
    const uri = item?.image;
    if (uri && (uri.startsWith("http://") || uri.startsWith("https://"))) {
      // Image.prefetch returns a promise, but we execute in background for warm-up
      Image.prefetch(uri).catch(() => {
        // Silently handle prefetch errors to avoid disrupting UI flow
      });
    }
  });
};
