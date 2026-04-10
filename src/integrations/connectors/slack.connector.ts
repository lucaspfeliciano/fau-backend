import { Injectable } from '@nestjs/common';

export interface SlackConfig {
  webhookUrl: string;
  defaultChannel?: string;
}

export interface SlackMessagePayload {
  text: string;
  channel?: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class SlackConnector {
  private readonly flakyAttempts = new Set<string>();

  async sendMessage(
    config: SlackConfig,
    payload: SlackMessagePayload,
    correlationId: string,
  ): Promise<{ externalMessageId: string }> {
    if (config.webhookUrl.includes('always-fail')) {
      throw new Error('Slack connector permanent failure.');
    }

    if (
      config.webhookUrl.includes('flaky') &&
      !this.flakyAttempts.has(correlationId)
    ) {
      this.flakyAttempts.add(correlationId);
      throw new Error('Slack connector transient failure.');
    }

    return {
      externalMessageId: `slack-${Date.now()}-${payload.text.length}`,
    };
  }
}
