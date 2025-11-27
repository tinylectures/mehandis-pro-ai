export type VersionEntityType = 'project' | 'cost_estimate' | 'quantity';

export interface VersionHistory {
  id: string;
  entityType: VersionEntityType;
  entityId: string;
  versionNumber: number;
  data: any; // Snapshot of the entity at this version
  changes?: any; // What changed from previous version
  changedBy?: string;
  createdAt: Date;
  changeDescription?: string;
}

export interface VersionHistoryCreate {
  entityType: VersionEntityType;
  entityId: string;
  versionNumber: number;
  data: any;
  changes?: any;
  changedBy?: string;
  changeDescription?: string;
}
