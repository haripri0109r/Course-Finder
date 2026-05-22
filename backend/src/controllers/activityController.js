import { ActivityEvent } from '../models/index.js';
import mongoose from 'mongoose';

const VALID_EVENT_TYPES = ['impression', 'click', 'share', 'search', 'dwell', 'save', 'follow', 'view'];

// ─────────────────────────────────────────────────────────────────────────────
// @route   POST /api/v1/activity/track
// @access  Private
// ─────────────────────────────────────────────────────────────────────────────
export const trackActivity = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const body = req.body;

    let eventsToProcess = [];

    // 1. Normalize payload (support single or batch)
    if (body.events && Array.isArray(body.events)) {
      eventsToProcess = body.events;
    } else if (body.eventType) {
      eventsToProcess = [body];
    } else {
      return res.status(400).json({ success: false, message: 'Invalid payload format.' });
    }

    if (eventsToProcess.length === 0) {
      return res.status(400).json({ success: false, message: 'No events provided.' });
    }

    const validEvents = [];
    const impressionChecks = []; // to handle deduplication logic
    const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000);

    // 2. Validate and group events
    for (const evt of eventsToProcess) {
      if (!evt.eventType || !VALID_EVENT_TYPES.includes(evt.eventType)) {
        continue;
      }
      
      const eventDoc = {
        userId,
        eventType: evt.eventType,
        targetId: evt.targetId || null,
        targetType: evt.targetType || 'unknown',
        metadata: evt.metadata || {},
        createdAt: new Date(),
      };

      if (evt.eventType === 'impression') {
        impressionChecks.push(eventDoc);
      } else {
        validEvents.push(eventDoc);
      }
    }

    // 3. Impression Deduplication (Server-side)
    // For each impression, check if one exists in the last 5 minutes.
    if (impressionChecks.length > 0) {
      // Find recent impressions for this user for the specific targets
      const targetIds = impressionChecks.map(e => e.targetId).filter(Boolean);
      
      let recentImpressions = [];
      if (targetIds.length > 0) {
        recentImpressions = await ActivityEvent.find({
          userId,
          eventType: 'impression',
          targetId: { $in: targetIds },
          createdAt: { $gte: fiveMinsAgo }
        }).select('targetId').lean();
      }

      const recentTargetIds = new Set(recentImpressions.map(i => i.targetId?.toString()));

      for (const imp of impressionChecks) {
        if (imp.targetId && recentTargetIds.has(imp.targetId.toString())) {
          // Skip duplicate impression
          continue;
        }
        validEvents.push(imp);
      }
    }

    // 4. Bulk Write
    if (validEvents.length > 0) {
      await ActivityEvent.insertMany(validEvents, { ordered: false });
    }

    return res.status(200).json({
      success: true,
      message: 'Activity tracked',
      processedCount: validEvents.length
    });

  } catch (error) {
    console.error("Activity tracking error:", error);
    res.status(500).json({ success: false, message: 'Failed to track activity' });
  }
};
