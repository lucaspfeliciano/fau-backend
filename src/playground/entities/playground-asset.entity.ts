import { PlaygroundAssetType } from './playground-asset-type.enum';

export interface PlaygroundAssetEntity {
  id: string;
  playgroundWorkspaceId: string;
  workspaceId: string;
  name: string;
  type: PlaygroundAssetType;
  mimeType: string;
  fileUrl?: string;
  storageKey: string;
  extractedText?: string;
  uploadedBy: string;
  createdAt: string;
}
