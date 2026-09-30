import {apiRequest} from './api-client';

export async function registerDevice(
  accessToken: string,
  platform: string,
  token: string,
): Promise<void> {
  await apiRequest('/notifications/me/devices', {
    method: 'POST',
    token: accessToken,
    body: {platform, token},
  });
}
