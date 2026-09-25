import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import { useAuthStore } from "@/stores/auth-store";

/**
 * SockJS expects an HTTP(S) origin for the handshake endpoint `/ws`.
 * Accepts VITE_WS_BASE_URL as either origin (`http://localhost:8080`) or
 * full path (`http://localhost:8080/ws` / `ws://…/ws`) without doubling `/ws`.
 */
function sockJsEndpoint(token: string): string {
  const raw =
    import.meta.env.VITE_WS_BASE_URL?.trim() ||
    `${window.location.protocol}//${window.location.host}`;

  let base = raw.replace(/\/$/, "");
  // SockJS needs http(s); map ws(s) → http(s)
  base = base.replace(/^ws:/i, "http:").replace(/^wss:/i, "https:");
  if (base.endsWith("/ws")) {
    base = base.slice(0, -3);
  }
  const url = new URL(`${base}/ws`);
  url.searchParams.set("access_token", token);
  return url.toString();
}

export type RealtimeEvent = {
  type: string;
  occurredAt: string;
  rideId: string | null;
  driverUserId: string | null;
  passengerUserId: string | null;
  payload: Record<string, unknown>;
};

export function connectAdminLive(
  onEvent: (event: RealtimeEvent) => void,
): () => void {
  const token = useAuthStore.getState().accessToken;
  if (!token) {
    return () => undefined;
  }

  const client = new Client({
    webSocketFactory: () => new SockJS(sockJsEndpoint(token)),
    connectHeaders: {
      Authorization: `Bearer ${token}`,
      access_token: token,
    },
    reconnectDelay: 4000,
    onConnect: () => {
      client.subscribe("/topic/admin.live", (message) => {
        try {
          onEvent(JSON.parse(message.body) as RealtimeEvent);
        } catch {
          // ignore malformed frames
        }
      });
    },
  });

  client.activate();
  return () => {
    void client.deactivate();
  };
}
