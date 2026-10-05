import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from "typeorm";
import { Tenant } from "./tenant.entity";

@Entity("tenant_credentials")
export class TenantCredential {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid", unique: true })
  tenantId!: string;

  @Column({ type: "varchar", nullable: true })
  waPhoneNumberId?: string | null;

  @Column({ type: "text", nullable: true })
  waAccessTokenEnc?: string | null;

  @Column({ type: "varchar", nullable: true })
  waAppId?: string | null;

  @Column({ type: "text", nullable: true })
  metaAppSecretEnc?: string | null;

  @Column({ type: "text", nullable: true })
  instagramAppSecretEnc?: string | null;

  @Column({ type: "varchar", nullable: true })
  webhookVerifyToken?: string | null;

  @Column({ type: "text", nullable: true })
  pageAccessTokenEnc?: string | null;

  @Column({ type: "text", nullable: true })
  telegramTokenEnc?: string | null;

  @Column({ type: "text", nullable: true })
  discordBotTokenEnc?: string | null;

  @Column({ type: "varchar", nullable: true })
  discordPublicKey?: string | null;

  @Column({ type: "text", nullable: true })
  slackBotTokenEnc?: string | null;

  @Column({ type: "text", nullable: true })
  slackSigningSecretEnc?: string | null;

  @UpdateDateColumn({ type: "timestamp with time zone" })
  updatedAt!: Date;

  @OneToOne(() => Tenant, (tenant) => tenant.credentials, { onDelete: "CASCADE" })
  @JoinColumn({ name: "tenantId" })
  tenant!: Tenant;
}
