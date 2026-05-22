import axios from 'axios';

const API_BASE = 'http://localhost:5000/api/v1';
let token = '';
let userId = '';
let postId = '';

const testRoute = async (name, method, url, data = null, headers = {}) => {
  try {
    const res = await axios({ method, url: `${API_BASE}${url}`, data, headers });
    console.log(`[PASS] ${name} - ${res.status}`);
    console.log(`Response:`, JSON.stringify(res.data).substring(0, 150) + '...');
    return res.data;
  } catch (err) {
    console.log(`[FAIL] ${name} - ${err.response?.status || 'Network Error'}`);
    console.log(`Reason:`, err.response?.data || err.message);
    return null;
  }
};

const runTests = async () => {
  console.log('--- STARTING API TESTS ---');

  // 1. Auth - Register (or Login if already exists)
  const email = `testuser_${Date.now()}@example.com`;
  const authRes = await testRoute('Auth: Register', 'POST', '/auth/register', {
    name: 'Test User',
    email,
    password: 'Password123!'
  });
  
  if (authRes?.data?.token) {
    token = authRes.data.token;
    userId = authRes.data.user._id;
  } else {
    console.log('Auth failed, aborting further auth-dependent tests.');
    return;
  }

  const authHeaders = { Authorization: `Bearer ${token}` };

  // 2. Courses (Public)
  await testRoute('Courses: Search', 'GET', '/courses/search?query=react');
  await testRoute('Courses: Trending', 'GET', '/courses/trending');

  // 3. Metadata (Authenticated)
  await testRoute('Metadata: Fetch YouTube', 'POST', '/courses/fetch-metadata', { url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' }, authHeaders);
  await testRoute('Metadata: Fetch Udemy Fallback', 'POST', '/courses/fetch-metadata', { url: 'https://www.udemy.com/course/learn-react/' }, authHeaders);

  // 4. Completed Courses (Authenticated)
  // Mock adding a completed course. Note: the actual endpoint uses multipart/form-data, so we might get a validation error if we send JSON, but let's test it anyway to see the response.
  // Actually, wait, the `addCompletedCourse` uses `upload.fields`. It might fail if we just send JSON. Let's skip creating one and just check the feed.
  
  // 5. Feed
  await testRoute('Feed: Get Recent', 'GET', '/posts/feed', null, authHeaders);

  // 6. Notifications
  await testRoute('Notifications: Get Unread', 'GET', '/notifications', null, authHeaders);
  
  // 7. Push Token
  await testRoute('Auth: Save Push Token', 'PUT', '/auth/push-token', { pushToken: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]' }, authHeaders);

  console.log('--- API TESTS COMPLETE ---');
};

runTests();
