import "reflect-metadata";
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
  synchronize: process.env.NODE_ENV === "development" || process.env.TYPEORM_SYNC === "true",
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
  migrations: ["src/migrations/**/*.ts"],
  subscribers: [],
});
