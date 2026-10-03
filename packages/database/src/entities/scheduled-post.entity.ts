import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from "typeorm";
import {
  ChannelType,
  ScheduleMode,
  ScheduledPostStatus,
} from "../enums";
import { Tenant } from "./tenant.entity";
import { ConnectedAccount } from "./connected-account.entity";

@Entity("scheduled_posts")
@Index(["status", "scheduledFor"])
@Index(["tenantId", "status"])
@Index(["accountId"])
export class ScheduledPost {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid" })
  tenantId!: string;

  @Column({ type: "uuid", nullable: true })
  accountId?: string | null;

  @Column({
    type: "enum",
    enum: ChannelType,
  })
  channel!: ChannelType;

  @Column({ type: "varchar", default: "TEXT" })
  kind!: string;

  @Column({ type: "text", nullable: true })
  caption?: string | null;

  @Column("text", { array: true, default: "{}" })
  mediaUrls!: string[];

  @Column({ type: "timestamp with time zone" })
  scheduledFor!: Date;

  @Column({
    type: "enum",
    enum: ScheduledPostStatus,
    default: ScheduledPostStatus.PENDING,
  })
  status!: ScheduledPostStatus;

  @Column({
    type: "enum",
    enum: ScheduleMode,
    default: ScheduleMode.LOCAL,
  })
  mode!: ScheduleMode;

  @Column({ type: "varchar", nullable: true })
  platformContainerId?: string | null;

  @Column({ type: "varchar", nullable: true })
  platformPostId?: string | null;

  @Column({ type: "varchar", nullable: true })
  externalUrl?: string | null;

  @Column({ type: "int", default: 0 })
  attempts!: number;

  @Column({ type: "text", nullable: true })
  lastError?: string | null;

  @Column({ type: "varchar", nullable: true })
  createdBy?: string | null;

  @CreateDateColumn({ type: "timestamp with time zone" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "timestamp with time zone" })
  updatedAt!: Date;

  @ManyToOne(() => Tenant, { onDelete: "CASCADE" })
  @JoinColumn({ name: "tenantId" })
  tenant!: Tenant;

  @ManyToOne(() => ConnectedAccount, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "accountId" })
  account?: ConnectedAccount | null;
}
