export enum RoadmapItemCategory {
  Request = 'request',
  Feature = 'feature',
  Task = 'task',
  Release = 'release',
}

export interface RoadmapItemEntity {
  id: string;
  sourceId: string;
  category: RoadmapItemCategory;
  title: string;
  description: string;
  status: string;
  ownerId: string;
  boardId?: string;
  score?: number;
  eta?: string;
  createdAt: string;
  updatedAt: string;
}
