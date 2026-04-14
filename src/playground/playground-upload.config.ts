import { randomUUID } from 'crypto';
import type { Request } from 'express';
import * as path from 'path';
import { diskStorage } from 'multer';
import type { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { BadRequestException } from '@nestjs/common';
import { PlaygroundStorageService } from './storage/playground-storage.service';

const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024;

export function buildPlaygroundUploadOptions(
  storageService: PlaygroundStorageService,
): MulterOptions {
  return {
    storage: diskStorage({
      destination: (req: Request, _file, callback) => {
        const playgroundWorkspaceId = String(req.params.id || '').trim();

        if (!playgroundWorkspaceId) {
          callback(new BadRequestException('playground workspace id is required.'), '');
          return;
        }

        try {
          const directory = storageService.ensureWorkspaceDirectory(
            playgroundWorkspaceId,
          );
          callback(null, directory);
        } catch {
          callback(
            new BadRequestException('Invalid playground workspace id.'),
            '',
          );
        }
      },
      filename: (_req, file, callback) => {
        const extension = path.extname(file.originalname || '').toLowerCase();
        callback(null, `${Date.now()}-${randomUUID()}${extension}`);
      },
    }),
    limits: {
      fileSize: MAX_FILE_SIZE_BYTES,
      files: 1,
    },
    fileFilter: (_req, file, callback) => {
      if (!storageService.isSupportedMimeType(file.mimetype)) {
        callback(
          new BadRequestException(
            'Unsupported file type. Use image, text-like files, or PDF.',
          ),
          false,
        );
        return;
      }

      callback(null, true);
    },
  };
}
