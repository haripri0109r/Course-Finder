import AsyncStorage from '@react-native-async-storage/async-storage';

const key = (postId) => `@cf_local_comments_${postId}`;

export async function getLocalComments(postId) {
  try {
    const raw = await AsyncStorage.getItem(key(postId));
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export async function appendLocalComment(postId, { text, userName, userId }) {
  const list = await getLocalComments(postId);
  const item = {
    _id: `local_${Date.now()}`,
    text,
    createdAt: new Date().toISOString(),
    userId: { name: userName, _id: userId },
    isLocal: true,
  };
  list.unshift(item);
  await AsyncStorage.setItem(key(postId), JSON.stringify(list.slice(0, 200)));
  return item;
}

export async function clearLocalComments(postId) {
  await AsyncStorage.removeItem(key(postId));
}
