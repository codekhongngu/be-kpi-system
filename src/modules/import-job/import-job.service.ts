import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ImportJob, ImportJobStatus } from './entities/import-job.entity';
import { ImportJobQueryDto } from './dto/import-job-query.dto';

type ImportJobSummary = {
  total?: number;
  success?: number;
  failed?: number;
  errors?: string[];
};

@Injectable()
export class ImportJobService {
  constructor(
    @InjectRepository(ImportJob)
    private readonly repo: Repository<ImportJob>,
  ) {}

  async create(type: string, createdById: string): Promise<ImportJob> {
    const job = this.repo.create({
      type,
      status: 'QUEUED' as ImportJobStatus,
      createdById,
    });
    return await this.repo.save(job);
  }

  async updateStatus(
    id: string,
    status: ImportJobStatus,
    summary?: Partial<ImportJobSummary>,
  ) {
    const job = await this.repo.findOne({ where: { id } });
    if (!job) return;

    job.status = status;
    if (status === 'DONE' || status === 'FAILED') {
      job.finishedAt = new Date();
    }
    if (summary) {
      job.summary = { ...((job.summary as any) || {}), ...summary };
    }
    await this.repo.save(job);
  }

  async findAll(query: ImportJobQueryDto) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 50, 200);
    const skip = (page - 1) * limit;

    const qb = this.repo
      .createQueryBuilder('job')
      .leftJoinAndSelect('job.createdBy', 'createdBy');

    if (query.type) {
      qb.andWhere('job.type = :type', { type: query.type });
    }
    if (query.status) {
      qb.andWhere('job.status = :status', { status: query.status });
    }
    if (query.createdById) {
      qb.andWhere('job.createdById = :createdById', {
        createdById: query.createdById,
      });
    }

    const [items, total] = await qb
      .orderBy('job.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return { items, meta: { page, limit, total } };
  }

  async findOne(id: string) {
    return await this.repo.findOne({
      where: { id },
      relations: ['createdBy'],
    });
  }
}
