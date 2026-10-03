import "reflect-metadata";
import { join } from "node:path";
import { DataSource } from "typeorm";
import {
  Tenant,
  User,
  TenantCredential,
  ConnectedAccount,
  Contact,
  Conversation,
  Message,
  ScheduledPost,
  ScheduledMessage,
} from "./entities";

export const AppDataSource = new DataSource({
  type: "postgres",
  url: process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/connectme",
  synchronize: String(process.env.DB_SYNCHRONIZE ?? "false") === "true",
  logging: process.env.NODE_ENV === "development",
  entities: [
    Tenant,
    User,
    TenantCredential,
    ConnectedAccount,
    Contact,
    Conversation,
    Message,
    ScheduledPost,
    ScheduledMessage,
  ],
  migrations: [join(__dirname, "migrations", "*{.ts,.js}")],
  subscribers: [],
});
