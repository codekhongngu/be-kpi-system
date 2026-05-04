import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum FileCategory {
  TEMPLATE = 'TEMPLATE',
  EXPORT = 'EXPORT',
  IMPORT = 'IMPORT',
  AVATAR = 'AVATAR',
  ATTACHMENT = 'ATTACHMENT',
}

export enum FileMimeType {
  PDF = 'application/pdf',
  XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  XLS = 'application/vnd.ms-excel',
  CSV = 'text/csv',
  PNG = 'image/png',
  JPG = 'image/jpeg',
  GIF = 'image/gif',
  DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  DOC = 'application/msword',
  ZIP = 'application/zip',
}

@Entity('files')
@Index(['userId', 'createdAt'])
@Index(['category'])
export class FileRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  originalName: string;

  @Column({ type: 'varchar', length: 500 })
  storagePath: string;

  @Column({ type: 'varchar', length: 100 })
  mimeType: string;

  @Column({ type: 'bigint' })
  size: number;

  @Column({ type: 'varchar', length: 30 })
  category: FileCategory;

  @Column({ type: 'uuid', nullable: true })
  userId: string | null;

  @Column({ type: 'boolean', default: false })
  isPublic: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  expiresAt: Date | null;
}
