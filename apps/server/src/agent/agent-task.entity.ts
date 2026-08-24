import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('agent_tasks')
export class AgentTask {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  conversationId: string;

  @Column()
  userId: string;

  @Column('text')
  description: string;

  @Column({ default: 'pending' })
  status: string;

  @Column('json', { nullable: true })
  plan: any;

  @Column({ default: 0 })
  currentStep: number;

  @Column({ default: 'suggest' })
  approvalMode: string;

  @Column('json', { nullable: true })
  context: any;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true })
  completedAt: Date;
}
