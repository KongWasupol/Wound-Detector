import { io } from "socket.io-client";

// Force localhost:4002 if we are in dev mode or if VITE_API_URL is suspicious
const API_URL = import.meta.env.VITE_API_URL;

// Remove /api suffix if present
const SOCKET_URL = API_URL.replace(/\/api$/, "");

export const socket = io(SOCKET_URL, {
    path: "/wound-socket",
    autoConnect: false,
    withCredentials: true,
});

