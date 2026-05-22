import { ActivityEvent } from '../models/index.js';

/**
 * Lightweight Activity Event Instrumentation Service
 * Centralized helper to avoid duplicated logic in controllers.
 */
export const trackEvent = async ({ userId, eventType, targetId, targetType, metadata = {} }) => {
  try {
    // Basic validation
    if (!userId || !eventType) return;

    // Async write (non-blocking)
    setImmediate(async () => {
      try {
        await ActivityEvent.create({
          userId,
          eventType,
          targetId,
          targetType: targetType || 'unknown',
          metadata
        });
      } catch (err) {
        console.error(`[ActivityService] Failed to track event ${eventType}:`, err.message);
      }
    });
  } catch (err) {
    // Fail silently in production to avoid crashing main request flow
    console.error(`[ActivityService] Error in trackEvent helper:`, err.message);
  }
};

/**
 * Batch Event Tracking (Useful for client-side buffering)
 */
export const trackBatchEvents = async (events) => {
  try {
    if (!Array.isArray(events) || events.length === 0) return;
    
    // insertMany for performance
    await ActivityEvent.insertMany(events, { ordered: false });
  } catch (err) {
    console.error(`[ActivityService] Batch track failed:`, err.message);
  }
};
