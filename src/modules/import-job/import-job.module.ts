import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ImportJob } from './entities/import-job.entity';
import { ImportJobService } from './import-job.service';
import { ImportJobController } from './import-job.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ImportJob])],
  controllers: [ImportJobController],
  providers: [ImportJobService],
  exports: [ImportJobService],
})
export class ImportJobModule {}
