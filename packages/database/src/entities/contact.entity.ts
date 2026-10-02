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
  Unique,
} from "typeorm";
import { ChannelType } from "../enums";
import { Tenant } from "./tenant.entity";
import type { Conversation } from "./conversation.entity";

@Entity("contacts")
@Unique(["tenantId", "channel", "externalId"])
@Index(["tenantId", "name"])
export class Contact {
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
  externalId!: string; // Phone number, PSID, IGSID, Telegram Chat ID, Discord User ID

  @Column()
  name!: string;

  @Column({ type: "varchar", nullable: true })
  avatarUrl?: string | null;

  @Column({ type: "varchar", nullable: true })
  email?: string | null;

  @Column({ type: "varchar", nullable: true })
  phoneNumber?: string | null;

  @CreateDateColumn({ type: "timestamp with time zone" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "timestamp with time zone" })
  updatedAt!: Date;

  @ManyToOne(() => Tenant, (tenant) => tenant.contacts, { onDelete: "CASCADE" })
  @JoinColumn({ name: "tenantId" })
  tenant!: Tenant;

  @OneToMany("Conversation", "contact")
  conversations!: Conversation[];
}
