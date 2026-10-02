import { z } from "zod";
import { Channel, ChannelSchema } from "./channels";

export interface ContactDto {
  id: string;
  tenantId: string;
  channel: Channel;
  externalId: string;
  name: string | null;
  avatarUrl?: string | null;
  email?: string | null;
  phoneNumber?: string | null;
  createdAt: string;
}

export const ContactDtoSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  channel: ChannelSchema,
  externalId: z.string(),
  name: z.string().nullable(),
  avatarUrl: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  phoneNumber: z.string().nullable().optional(),
  createdAt: z.string(),
});
