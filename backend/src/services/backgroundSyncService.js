import mongoose from 'mongoose';
import SyncJob from '../models/SyncJob.js';
import Course from '../models/Course.js';
import CompletedCourse from '../models/CompletedCourse.js';

export const processSyncJobs = async () => {
  const jobs = await SyncJob.find({ status: 'pending' }).limit(50);
  for (const job of jobs) {
    try {
      const course = await Course.findById(job.courseId).lean();
      if (course) {
        await CompletedCourse.updateMany(
          { course: course._id },
          {
            $set: {
              courseTags: course.tags || [],
              coursePlatform: course.platform,
              courseRating: course.averageRating || 0,
              courseCompletions: course.totalCompletions || 0,
              courseTitle: course.title,
              courseImage: course.image
            }
          }
        );
      }
      await SyncJob.deleteOne({ _id: job._id });
    } catch (err) {
      await SyncJob.updateOne({ _id: job._id }, { status: 'failed' });
    }
  }
  return jobs.length;
};

export const flushSyncJobs = async () => {
  let count = 0;
  do {
    count = await processSyncJobs();
  } while (count > 0);
};
