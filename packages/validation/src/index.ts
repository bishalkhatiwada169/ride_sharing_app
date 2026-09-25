import { z } from "zod";

export const phoneE164Schema = z
  .string()
  .regex(/^\+[1-9]\d{7,14}$/, "phone must be E.164");

export const adminLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

export const otpRequestSchema = z.object({
  phoneE164: phoneE164Schema,
});

export const otpVerifySchema = z.object({
  phoneE164: phoneE164Schema,
  code: z.string().min(4).max(8),
});
