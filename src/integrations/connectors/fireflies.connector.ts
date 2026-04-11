import { Injectable } from '@nestjs/common';

export interface FirefliesConfig {
  apiKey: string;
  workspaceId?: string;
  projectId?: string;
  defaultLanguage?: string;
}

export interface FirefliesTranscriptPayload {
  externalTranscriptId: string;
  title: string;
  transcriptText: string;
  happenedAt?: string;
  participants?: string[];
}

@Injectable()
export class FirefliesConnector {
  async importTranscript(
    _config: FirefliesConfig,
    payload: FirefliesTranscriptPayload,
  ): Promise<{ externalImportId: string }> {
    return {
      externalImportId: `fireflies-import-${Date.now()}-${payload.externalTranscriptId}`,
    };
  }
}
