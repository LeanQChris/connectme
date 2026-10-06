import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from "typeorm";
import { ChannelType, MessageDirection, MessageStatus, MediaType } from "../enums";
import { Conversation } from "./conversation.entity";

@Entity("messages")
@Index(["conversationId", "createdAt"])
@Index(["conversationId", "externalId"], { unique: true, where: '"externalId" IS NOT NULL' })
export class Message {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid" })
  conversationId!: string;

  @Column({ type: "varchar", nullable: true })
  externalId?: string | null;

  @Column({
    type: "enum",
    enum: MessageDirection,
  })
  direction!: MessageDirection;

  @Column({
    type: "enum",
    enum: ChannelType,
  })
  channel!: ChannelType;

  @Column({
    type: "enum",
    enum: MediaType,
    default: MediaType.TEXT,
  })
  type!: MediaType;

  @Column({ type: "text", nullable: true })
  text?: string | null;

  // Single-attachment `mediaUrl` was retired in favour of `media[]` below;
  // see migration 1790988000000-DropMessageMediaUrl.

  @Column({ type: "varchar", nullable: true })
  mediaMimeType?: string | null;

  @Column({ type: "int", nullable: true })
  mediaSize?: number | null;

  @Column({ type: "jsonb", nullable: true })
  media?: Array<{
    url: string;
    type: string;
    name?: string;
    size?: number;
    mimeType?: string;
  }> | null;

  @Column({
    type: "enum",
    enum: MessageStatus,
    default: MessageStatus.RECEIVED,
  })
  status!: MessageStatus;

  @Column({ type: "varchar", nullable: true })
  authorName?: string | null;

  @Column({ type: "text", nullable: true })
  errorDetail?: string | null;

  @CreateDateColumn({ type: "timestamp with time zone" })
  createdAt!: Date;

  @ManyToOne(() => Conversation, (conv) => conv.messages, { onDelete: "CASCADE" })
  @JoinColumn({ name: "conversationId" })
  conversation!: Conversation;
}
