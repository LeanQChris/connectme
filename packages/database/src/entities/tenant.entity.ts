import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  OneToOne,
} from "typeorm";
import type { User } from "./user.entity";
import type { TenantCredential } from "./tenant-credential.entity";
import type { ConnectedAccount } from "./connected-account.entity";
import type { Contact } from "./contact.entity";
import type { Conversation } from "./conversation.entity";

@Entity("tenants")
export class Tenant {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ unique: true })
  slug!: string;

  @Column()
  name!: string;

  @CreateDateColumn({ type: "timestamp with time zone" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "timestamp with time zone" })
  updatedAt!: Date;

  @OneToMany("User", "tenant")
  users!: User[];

  @OneToOne("TenantCredential", "tenant")
  credentials?: TenantCredential;

  @OneToMany("ConnectedAccount", "tenant")
  accounts!: ConnectedAccount[];

  @OneToMany("Contact", "tenant")
  contacts!: Contact[];

  @OneToMany("Conversation", "tenant")
  conversations!: Conversation[];
}
