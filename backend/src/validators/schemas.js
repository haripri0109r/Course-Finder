import { z } from 'zod/v4';

/**
 * CENTRALIZED VALIDATION SCHEMAS
 * Zod v4 schemas for all API inputs. Used by controllers to validate req.body.
 */

// ─── Auth Schemas ────────────────────────────────────────────────────────────

export const registerSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(60, 'Name cannot exceed 60 characters'),
  email: z.string().trim().email('Please provide a valid email').max(200),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password cannot exceed 128 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
});

export const loginSchema = z.object({
  email: z.string().trim().email('Please provide a valid email'),
  password: z.string().min(1, 'Password is required'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email('Please provide a valid email address'),
});

export const updateProfileSchema = z.object({
  name: z.string().trim().min(1).max(60).optional(),
  bio: z.string().trim().max(300).optional(),
  skills: z.union([
    z.array(z.string().max(50)).max(30),
    z.string().max(1000),
  ]).optional(),
  profilePicture: z.string().trim().url().max(500).optional().or(z.literal('')),
  headline: z.string().trim().max(120).optional(),
  location: z.string().trim().max(80).optional(),
  website: z.string().trim().max(200).optional().or(z.literal('')),
  linkedinUrl: z.string().trim().max(200).optional().or(z.literal('')),
  githubUrl: z.string().trim().max(200).optional().or(z.literal('')),
});

export const pushTokenSchema = z.object({
  pushToken: z.string().min(1, 'Push token is required').max(200),
});

// ─── Course Schemas ──────────────────────────────────────────────────────────

export const fetchMetadataSchema = z.object({
  url: z.string().trim().url('Invalid URL format').max(2000),
});

export const addCompletedCourseSchema = z.object({
  title: z.string().trim().max(200).optional(),
  platform: z.enum(['Udemy', 'Coursera', 'YouTube', 'Skillshare', 'Other']).optional(),
  url: z.string().trim().url('Valid URL is required').max(2000),
  level: z.enum(['beginner', 'intermediate', 'advanced']).optional().default('beginner'),
  rating: z.coerce.number().min(1).max(5).optional(),
  review: z.string().trim().max(1000).optional(),
  image: z.string().trim().max(500).optional(),
  duration: z.string().max(50).optional(),
  certificateUrl: z.string().trim().max(500).optional(),
  certificatePublicId: z.string().trim().max(200).optional(),
  description: z.string().trim().max(300).optional(),
  learnings: z.array(z.string().max(200)).max(5).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  progress: z.coerce.number().min(0).max(100).optional(),
});

// ─── Comment Schema ──────────────────────────────────────────────────────────

export const addCommentSchema = z.object({
  text: z.string().trim().min(1, 'Comment cannot be empty').max(500),
  postId: z.string().min(1, 'Post ID is required'),
  parentId: z.string().optional().nullable(),
});

// ─── Utility: validate and throw standardized error ──────────────────────────

/**
 * Validates request body against a Zod schema.
 * Returns { success: true, data } or { success: false, errors }.
 */
export const validateBody = (schema, body) => {
  const result = schema.safeParse(body);
  if (result.success) {
    return { success: true, data: result.data };
  }
  const errors = result.error.issues.map(issue => ({
    field: issue.path.join('.'),
    message: issue.message,
  }));
  return { success: false, errors };
};

/**
 * Express middleware factory: validates req.body against a schema.
 * Replaces req.body with the parsed (cleaned) data on success.
 */
export const validate = (schema) => (req, res, next) => {
  const result = validateBody(schema, req.body);
  if (!result.success) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: result.errors,
    });
  }
  req.body = result.data;
  next();
};
