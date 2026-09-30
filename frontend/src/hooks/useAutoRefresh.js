import { useEffect, useRef, useCallback } from "react";
import { io } from "socket.io-client";
import { getSocketOrigin, getSocketAuthToken } from "../utils/socketOrigin";

const POLL_INTERVAL = 15000;

export function useAutoRefresh(onRefresh, enabled = true) {
  const savedCallback = useRef(onRefresh);

  useEffect(() => {
    savedCallback.current = onRefresh;
  }, [onRefresh]);

  const refresh = useCallback(() => {
    savedCallback.current?.();
  }, []);

  useEffect(() => {
    if (!enabled) return undefined;

    const pollInterval = setInterval(refresh, POLL_INTERVAL);

    let socket;
    try {
      socket = io(getSocketOrigin(), {
        auth: { token: getSocketAuthToken() },
        transports: ["websocket", "polling"],
        reconnectionAttempts: 5,
        reconnectionDelay: 3000,
      });

      socket.on("connect", () => {
        socket.emit("join-room");
      });

      socket.on("data-changed", () => {
        refresh();
      });

      socket.on("announcement-posted", () => {
        refresh();
      });

      socket.on("new-notification", () => {
        refresh();
      });
    } catch {
      // Socket connection failed, polling already running
    }

    return () => {
      clearInterval(pollInterval);
      if (socket) socket.disconnect();
    };
  }, [enabled, refresh]);
}
