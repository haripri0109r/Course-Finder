import axios from 'axios';

const API_BASE = 'http://localhost:5000/api/v1';

const testRoute = async (name, method, url, data = null, headers = {}) => {
  try {
    const res = await axios({ method, url: `${API_BASE}${url}`, data, headers });
    console.log(`[PASS] ${name} - ${res.status}`);
    return res.data;
  } catch (err) {
    console.log(`[FAIL] ${name} - ${err.response?.status || 'Network Error'}`);
    console.log(`Reason:`, JSON.stringify(err.response?.data || err.message));
    return null;
  }
};

const runTests = async () => {
  console.log('--- STARTING B5 EXECUTION VALIDATION ---');

  // 1. Auth Setup
  const user = { email: `b5_test_${Date.now()}@test.com`, password: 'Password123!', name: 'B5 Tester' };
  const reg = await testRoute('Auth: Register', 'POST', '/auth/register', user);
  if (!reg?.data?.token) return;
  const token = reg.data.token;
  const auth = { Authorization: `Bearer ${token}` };

  // 2. Compound Cursor Search Validation
  console.log('Testing Compound Cursor Search...');
  const search1 = await testRoute('Search: Page 1', 'GET', '/courses/search?q=java&limit=1');
  if (search1?.nextCursor) {
      console.log('  ✅ Page 1 nextCursor present.');
      const search2 = await testRoute('Search: Page 2 (via cursor)', 'GET', `/courses/search?q=java&limit=1&cursor=${search1.nextCursor}`);
      if (search2?.courses?.length > 0) {
          if (search1.courses[0]._id !== search2.courses[0]._id) {
              console.log('  ✅ Cursor pagination returned distinct record.');
          } else {
              console.log('  ❌ Cursor pagination returned duplicate record.');
          }
      }
  } else {
      console.log('  ⚠️ Search results too small for cursor test.');
  }

  // 3. Threaded Comment (Aggregated Replies) Validation
  console.log('Testing Threaded Comments (Optimized Aggregation)...');
  // Need a postId. Use one from a global feed search.
  const feed = await testRoute('Feed: Get', 'GET', '/posts/feed?limit=5', null, auth);
  const postId = feed?.posts?.[0]?._id;

  if (postId) {
      const rootRes = await testRoute('Social: Add Comment', 'POST', '/comments', { postId, text: 'Root B5' }, auth);
      if (rootRes?._id) {
          // Add 6 replies to trigger 'hasMoreReplies'
          console.log('  Adding 6 replies...');
          for (let i = 1; i <= 6; i++) {
              await axios.post(`${API_BASE}/comments`, { postId, text: `Reply ${i}`, parentId: rootRes._id }, { headers: auth });
          }
          
          const getRes = await testRoute('Social: Get Comments (Check Threading)', 'GET', `/comments/${postId}`, null, auth);
          const rootComment = getRes?.comments?.find(c => c._id === rootRes._id);
          if (rootComment) {
              console.log(`  ✅ Root comment found. Replies fetched: ${rootComment.replies.length}`);
              console.log(`  ✅ hasMoreReplies: ${rootComment.hasMoreReplies}`);
              console.log(`  ✅ replyCount: ${rootComment.replyCount}`);
              if (rootComment.replies.length === 5 && rootComment.hasMoreReplies === true) {
                  console.log('  ✅ Optimized replies aggregation verified (capped at 5).');
              } else {
                  console.log('  ❌ Optimized replies aggregation logic failed.');
              }
          }
      }
  }

  // 4. Feed Aggregation Efficiency (courseDetails mapping)
  console.log('Testing Feed Aggregation Resiliency...');
  const smartFeed = await testRoute('Feed: Get Smart Feed', 'GET', '/posts/feed?limit=5', null, auth);
  if (smartFeed?.posts?.length > 0) {
      const p = smartFeed.posts[0];
      if (p.title && p.platform && p.image) {
          console.log('  ✅ Feed post has required course fields (title, platform, image).');
      } else {
          console.log('  ❌ Feed post missing required fields from courseDetails.');
          console.log('  Debug first post:', JSON.stringify(p).substring(0, 200));
      }
  }

  console.log('--- B5 EXECUTION VALIDATION COMPLETE ---');
};

runTests();
