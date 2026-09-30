import {apiRequest} from './api-client';
import type {AuthUser, TokenPair} from '../types/ride';

export async function requestOtp(phoneE164: string): Promise<void> {
  await apiRequest('/auth/otp/request', {
    method: 'POST',
    body: {phoneE164},
  });
}

export async function verifyOtp(
  phoneE164: string,
  code: string,
): Promise<TokenPair> {
  return apiRequest<TokenPair>('/auth/otp/verify', {
    method: 'POST',
    body: {phoneE164, code},
  });
}

export async function refreshSession(refreshTokenValue: string): Promise<TokenPair> {
  return apiRequest<TokenPair>('/auth/token/refresh', {
    method: 'POST',
    body: {refreshToken: refreshTokenValue},
  });
}

export async function logout(
  accessToken: string,
  refreshTokenValue: string,
): Promise<void> {
  await apiRequest('/auth/logout', {
    method: 'POST',
    token: accessToken,
    body: {refreshToken: refreshTokenValue},
  });
}

export async function fetchMe(accessToken: string): Promise<AuthUser> {
  return apiRequest<AuthUser>('/auth/me', {token: accessToken});
}
