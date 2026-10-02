import { z } from "zod";

export interface TenantDto {
  id: string;
  slug: string;
  name: string;
  createdAt: string;
}

export const TenantDtoSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  createdAt: z.string(),
});

export interface UserDto {
  id: string;
  tenantId: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  avatarUrl?: string | null;
  role: "admin" | "agent" | "viewer";
  createdAt: string;
}

export const UserDtoSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  email: z.string().email(),
  firstName: z.string().nullable().optional(),
  lastName: z.string().nullable().optional(),
  avatarUrl: z.string().nullable().optional(),
  role: z.enum(["admin", "agent", "viewer"]),
  createdAt: z.string(),
});
