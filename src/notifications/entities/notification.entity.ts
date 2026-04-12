export interface NotificationPreferenceEntity {
  organizationId: string;
  teamId?: string;
  notifyRequestStatus: boolean;
  notifyFeatureStatus: boolean;
  notifySprintStatus: boolean;
  notifyRelease: boolean;
  updatedAt: string;
}

export interface NotificationEntity {
  id: string;
  organizationId: string;
  teamId?: string;
  eventName: string;
  title: string;
  message: string;
  createdAt: string;
  readAt?: string;
  payload: Record<string, unknown>;
}
