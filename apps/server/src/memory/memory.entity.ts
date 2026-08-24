import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('memories')
export class Memory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column({ nullable: true })
  projectId: string;

  @Column('text')
  content: string;

  @Column()
  memoryType: string;

  @Column({ type: 'int', default: 3 })
  importance: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  lastAccessedAt: Date;
}
