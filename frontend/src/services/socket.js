import { io } from "socket.io-client";

const socket = io("https://course-finder-fnxs.onrender.com", {
  transports: ["polling", "websocket"],
  autoConnect: true,
});

export default socket;
