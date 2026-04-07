/**
 * Simple logger for production media issues.
 * This helps track broken images and bad uploads without crashing.
 */
export const logImageError = (info) => {
  const meta = {
    message: info.message || "Unknown image error",
    url: info.url || "N/A",
    userId: info.userId || "guest",
    timestamp: new Date().toISOString(),
    event: info.event || "MEDIA_ISSUE",
  };

  // In production, this would go to a service like Sentry or CloudWatch.
  // For now, we use structured console logging for easier log monitoring.
  console.warn(JSON.stringify(meta));
};
