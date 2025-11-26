import { Knex } from 'knex';
import { Element, ElementCreate, ElementFilters } from '../models/Element';

export interface IElementRepository {
  create(data: ElementCreate): Promise<Element>;
  createBatch(elements: ElementCreate[]): Promise<Element[]>;
  findById(id: string): Promise<Element | null>;
  findByModel(modelId: string, filters?: ElementFilters): Promise<Element[]>;
  findByCategory(modelId: string, category: string): Promise<Element[]>;
  delete(id: string): Promise<boolean>;
  deleteByModel(modelId: string): Promise<number>;
}

export class ElementRepository implements IElementRepository {
  private db: Knex;
  private tableName = 'elements';

  constructor(db: Knex) {
    this.db = db;
  }

  async create(data: ElementCreate): Promise<Element> {
    const [element] = await this.db(this.tableName)
      .insert({
        model_id: data.modelId,
        external_id: data.externalId,
        category: data.category,
        family_name: data.familyName,
        type_name: data.typeName,
        level: data.level,
        geometry: JSON.stringify(data.geometry),
        properties: data.properties ? JSON.stringify(data.properties) : null,
        material_ids: data.materialIds,
      })
      .returning('*');

    return this.mapToElement(element);
  }

  async createBatch(elements: ElementCreate[]): Promise<Element[]> {
    const insertData = elements.map((data) => ({
      model_id: data.modelId,
      external_id: data.externalId,
      category: data.category,
      family_name: data.familyName,
      type_name: data.typeName,
      level: data.level,
      geometry: JSON.stringify(data.geometry),
      properties: data.properties ? JSON.stringify(data.properties) : null,
      material_ids: data.materialIds,
    }));

    const created = await this.db(this.tableName)
      .insert(insertData)
      .returning('*');

    return created.map(this.mapToElement);
  }

  async findById(id: string): Promise<Element | null> {
    const element = await this.db(this.tableName)
      .where({ id })
      .first();

    return element ? this.mapToElement(element) : null;
  }

  async findByModel(modelId: string, filters?: ElementFilters): Promise<Element[]> {
    let query = this.db(this.tableName)
      .where({ model_id: modelId });

    if (filters?.category) {
      query = query.where({ category: filters.category });
    }

    if (filters?.level) {
      query = query.where({ level: filters.level });
    }

    const elements = await query.select('*');
    return elements.map(this.mapToElement);
  }

  async findByCategory(modelId: string, category: string): Promise<Element[]> {
    const elements = await this.db(this.tableName)
      .where({ model_id: modelId, category })
      .select('*');

    return elements.map(this.mapToElement);
  }

  async delete(id: string): Promise<boolean> {
    const count = await this.db(this.tableName)
      .where({ id })
      .delete();

    return count > 0;
  }

  async deleteByModel(modelId: string): Promise<number> {
    return await this.db(this.tableName)
      .where({ model_id: modelId })
      .delete();
  }

  private mapToElement(row: any): Element {
    return {
      id: row.id,
      modelId: row.model_id,
      externalId: row.external_id,
      category: row.category,
      familyName: row.family_name,
      typeName: row.type_name,
      level: row.level,
      geometry: typeof row.geometry === 'string' ? JSON.parse(row.geometry) : row.geometry,
      properties: row.properties ? (typeof row.properties === 'string' ? JSON.parse(row.properties) : row.properties) : undefined,
      materialIds: row.material_ids || [],
      createdAt: new Date(row.created_at),
    };
  }
}
