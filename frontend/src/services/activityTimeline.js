import { getAchievementMeta } from './achievements';

/**
 * Build chronological timeline from completions + achievement unlocks.
 * @param {Array} completions — from API (may include createdAt, title, platform, id)
 * @param {Array<string>} achievementIds — unlocked achievement ids
 * @param {object} user — optional { name, updatedAt } for profile events
 */
export function buildActivityTimeline(completions = [], achievementIds = [], user = null) {
  const events = [];

  for (const c of completions) {
    const ts = c.createdAt || c.completedAt || c.updatedAt;
    if (!ts) continue;
    events.push({
      id: `course-${c.id || c._id}`,
      type: 'course_added',
      title: c.title || 'Course completion',
      subtitle: c.platform ? `${c.platform}` : 'Learning log',
      at: new Date(ts).getTime(),
      meta: c,
    });
    if (c.certificateUrl || (typeof c.certificate === 'string' && c.certificate)) {
      events.push({
        id: `cert-${c.id || c._id}`,
        type: 'certificate',
        title: 'Certificate uploaded',
        subtitle: c.title || '',
        at: new Date(ts).getTime() + 1,
        meta: c,
      });
    }
  }

  for (const aid of achievementIds || []) {
    const meta = getAchievementMeta(aid);
    events.push({
      id: `badge-${aid}`,
      type: 'achievement',
      title: meta?.title || 'Achievement',
      subtitle: meta?.description || '',
      at: Date.now() - Math.random() * 1000,
      meta: { id: aid },
    });
  }

  if (user?.updatedAt && user?.name) {
    events.push({
      id: 'profile-update',
      type: 'profile',
      title: 'Profile updated',
      subtitle: user.name,
      at: new Date(user.updatedAt).getTime(),
      meta: {},
    });
  }

  events.sort((a, b) => b.at - a.at);
  return events;
}
