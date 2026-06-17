# Testing Strategy

Our strategy employs **Jest** as the runner, **Supertest** for HTTP assertions, and **MongoDB Memory Server** to ensure total isolation. This eliminates dependencies on a live database and parallelizes test state.

1. **Isolation:** The database is destroyed and recreated in RAM. Collections are cleared entirely between each suite/test via Mongoose hooks.
2. **Environment Simulation:** Using `cross-env`, we inject all necessary JWT and Node environment variables natively into the test run, avoiding caching issues with Node ESM.
3. **Helper Utilities:** We abstracted user creation and token generation into `testHelpers.js` to keep test files declarative and focused solely on business logic and routing assertions.

# Files Created
- `backend/jest.config.js`
- `backend/tests/setup.js`
- `backend/tests/utils/testHelpers.js`
- `backend/tests/integration/auth.test.js`
- `backend/tests/integration/rbac.test.js`
- `backend/tests/integration/moderation.test.js`
- `backend/tests/integration/admin.test.js`
- `backend/tests/integration/security.test.js`

# Files Modified
- `backend/package.json` (Injected testing and coverage scripts)

# Test Categories
1. **Authentication Tests:** Register, login, token refresh, multi-device logout, and session lifecycle.
2. **RBAC Tests:** Assertions verifying route barriers for `USER`, `MODERATOR`, `ADMIN`, and `SUPER_ADMIN`.
3. **Moderation Tests:** Reporting mechanisms, target validation, duplicate report blocking, and report resolution loops.
4. **Admin Tests:** User directory paginated fetch, account status toggles (Suspend/Ban), automated session revocation, and analytics fetching.
5. **Security Tests:** Rate limiter (429) verifications, token cryptographic boundary tests (Access vs. Refresh), and role-based lockouts.

# Coverage Configuration
Configured inside `jest.config.js`. We explicitly target standard source files and ignore configs or tests themselves:
```javascript
collectCoverageFrom: [
  'src/controllers/**/*.js',
  'src/middleware/**/*.js',
  'src/routes/**/*.js',
  'src/utils/**/*.js'
]
```

# Commands To Run
- Run Integration Tests: `npm run test`
- Run Tests + Coverage Report: `npm run test:coverage`

# Verification Checklist
- [x] Test framework successfully boots MongoDB Memory Server.
- [x] Environment variables correctly injected preventing ESM caching errors.
- [x] 429 Rate Limits validated on `/refresh`.
- [x] Roles validated enforcing `403 Forbidden` across boundaries.
- [x] Session revocation hooks tested explicitly on Password Change and Bans.

# Current Coverage %
- **Targeted Modules:** High (e.g., `adminController` at ~90%, `authMiddleware` at ~89%, `moderationController` at ~80%).
- **Overall System:** ~34% (This is expected as we only generated tests for Auth, RBAC, Admin, and Moderation logic, leaving the core Feed, Comments, and Course features for future testing phases).

# Remaining Testing Gaps
1. **Core Domain Logic:** The `completedCourseController` and `commentController` require comprehensive testing for their internal logic, aggregations, and edge cases.
2. **Real-time Engine:** `Socket.IO` pathways and notification emissions remain untested and require a specialized mock setup for web sockets.
3. **External Services:** `Cloudinary` image uploads and metadata fetching require mocked interceptors to verify resilience.
