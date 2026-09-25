import { Env } from "../config/env";

export async function registerDevice(
  accessToken: string,
  platform: string,
  token: string
): Promise<void> {
  const res = await fetch(`${Env.apiBaseUrl}/notifications/me/devices`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ platform, token }),
  });
  if (!res.ok) throw new Error(`Device register failed (${res.status})`);
}
