import { Entity, PrimaryGeneratedColumn, Column, Index, ManyToOne, JoinColumn, UpdateDateColumn } from "typeorm";
import { Tenant } from "./tenant.entity";
import { User } from "./user.entity";

@Entity("browser_push_subscriptions")
@Index("IDX_push_tenant_endpoint", ["tenantId", "endpointHash"], { unique: true })
@Index("IDX_push_tenant_user", ["tenantId", "userId"])
export class BrowserPushSubscription {
  @PrimaryGeneratedColumn("uuid")
  id!: string;
  @Column({ type: "uuid" })
  tenantId!: string;
  @Column({ type: "varchar", length: 128 })
  userId!: string;
  @Column({ type: "varchar", length: 64 })
  endpointHash!: string;
  @Column({ type: "text" })
  subscriptionEnc!: string;
  @Column({ type: "varchar", length: 128 })
  vapidPublicKey!: string;
  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt!: Date;
  @ManyToOne(() => Tenant, { onDelete: "CASCADE" })
  @JoinColumn({ name: "tenantId" })
  tenant!: Tenant;
  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user!: User;
}
