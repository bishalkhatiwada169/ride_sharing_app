import { Env } from "../config/env";

export type TokenPair = {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresInSeconds: number;
  user: {
    id: string;
    phoneE164: string | null;
    displayName: string | null;
    roles: string[];
  };
};

export async function requestOtp(phoneE164: string): Promise<void> {
  const res = await fetch(`${Env.apiBaseUrl}/auth/otp/request`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phoneE164 }),
  });
  if (!res.ok) throw new Error(`OTP request failed (${res.status})`);
}

export async function verifyOtp(phoneE164: string, code: string): Promise<TokenPair> {
  const res = await fetch(`${Env.apiBaseUrl}/auth/otp/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phoneE164, code }),
  });
  if (!res.ok) throw new Error(`OTP verify failed (${res.status})`);
  return (await res.json()) as TokenPair;
}
