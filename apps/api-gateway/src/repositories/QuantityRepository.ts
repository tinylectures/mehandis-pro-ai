import { Knex } from 'knex';
import { Quantity, QuantityCreate, QuantityUpdate, QuantityFilters } from '../models/Quantity';

export interface IQuantityRepository {
  create(data: QuantityCreate): Promise<Quantity>;
  findById(id: string): Promise<Quantity | null>;
  findByProject(projectId: string, filters?: QuantityFilters): Promise<Quantity[]>;
  findByElement(elementId: string): Promise<Quantity[]>;
  update(id: string, data: QuantityUpdate): Promise<Quantity | null>;
  delete(id: string): Promise<boolean>;
}

export class QuantityRepository implements IQuantityRepository {
  private db: Knex;
  private tableName = 'quantities';

  constructor(db: Knex) {
    this.db = db;
  }

  async create(data: QuantityCreate): Promise<Quantity> {
    const wasteFactor = data.wasteFactor || 0;
    const adjustedValue = data.value * (1 + wasteFactor);

    const [quantity] = await this.db(this.tableName)
      .insert({
        project_id: data.projectId,
        element_id: data.elementId,
        category: data.category,
        quantity_type: data.quantityType,
        value: data.value,
        unit: data.unit,
        waste_factor: wasteFactor,
        adjusted_value: adjustedValue,
        calculation_method: data.calculationMethod,
        metadata: data.metadata ? JSON.stringify(data.metadata) : null,
        calculated_by: data.calculatedBy,
      })
      .returning('*');

    return this.mapToQuantity(quantity);
  }

  async findById(id: string): Promise<Quantity | null> {
    const quantity = await this.db(this.tableName)
      .where({ id })
      .first();

    return quantity ? this.mapToQuantity(quantity) : null;
  }

  async findByProject(projectId: string, filters?: QuantityFilters): Promise<Quantity[]> {
    let query = this.db(this.tableName)
      .where({ project_id: projectId });

    if (filters?.category) {
      query = query.where({ category: filters.category });
    }

    if (filters?.quantityType) {
      query = query.where({ quantity_type: filters.quantityType });
    }

    if (filters?.elementId) {
      query = query.where({ element_id: filters.elementId });
    }

    const quantities = await query.select('*');
    return quantities.map(this.mapToQuantity);
  }

  async findByElement(elementId: string): Promise<Quantity[]> {
    const quantities = await this.db(this.tableName)
      .where({ element_id: elementId })
      .select('*');

    return quantities.map(this.mapToQuantity);
  }

  async update(id: string, data: QuantityUpdate): Promise<Quantity | null> {
    const updateData: any = {};

    if (data.value !== undefined) {
      updateData.value = data.value;
      // Recalculate adjusted value if value or waste factor changes
      const current = await this.findById(id);
      if (current) {
        const wasteFactor = data.wasteFactor !== undefined ? data.wasteFactor : current.wasteFactor;
        updateData.adjusted_value = data.value * (1 + wasteFactor);
      }
    }

    if (data.unit !== undefined) updateData.unit = data.unit;
    
    if (data.wasteFactor !== undefined) {
      updateData.waste_factor = data.wasteFactor;
      // Recalculate adjusted value
      const current = await this.findById(id);
      if (current) {
        const value = data.value !== undefined ? data.value : current.value;
        updateData.adjusted_value = value * (1 + data.wasteFactor);
      }
    }

    if (data.calculationMethod !== undefined) updateData.calculation_method = data.calculationMethod;
    if (data.metadata !== undefined) updateData.metadata = JSON.stringify(data.metadata);

    const [quantity] = await this.db(this.tableName)
      .where({ id })
      .update(updateData)
      .returning('*');

    return quantity ? this.mapToQuantity(quantity) : null;
  }

  async delete(id: string): Promise<boolean> {
    const count = await this.db(this.tableName)
      .where({ id })
      .delete();

    return count > 0;
  }

  private mapToQuantity(row: any): Quantity {
    return {
      id: row.id,
      projectId: row.project_id,
      elementId: row.element_id,
      category: row.category,
      quantityType: row.quantity_type,
      value: parseFloat(row.value),
      unit: row.unit,
      wasteFactor: parseFloat(row.waste_factor),
      adjustedValue: parseFloat(row.adjusted_value),
      calculationMethod: row.calculation_method,
      metadata: row.metadata ? (typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata) : undefined,
      calculatedAt: new Date(row.calculated_at),
      calculatedBy: row.calculated_by,
      version: row.version,
    };
  }
}
