import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Unique,
} from "typeorm";
import { ChannelType } from "../enums";
import { Tenant } from "./tenant.entity";
import type { Conversation } from "./conversation.entity";

@Entity("connected_accounts")
@Unique(["tenantId", "externalId"])
export class ConnectedAccount {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid" })
  tenantId!: string;

  @Column({
    type: "enum",
    enum: ChannelType,
  })
  channel!: ChannelType;

  @Column()
  provider!: string; // meta, telegram, discord

  @Column()
  externalId!: string; // Page ID, Instagram ID, Bot ID

  @Column()
  name!: string;

  @Column({ type: "varchar", nullable: true })
  avatarUrl?: string | null;

  @Column({ type: "text", nullable: true })
  accessTokenEnc?: string | null;

  @Column({ default: true })
  isActive!: boolean;

  @CreateDateColumn({ type: "timestamp with time zone" })
  createdAt!: Date;

  @ManyToOne(() => Tenant, (tenant) => tenant.accounts, { onDelete: "CASCADE" })
  @JoinColumn({ name: "tenantId" })
  tenant!: Tenant;

  @OneToMany("Conversation", "account")
  conversations!: Conversation[];
}
