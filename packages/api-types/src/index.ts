export type RoleCode =
  | "PASSENGER"
  | "DRIVER"
  | "ADMIN"
  | "SUPPORT"
  | "SUPER_ADMIN";

export type UserStatus = "ACTIVE" | "SUSPENDED" | "DELETED";

export interface UserDto {
  id: string;
  phoneE164: string | null;
  email: string | null;
  displayName: string | null;
  status: UserStatus;
  locale: string | null;
  roles: RoleCode[];
  createdAt: string;
}

export interface TokenPairDto {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresInSeconds: number;
  user: UserDto;
}

/** Shared API path constants — keep in sync with backend controllers. */
export const ApiPaths = {
  otpRequest: "/auth/otp/request",
  otpVerify: "/auth/otp/verify",
  adminLogin: "/auth/admin/login",
  refresh: "/auth/token/refresh",
  logout: "/auth/logout",
  me: "/auth/me",
  registerDevice: "/notifications/me/devices",
  testPush: "/notifications/me/test-push",
  adminDashboard: "/admin/dashboard",
  adminAuditLogs: "/admin/audit-logs",
  fareRulesAdmin: "/pricing/admin/rules",
} as const;
