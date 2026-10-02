import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from "typeorm";
import { ChannelType, ConversationStatus } from "../enums";
import { Tenant } from "./tenant.entity";
import { Contact } from "./contact.entity";
import { ConnectedAccount } from "./connected-account.entity";
import { User } from "./user.entity";
import type { Message } from "./message.entity";

@Entity("conversations")
@Index(["tenantId", "status", "lastMessageAt"])
@Index(["tenantId", "channel"])
export class Conversation {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid" })
  tenantId!: string;

  @Column({ type: "uuid" })
  contactId!: string;

  @Column({ type: "uuid", nullable: true })
  accountId?: string | null;

  @Column({
    type: "enum",
    enum: ChannelType,
  })
  channel!: ChannelType;

  @Column({
    type: "enum",
    enum: ConversationStatus,
    default: ConversationStatus.OPEN,
  })
  status!: ConversationStatus;

  @Column({ type: "varchar", length: 128, nullable: true })
  assigneeId?: string | null;

  @Column("text", { array: true, default: "{}" })
  tags!: string[];

  @Column({ type: "int", default: 0 })
  unreadCount!: number;

  @Column({ type: "text", nullable: true })
  lastMessageText?: string | null;

  @CreateDateColumn({ type: "timestamp with time zone" })
  lastMessageAt!: Date;

  @Column({ type: "timestamp with time zone", nullable: true })
  lastInboundAt?: Date | null;

  @Column({ type: "timestamp with time zone", nullable: true })
  lastReadAt?: Date | null;

  @CreateDateColumn({ type: "timestamp with time zone" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "timestamp with time zone" })
  updatedAt!: Date;

  @ManyToOne(() => Tenant, (tenant) => tenant.conversations, { onDelete: "CASCADE" })
  @JoinColumn({ name: "tenantId" })
  tenant!: Tenant;

  @ManyToOne(() => Contact, (contact) => contact.conversations, { onDelete: "CASCADE" })
  @JoinColumn({ name: "contactId" })
  contact!: Contact;

  @ManyToOne(() => ConnectedAccount, (account) => account.conversations, {
    nullable: true,
    onDelete: "SET NULL",
  })
  @JoinColumn({ name: "accountId" })
  account?: ConnectedAccount | null;

  @ManyToOne(() => User, (user) => user.assignedThreads, {
    nullable: true,
    onDelete: "SET NULL",
  })
  @JoinColumn({ name: "assigneeId" })
  assignee?: User | null;

  @OneToMany("Message", "conversation")
  messages!: Message[];
}
