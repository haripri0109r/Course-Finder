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
  console.log('--- STARTING B4 EXECUTION VALIDATION ---');

  // 1. Auth Setup (Two users)
  const userA = { email: `userA_${Date.now()}@test.com`, password: 'Password123!', name: 'User A' };
  const userB = { email: `userB_${Date.now()}@test.com`, password: 'Password123!', name: 'User B' };

  console.log('Setting up Test Users...');
  const regA = await testRoute('Auth: Register A', 'POST', '/auth/register', userA);
  const regB = await testRoute('Auth: Register B', 'POST', '/auth/register', userB);

  if (!regA?.data?.token || !regB?.data?.token) {
    console.log('User setup failed, aborting.');
    return;
  }

  const tokenA = regA.data.token;
  const idA = regA.data.user._id;
  const tokenB = regB.data.token;
  const idB = regB.data.user._id;

  const authA = { Authorization: `Bearer ${tokenA}` };
  const authB = { Authorization: `Bearer ${tokenB}` };

  // 2. Follow User B from User A
  console.log('Testing Follow Flow...');
  await testRoute('Follow: A -> B', 'POST', `/auth/follow/${idB}`, null, authA);

  // 3. Add Course Completion (User B)
  console.log('Testing Course Completion + Notification...');
  const completionRes = await testRoute('Completed: Add (User B)', 'POST', '/completed', {
    title: 'B4 Test Course',
    platform: 'YouTube',
    url: `https://www.youtube.com/watch?v=test_${Date.now()}`,
    progress: 100
  }, authB);

  const postId = completionRes?.data?._id;

  if (postId) {
    // 4. Like Post (User A)
    await testRoute('Social: Like Post (A on B)', 'POST', `/completed/${postId}/like`, null, authA);

    // 5. Comment (User A)
    const commentRes = await testRoute('Social: Comment (A on B)', 'POST', '/comments', {
        postId,
        text: 'Great job!'
    }, authA);

    const commentId = commentRes?._id;

    if (commentId) {
        // 6. Reply (User B on A)
        await testRoute('Social: Reply (B on A)', 'POST', '/comments', {
            postId,
            text: 'Thanks!',
            parentId: commentId
        }, authB);
        
        // 7. Get Replies
        await testRoute('Social: Get Replies', 'GET', `/comments/${commentId}/replies`, null, authB);
    }

    // 8. Share Post
    await testRoute('Social: Share Post', 'POST', `/completed/${postId}/share`, null, authA);
  }

  // 9. Bookmark (User A)
  console.log('Testing Bookmark...');
  await testRoute('Bookmark: Add', 'POST', `/bookmarks/${postId}`, null, authA);

  // 10. Check Notifications (User B)
  console.log('Verifying Notifications for User B...');
  const notifRes = await testRoute('Notifications: Get (B)', 'GET', '/notifications', null, authB);
  if (notifRes?.data?.length > 0) {
      console.log(`  ✅ User B has ${notifRes.data.length} notifications.`);
  } else {
      console.log('  ❌ User B has NO notifications.');
  }

  // 11. Feed Pagination
  console.log('Testing Feed Pagination...');
  await testRoute('Feed: Get Smart Feed', 'GET', '/posts/feed?limit=1', null, authA);

  console.log('--- B4 EXECUTION VALIDATION COMPLETE ---');
};

runTests();
