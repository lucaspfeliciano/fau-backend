import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { PlaygroundAssetType } from '../entities/playground-asset-type.enum';

@Injectable()
export class PlaygroundStorageService {
  private readonly uploadsRoot = path.resolve(process.cwd(), 'uploads');
  private readonly playgroundRoot = path.resolve(
    this.uploadsRoot,
    'playground',
  );

  ensureWorkspaceDirectory(playgroundWorkspaceId: string): string {
    const safeWorkspaceSegment = this.normalizeWorkspaceSegment(
      playgroundWorkspaceId,
    );
    const directory = path.resolve(this.playgroundRoot, safeWorkspaceSegment);

    if (!directory.startsWith(this.playgroundRoot)) {
      throw new Error('Invalid playground workspace path.');
    }

    fs.mkdirSync(directory, { recursive: true });
    return directory;
  }

  buildStorageKey(playgroundWorkspaceId: string, fileName: string): string {
    const safeWorkspaceSegment = this.normalizeWorkspaceSegment(
      playgroundWorkspaceId,
    );
    return path.posix.join('playground', safeWorkspaceSegment, fileName);
  }

  buildFileUrl(storageKey: string): string {
    return `/uploads/${storageKey}`;
  }

  classifyAssetType(mimeType: string): PlaygroundAssetType {
    const normalizedMimeType = mimeType.toLowerCase();

    if (normalizedMimeType.startsWith('image/')) {
      return PlaygroundAssetType.Image;
    }

    if (this.isTextCompatibleMimeType(normalizedMimeType)) {
      return PlaygroundAssetType.Text;
    }

    return PlaygroundAssetType.File;
  }

  isSupportedMimeType(mimeType: string): boolean {
    const normalizedMimeType = mimeType.toLowerCase();

    if (normalizedMimeType.startsWith('image/')) {
      return true;
    }

    if (this.isTextCompatibleMimeType(normalizedMimeType)) {
      return true;
    }

    return normalizedMimeType === 'application/pdf';
  }

  deleteFile(storageKey: string): void {
    const absolutePath = path.resolve(this.uploadsRoot, storageKey);

    if (!absolutePath.startsWith(this.uploadsRoot)) {
      return;
    }

    if (fs.existsSync(absolutePath)) {
      fs.unlinkSync(absolutePath);
    }
  }

  private isTextCompatibleMimeType(mimeType: string): boolean {
    return (
      mimeType.startsWith('text/') ||
      mimeType === 'application/json' ||
      mimeType === 'application/xml' ||
      mimeType === 'text/csv' ||
      mimeType === 'application/csv' ||
      mimeType === 'application/x-yaml' ||
      mimeType === 'text/markdown'
    );
  }

  private normalizeWorkspaceSegment(rawWorkspaceId: string): string {
    const normalized = rawWorkspaceId.trim();

    if (!/^[a-zA-Z0-9_-]+$/.test(normalized)) {
      throw new Error('Invalid playground workspace id for storage.');
    }

    return normalized;
  }
}
