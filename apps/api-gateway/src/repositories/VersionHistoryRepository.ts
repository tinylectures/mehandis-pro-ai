import { Knex } from 'knex';
import { VersionHistory, VersionHistoryCreate, VersionEntityType } from '../models/VersionHistory';

export interface IVersionHistoryRepository {
  create(data: VersionHistoryCreate): Promise<VersionHistory>;
  findByEntity(entityType: VersionEntityType, entityId: string): Promise<VersionHistory[]>;
  findByEntityAndVersion(
    entityType: VersionEntityType,
    entityId: string,
    versionNumber: number
  ): Promise<VersionHistory | null>;
  getLatestVersion(entityType: VersionEntityType, entityId: string): Promise<number>;
}

export class VersionHistoryRepository implements IVersionHistoryRepository {
  private db: Knex;
  private tableName = 'version_history';

  constructor(db: Knex) {
    this.db = db;
  }

  async create(data: VersionHistoryCreate): Promise<VersionHistory> {
    const [version] = await this.db(this.tableName)
      .insert({
        entity_type: data.entityType,
        entity_id: data.entityId,
        version_number: data.versionNumber,
        data: JSON.stringify(data.data),
        changes: data.changes ? JSON.stringify(data.changes) : null,
        changed_by: data.changedBy,
        change_description: data.changeDescription,
      })
      .returning('*');

    return this.mapToVersionHistory(version);
  }

  async findByEntity(
    entityType: VersionEntityType,
    entityId: string
  ): Promise<VersionHistory[]> {
    const versions = await this.db(this.tableName)
      .where({ entity_type: entityType, entity_id: entityId })
      .orderBy('version_number', 'desc')
      .select('*');

    return versions.map(this.mapToVersionHistory);
  }

  async findByEntityAndVersion(
    entityType: VersionEntityType,
    entityId: string,
    versionNumber: number
  ): Promise<VersionHistory | null> {
    const version = await this.db(this.tableName)
      .where({
        entity_type: entityType,
        entity_id: entityId,
        version_number: versionNumber,
      })
      .first();

    return version ? this.mapToVersionHistory(version) : null;
  }

  async getLatestVersion(entityType: VersionEntityType, entityId: string): Promise<number> {
    const result = await this.db(this.tableName)
      .where({ entity_type: entityType, entity_id: entityId })
      .max('version_number as max_version')
      .first();

    return result?.max_version || 0;
  }

  private mapToVersionHistory(row: any): VersionHistory {
    return {
      id: row.id,
      entityType: row.entity_type,
      entityId: row.entity_id,
      versionNumber: row.version_number,
      data: typeof row.data === 'string' ? JSON.parse(row.data) : row.data,
      changes: row.changes
        ? typeof row.changes === 'string'
          ? JSON.parse(row.changes)
          : row.changes
        : undefined,
      changedBy: row.changed_by,
      createdAt: new Date(row.created_at),
      changeDescription: row.change_description,
    };
  }
}
