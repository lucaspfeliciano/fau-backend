import { Injectable } from '@nestjs/common';
import type { TaskEntity } from '../../engineering/entities/task.entity';

@Injectable()
export class LinearConnector {
  async upsertIssue(
    task: TaskEntity,
    existingExternalId?: string,
  ): Promise<{ externalIssueId: string }> {
    if (existingExternalId) {
      return { externalIssueId: existingExternalId };
    }

    return {
      externalIssueId: `linear-${task.id}`,
    };
  }
}
