import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";
import { ChannelType, ScheduledMessageStatus } from "../enums";

@Entity("scheduled_messages")
@Index(["status", "scheduledFor"])
@Index(["tenantId", "status"])
@Index(["conversationId"])
export class ScheduledMessage {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid" })
  tenantId!: string;

  @Column({ type: "uuid" })
  conversationId!: string;

  @Column({
    type: "enum",
    enum: ChannelType,
  })
  channel!: ChannelType;

  @Column({ type: "text", nullable: true })
  text?: string | null;

  @Column({ type: "text", nullable: true })
  mediaUrl?: string | null;

  @Column({ type: "varchar", nullable: true })
  mediaType?: string | null;

  @Column({ type: "timestamp with time zone" })
  scheduledFor!: Date;

  @Column({
    type: "enum",
    enum: ScheduledMessageStatus,
    default: ScheduledMessageStatus.PENDING,
  })
  status!: ScheduledMessageStatus;

  @Column({ type: "int", default: 0 })
  attempts!: number;

  @Column({ type: "text", nullable: true })
  lastError?: string | null;

  @Column({ type: "varchar", nullable: true })
  externalId?: string | null;

  @Column({ type: "varchar", nullable: true })
  createdBy?: string | null;

  @CreateDateColumn({ type: "timestamp with time zone" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "timestamp with time zone" })
  updatedAt!: Date;
}
