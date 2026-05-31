# Security Verification Checklist - Sprint 2

## 1. Authentication & Environment
- [ ] **Startup Validation**: Verify server crashes if `JWT_ACCESS_SECRET` or `JWT_REFRESH_SECRET` is missing.
- [ ] **Secret Isolation**: Verify that an Access Token cannot be used on the `/refresh` endpoint.
- [ ] **Legacy Variable Removal**: Verify no references to `JWT_SECRET` or `JWT_EXPIRES_IN` exist in the code.

## 2. Session Revocation
- [ ] **Password Change**: Verify that changing a password revokes ALL active sessions in the database for that user.
- [ ] **Password Reset**: Verify that a successful password reset revokes ALL active sessions in the database for that user.
- [ ] **Logout**: Verify that `/logout` revokes only the specific session provided.
- [ ] **Logout All**: Verify that `/logout-all` revokes all user sessions.

## 3. Secure Logging
- [ ] **No Token Exposure**: Verify that `forgot-password` logs do not contain the reset token or URL.
- [ ] **No Secret Logging**: Verify that JWT secrets or passwords never appear in `console.log` or error logs.

## 4. Rate Limiting
- [ ] **Refresh Limiting**: Verify that `/refresh` is capped at 10 requests per 15 minutes.
- [ ] **Password Reset Limiting**: Verify brute-force protection on `/forgot-password` and `/reset-password`.

## 5. Token Rotation
- [ ] **One-time Use**: Verify that a refresh token is revoked immediately after it is used to issue a new pair.
- [ ] **Hashing**: Verify that refresh tokens are stored as SHA-256 hashes in the `Session` collection.

## 6. Socket Authentication
- [ ] **Access Control**: Verify Socket.IO connections are rejected if the access token is missing or invalid.
- [ ] **Secret Check**: Verify Socket.IO auth uses `JWT_ACCESS_SECRET`.
