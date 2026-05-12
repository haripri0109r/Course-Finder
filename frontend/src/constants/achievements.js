/** Achievement definitions — ids stable for persistence */
export const ACHIEVEMENT_DEFS = [
  { id: 'first_course', title: 'First course', description: 'Log your first completion', rule: { type: 'courses', min: 1 } },
  { id: 'five_courses', title: '5 courses', description: 'Five completions logged', rule: { type: 'courses', min: 5 } },
  { id: 'ten_courses', title: '10 courses', description: 'Ten completions logged', rule: { type: 'courses', min: 10 } },
  { id: 'twentyfive_courses', title: '25 courses', description: 'Twenty-five completions', rule: { type: 'courses', min: 25 } },
  { id: 'first_certificate', title: 'Certified', description: 'First certificate uploaded', rule: { type: 'certificates', min: 1 } },
  { id: 'hours_50', title: '50 learning hours', description: 'Estimated from your logs', rule: { type: 'hours', min: 50 } },
  { id: 'hours_100', title: '100 learning hours', description: 'Deep learner', rule: { type: 'hours', min: 100 } },
  { id: 'streak_7', title: '7-day streak', description: 'Active 7 days in a row', rule: { type: 'streak', min: 7 } },
  { id: 'streak_30', title: '30-day streak', description: '30-day consistency', rule: { type: 'streak', min: 30 } },
];

export const ACHIEVEMENTS_STORAGE_KEY = (userId) => `@cf_achievements_unlocked_${userId}`;
export const ACTIVITY_DATES_KEY = (userId) => `@cf_activity_dates_${userId}`;
