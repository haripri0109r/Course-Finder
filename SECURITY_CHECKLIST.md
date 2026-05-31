# Security Verification & Testing Checklist

## 1. Authentication & Session Management
- [ ] **Access Token Expiry:** Verify that the access token expires in 15 minutes and correctly returns a 401 status.
- [ ] **Refresh Token Rotation:** Verify that refreshing a token revokes the old session and issues a new pair.
- [ ] **Secret Splitting:** Verify that an access token signed with `JWT_REFRESH_SECRET` is rejected by the `authenticate` middleware.
- [ ] **Global Logout:** Verify that `/logout-all` invalidates ALL sessions for the user in the database.
- [ ] **Socket.IO Auth:** Verify that real-time connections are rejected if the access token is invalid or expired.

## 2. Rate Limiting
- [ ] **Login Limiter:** Attempt 6 failed logins from the same IP; verify 429 response.
- [ ] **Refresh Limiter:** Attempt 11 refresh requests within 15 minutes; verify 429 response.
- [ ] **General Limiter:** Verify that general API requests are capped at 200 per 15 minutes.

## 3. Input Sanitization (XSS & NoSQLi)
- [ ] **NoSQL Injection:** Attempt a login with `{"email": {"$gt": ""}}`; verify sanitization/rejection.
- [ ] **XSS Sanitization:** Submit a profile update with `<script>alert(1)</script>` in the bio; verify that the script tag is sanitized or neutralized.
- [ ] **Zod Validation:** Verify that invalid data types in request bodies are caught before reaching controllers.

## 4. Environment Security
- [ ] **Startup Validation:** Ensure the server fails to start if `JWT_ACCESS_SECRET` or `JWT_REFRESH_SECRET` is missing.
- [ ] **No Hardcoded Secrets:** Verify that no real secrets are present in any `.js` file or tracked configuration.

## 5. Penetration-Test Checklist
- [ ] **Session Fixation:** Verify that a new session ID is generated upon login.
- [ ] **Broken Access Control:** Attempt to delete another user's account using their ID; verify rejection.
- [ ] **Insecure Direct Object References (IDOR):** Check if profile updates or resource fetches respect the `req.user._id` context.
- [ ] **Sensitive Data Exposure:** Ensure `password` and `__v` are never returned in JSON responses (User model check).
