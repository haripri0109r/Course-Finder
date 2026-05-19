import { io } from "socket.io-client";
import AsyncStorage from "@react-native-async-storage/async-storage";

const SOCKET_URL = "https://course-finder-fnxs.onrender.com";

/**
 * Creates a socket connection with JWT authentication.
 * Token is sent via handshake.auth for server-side verification.
 */
const createSocket = () => {
  const socket = io(SOCKET_URL, {
    transports: ["polling", "websocket"],
    autoConnect: false, // Don't auto-connect — wait for auth token
    reconnectionAttempts: 10,
    reconnectionDelay: 2000,
    timeout: 20000,
  });

  return socket;
};

const socket = createSocket();

/**
 * Connect with authentication token.
 * Call this after user login / when token is available.
 */
export const connectWithAuth = async () => {
  try {
    const token = await AsyncStorage.getItem('userToken');
    if (token) {
      socket.auth = { token };
    }
    if (!socket.connected) {
      socket.connect();
    }
  } catch (e) {
    console.log("Socket auth connect error:", e.message);
    // Connect without auth as fallback
    if (!socket.connected) {
      socket.connect();
    }
  }
};

/**
 * Disconnect socket cleanly (e.g., on logout).
 */
export const disconnectSocket = () => {
  if (socket.connected) {
    socket.disconnect();
  }
};

export default socket;
