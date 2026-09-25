import { apiRequest } from "@/services/api-client";
import type { TokenPairResponse } from "@/types/auth";

export function adminLogin(input: { email: string; password: string }) {
  return apiRequest<TokenPairResponse>("/auth/admin/login", {
    method: "POST",
    body: JSON.stringify(input),
    auth: false,
  });
}
