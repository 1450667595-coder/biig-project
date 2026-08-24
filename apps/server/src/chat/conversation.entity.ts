import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Project } from '../projects/project.entity';
import { Message } from './message.entity';

@Entity('conversations')
export class Conversation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  projectId: string;

  @Column()
  userId: string;

  @Column()
  title: string;

  @Column({ default: 'deepseek/deepseek-chat' })
  model: string;

  @Column({ default: 'chat' })
  mode: string;

  @ManyToOne(() => Project, (project) => project.conversations, {
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'projectId' })
  project: Project;

  @OneToMany(() => Message, (message) => message.conversation)
  messages: Message[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
