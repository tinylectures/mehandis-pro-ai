import { Knex } from 'knex';
import { BIMModel, BIMModelCreate, BIMModelUpdate } from '../models/BIMModel';

export interface IBIMModelRepository {
  create(data: BIMModelCreate): Promise<BIMModel>;
  findById(id: string): Promise<BIMModel | null>;
  findByProject(projectId: string): Promise<BIMModel[]>;
  update(id: string, data: BIMModelUpdate): Promise<BIMModel | null>;
  delete(id: string): Promise<boolean>;
}

export class BIMModelRepository implements IBIMModelRepository {
  private db: Knex;
  private tableName = 'bim_models';

  constructor(db: Knex) {
    this.db = db;
  }

  async create(data: BIMModelCreate): Promise<BIMModel> {
    const [model] = await this.db(this.tableName)
      .insert({
        project_id: data.projectId,
        file_name: data.fileName,
        file_size: data.fileSize,
        file_type: data.fileType,
        storage_url: data.storageUrl,
        status: 'uploading',
        processing_progress: 0,
        uploaded_by: data.uploadedBy,
      })
      .returning('*');

    return this.mapToBIMModel(model);
  }

  async findById(id: string): Promise<BIMModel | null> {
    const model = await this.db(this.tableName)
      .where({ id })
      .first();

    return model ? this.mapToBIMModel(model) : null;
  }

  async findByProject(projectId: string): Promise<BIMModel[]> {
    const models = await this.db(this.tableName)
      .where({ project_id: projectId })
      .orderBy('uploaded_at', 'desc')
      .select('*');

    return models.map(this.mapToBIMModel);
  }

  async update(id: string, data: BIMModelUpdate): Promise<BIMModel | null> {
    const updateData: any = {};

    if (data.status !== undefined) updateData.status = data.status;
    if (data.processingProgress !== undefined) updateData.processing_progress = data.processingProgress;
    if (data.errorMessage !== undefined) updateData.error_message = data.errorMessage;
    if (data.metadata !== undefined) updateData.metadata = JSON.stringify(data.metadata);
    if (data.processedAt !== undefined) updateData.processed_at = data.processedAt;

    const [model] = await this.db(this.tableName)
      .where({ id })
      .update(updateData)
      .returning('*');

    return model ? this.mapToBIMModel(model) : null;
  }

  async delete(id: string): Promise<boolean> {
    const count = await this.db(this.tableName)
      .where({ id })
      .delete();

    return count > 0;
  }

  private mapToBIMModel(row: any): BIMModel {
    return {
      id: row.id,
      projectId: row.project_id,
      fileName: row.file_name,
      fileSize: parseInt(row.file_size),
      fileType: row.file_type,
      storageUrl: row.storage_url,
      status: row.status,
      processingProgress: row.processing_progress,
      errorMessage: row.error_message,
      metadata: row.metadata ? (typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata) : undefined,
      uploadedBy: row.uploaded_by,
      uploadedAt: new Date(row.uploaded_at),
      processedAt: row.processed_at ? new Date(row.processed_at) : undefined,
    };
  }
}
