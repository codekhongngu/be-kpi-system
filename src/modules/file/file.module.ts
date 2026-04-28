import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { FileRecord } from './entities/file-record.entity';
import { FileService } from './file.service';
import { FileController } from './file.controller';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([FileRecord]),
    MulterModule.register({
      storage: memoryStorage(),
      limits: { fileSize: 50 * 1024 * 1024 },
    }),
  ],
  controllers: [FileController],
  providers: [FileService],
  exports: [FileService],
})
export class FileModule {}
