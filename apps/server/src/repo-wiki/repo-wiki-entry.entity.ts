import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('repo_wiki_entries')
export class RepoWikiEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  projectId: string;

  @Column()
  filePath: string;

  @Column()
  fileHash: string;

  @Column('text')
  summary: string;

  @Column('json')
  symbols: any;

  @Column({ nullable: true })
  embeddingId: string;

  @UpdateDateColumn()
  updatedAt: Date;
}
