import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('model_configs')
export class ModelConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  userId: string;

  @Column()
  provider: string;

  @Column()
  modelName: string;

  @Column({ nullable: true })
  apiKey: string;

  @Column({ nullable: true })
  baseUrl: string;

  @Column({ default: false })
  isDefault: boolean;

  @Column({ default: 1 })
  priority: number;

  @Column('simple-array', { nullable: true })
  capabilities: string[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
