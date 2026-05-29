import mongoose from 'mongoose';
import { ActivityEvent } from '../models/index.js';
import { recordInterestEvent } from './interestProfilingService.js';

/**
 * LIGHTWEIGHT DURABLE QUEUE ABSTRACTION
 * Decouples request flow from heavy profiling work.
 */
class TaskQueue {
  constructor() {
    this.queue = [];
    this.processing = false;
    this.drainResolvers = [];
  }

  async add(task) {
    this.queue.push(task);
    // Use setImmediate to defer execution to next tick, keeping current request fast
    setImmediate(() => this.process());
  }

  async process() {
    if (this.processing || this.queue.length === 0) {
      if (this.queue.length === 0) {
        this._checkDrain();
      }
      return;
    }
    this.processing = true;

    while (this.queue.length > 0) {
      const task = this.queue.shift();
      try {
        await task();
      } catch (err) {
        console.error('[TaskQueue] Task execution failed:', err.message);
      }
    }

    this.processing = false;
    this._checkDrain();
  }

  _checkDrain() {
    if (this.queue.length === 0 && !this.processing) {
      const resolvers = this.drainResolvers;
      this.drainResolvers = [];
      resolvers.forEach(resolve => resolve());
    }
  }

  /**
   * Returns a promise that resolves when the queue is completely empty and idle.
   */
  async flush() {
    if (this.queue.length === 0 && !this.processing) return;
    return new Promise(resolve => this.drainResolvers.push(resolve));
  }
}

const eventQueue = new TaskQueue();

/**
 * Lightweight Activity Event Instrumentation Service
 */
export const trackEvent = async ({ userId, eventType, targetId, targetType, metadata = {} }) => {
  try {
    if (!userId || !eventType) return;

    // Use Queue for durable processing
    eventQueue.add(async () => {
      try {
        const event = await ActivityEvent.create({
          userId: new mongoose.Types.ObjectId(userId),
          eventType,
          targetId: targetId ? targetId.toString() : null,
          targetType: targetType || 'unknown',
          metadata
        });

        // 🚀 Incremental Profile Update (Truly Atomic now)
        await recordInterestEvent(userId, event);
      } catch (err) {
        console.error(`[ActivityService] Failed to track event ${eventType}:`, err.message);
      }
    });
  } catch (err) {
    console.error(`[ActivityService] Error in trackEvent helper:`, err.message);
  }
};

/**
 * Exported flush helper for testing
 */
export const flushEventQueue = async () => {
  return await eventQueue.flush();
};

/**
 * Batch Event Tracking
 */
export const trackBatchEvents = async (events) => {
  try {
    if (!Array.isArray(events) || events.length === 0) return;
    await ActivityEvent.insertMany(events, { ordered: false });
  } catch (err) {
    console.error(`[ActivityService] Batch track failed:`, err.message);
  }
};
