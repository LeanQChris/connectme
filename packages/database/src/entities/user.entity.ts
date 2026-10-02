import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from "typeorm";
import { Tenant } from "./tenant.entity";
import type { Conversation } from "./conversation.entity";

@Entity("users")
export class User {
  @PrimaryColumn({ type: "varchar", length: 128 })
  id!: string; // Clerk user ID

  @Column({ type: "uuid" })
  tenantId!: string;

  @Column()
  email!: string;

  @Column({ nullable: true, type: "varchar" })
  firstName?: string | null;

  @Column({ nullable: true, type: "varchar" })
  lastName?: string | null;

  @Column({ nullable: true, type: "varchar" })
  avatarUrl?: string | null;

  @Column({ default: "agent" })
  role!: string; // admin, agent, viewer

  @CreateDateColumn({ type: "timestamp with time zone" })
  createdAt!: Date;

  @ManyToOne(() => Tenant, (tenant) => tenant.users, { onDelete: "CASCADE" })
  @JoinColumn({ name: "tenantId" })
  tenant!: Tenant;

  @OneToMany("Conversation", "assignee")
  assignedThreads!: Conversation[];
}
