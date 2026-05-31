# Credential Rotation Plan - Course Finder

## Confirmed Exposure
The following sensitive files/configurations were tracked in the Git repository history:
- `frontend/google-services.json` (Firebase configuration including Client API Key)
- `backend/.env.example` (Contains dummy secrets, but history might contain real ones if accidentally committed)

## Required Actions

### 1. Firebase API Key Rotation
- Go to [Firebase Console](https://console.firebase.google.com/) -> Project Settings -> General.
- In the "Your apps" section, locate the Android app.
- Rotate the API Key (This can be done via the Google Cloud Console for the same project).
- Update the client with the new `google-services.json` (ensure it is NOT tracked this time).

### 2. JWT Secret Rotation
- Generate new high-entropy strings for `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET`.
- Update the production environment variables immediately.
- **Note:** This will invalidate all currently active user sessions, forcing all users to log in again.

### 3. Cloudinary API Secret Rotation
- Log in to the Cloudinary Dashboard.
- Go to Settings -> Security.
- Regenerate the API Secret.
- Update `CLOUDINARY_API_SECRET` in the production environment.

### 4. History Scrubbing (Optional but Recommended)
- Use a tool like `bfg-repo-cleaner` or `git filter-repo` to permanently remove sensitive files from the git history if the repository is public or shared with untrusted parties.

---

# Rollback Plan

## Strategy
In case of a failed deployment or critical bug introduced by these security changes, the following steps should be taken:

## Deployment Rollback
1. Revert the last commit on the `main` branch.
2. Redeploy the previous stable version of the backend.

## Environment Reversion
1. If the split secrets (`JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`) are causing issues, verify that they are correctly set in the environment.
2. Ensure that `JWT_ACCESS_EXPIRES_IN` and `JWT_REFRESH_EXPIRES_IN` are also present.
3. If an emergency rollback to a single secret is absolutely necessary, the codebase would need to be reverted to the state before the secret splitting sprint (not recommended due to security degradation).

## Migration Rollback
No database migrations were required for this sprint. All session management is handled via the existing `Session` model.
