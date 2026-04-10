import { Injectable } from '@nestjs/common';

export interface HubSpotCompanyPayload {
  externalCompanyId: string;
  name: string;
  revenue?: number;
}

export interface HubSpotCustomerPayload {
  externalCustomerId: string;
  name: string;
  email: string;
  externalCompanyId?: string;
}

@Injectable()
export class HubSpotConnector {
  async sync(): Promise<{ ok: boolean }> {
    return { ok: true };
  }
}
