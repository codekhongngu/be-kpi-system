import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { FileRecord, FileCategory } from './entities/file-record.entity';
import { FileQueryDto } from './dto/file-query.dto';
import * as path from 'path';
import * as fs from 'fs/promises';

interface UploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

@Injectable()
export class FileService {
  private readonly baseDir: string;

  constructor(
    @InjectRepository(FileRecord)
    private readonly repo: Repository<FileRecord>,
    private readonly config: ConfigService,
  ) {
    this.baseDir = this.config.get<string>('FILE_STORAGE_PATH', './uploads');
  }

  async upload(
    file: UploadedFile,
    category: FileCategory,
    userId: string | null,
    options?: { isPublic?: boolean; expiresAt?: Date },
  ) {
    const ext = path.extname(file.originalname);
    const storedName = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
    const storagePath = path.join(category.toLowerCase(), storedName);
    const fullPath = path.join(this.baseDir, storagePath);

    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, file.buffer);

    const record = this.repo.create({
      originalName: file.originalname,
      storagePath,
      mimeType: file.mimetype,
      size: file.size,
      category,
      userId,
      isPublic: options?.isPublic ?? false,
      expiresAt: options?.expiresAt ?? null,
    });
    return await this.repo.save(record);
  }

  async findAll(query: FileQueryDto) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 50, 200);
    const skip = (page - 1) * limit;

    const qb = this.repo.createQueryBuilder('file');

    if (query.category) {
      qb.andWhere('file.category = :category', { category: query.category });
    }
    if (query.isPublic !== undefined) {
      qb.andWhere('file.isPublic = :isPublic', { isPublic: query.isPublic });
    }
    if (query.q?.trim()) {
      qb.andWhere('file.originalName ILIKE :q', { q: `%${query.q.trim()}%` });
    }

    const [items, total] = await qb
      .orderBy('file.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return { items, meta: { page, limit, total } };
  }

  async findOne(id: string) {
    const record = await this.repo.findOne({ where: { id } });
    if (!record) {
      throw new NotFoundException('File not found');
    }
    return record;
  }

  async getFilePath(id: string): Promise<{ record: FileRecord; path: string }> {
    const record = await this.findOne(id);
    const fullPath = path.join(this.baseDir, record.storagePath);
    return { record, path: fullPath };
  }

  async delete(id: string) {
    const { path: fullPath } = await this.getFilePath(id);
    await fs.unlink(fullPath).catch(() => {});
    await this.repo.delete(id);
    return { ok: true };
  }
}
