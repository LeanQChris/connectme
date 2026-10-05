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
import { Tenant } from "./tenant.entity";

@Entity("whatsapp_templates")
@Index(["tenantId", "name", "language"], { unique: true })
@Index(["tenantId", "status"])
export class WhatsAppTemplate {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "uuid" })
  tenantId!: string;

  @Column({ type: "varchar", length: 512 })
  name!: string;

  @Column({ type: "varchar", length: 16, default: "en_US" })
  language!: string;

  @Column({ type: "varchar", length: 32, default: "UTILITY" })
  category!: string;

  @Column({ type: "varchar", length: 32, default: "APPROVED" })
  status!: string;

  @Column({ type: "jsonb", default: () => "'[]'" })
  components!: Array<{
    type: "HEADER" | "BODY" | "FOOTER" | "BUTTONS";
    format?: "TEXT" | "IMAGE" | "DOCUMENT" | "VIDEO" | "LOCATION";
    text?: string;
    example?: Record<string, unknown>;
    buttons?: Array<{
      type: "QUICK_REPLY" | "URL" | "PHONE_NUMBER" | "OTP";
      text: string;
      url?: string;
      phoneNumber?: string;
    }>;
  }>;

  @Column({ type: "jsonb", nullable: true })
  rawTemplate?: Record<string, unknown> | null;

  @CreateDateColumn({ type: "timestamp with time zone" })
  createdAt!: Date;

  @UpdateDateColumn({ type: "timestamp with time zone" })
  updatedAt!: Date;

  @ManyToOne(() => Tenant, { onDelete: "CASCADE" })
  @JoinColumn({ name: "tenantId" })
  tenant!: Tenant;
}
