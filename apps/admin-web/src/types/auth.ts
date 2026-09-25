export type RoleCode =
  | "PASSENGER"
  | "DRIVER"
  | "ADMIN"
  | "SUPPORT"
  | "SUPER_ADMIN";

export type AuthUser = {
  id: string;
  phoneE164: string | null;
  email: string | null;
  displayName: string | null;
  status: string;
  locale: string | null;
  roles: RoleCode[];
  createdAt: string;
};

export type TokenPairResponse = {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresInSeconds: number;
  user: AuthUser;
};
