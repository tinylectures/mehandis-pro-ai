import { Knex } from 'knex';
import {
  CostItem,
  CostItemCreate,
  CostItemUpdate,
  CostEstimate,
  CostEstimateCreate,
  CostEstimateUpdate,
} from '../models/Cost';

export interface ICostRepository {
  createItem(data: CostItemCreate): Promise<CostItem>;
  findItemById(id: string): Promise<CostItem | null>;
  findItemsByProject(projectId: string): Promise<CostItem[]>;
  findItemsByCSI(projectId: string, csiCode: string): Promise<CostItem[]>;
  updateItem(id: string, data: CostItemUpdate): Promise<CostItem | null>;
  deleteItem(id: string): Promise<boolean>;
  
  createEstimate(data: CostEstimateCreate): Promise<CostEstimate>;
  findEstimateById(id: string): Promise<CostEstimate | null>;
  findEstimatesByProject(projectId: string): Promise<CostEstimate[]>;
  updateEstimate(id: string, data: CostEstimateUpdate): Promise<CostEstimate | null>;
  deleteEstimate(id: string): Promise<boolean>;
}

export class CostRepository implements ICostRepository {
  private db: Knex;
  private itemTableName = 'cost_items';
  private estimateTableName = 'cost_estimates';

  constructor(db: Knex) {
    this.db = db;
  }

  // Cost Item Methods
  async createItem(data: CostItemCreate): Promise<CostItem> {
    const regionalAdjustment = data.regionalAdjustment || 1.0;
    const totalCost = data.quantity * data.unitCost;
    const adjustedUnitCost = data.unitCost * regionalAdjustment;
    const adjustedTotalCost = data.quantity * adjustedUnitCost;

    const [item] = await this.db(this.itemTableName)
      .insert({
        project_id: data.projectId,
        quantity_id: data.quantityId,
        csi_code: data.csiCode,
        description: data.description,
        quantity: data.quantity,
        unit: data.unit,
        unit_cost: data.unitCost,
        total_cost: totalCost,
        regional_adjustment: regionalAdjustment,
        adjusted_unit_cost: adjustedUnitCost,
        adjusted_total_cost: adjustedTotalCost,
        cost_type: data.costType,
        vendor: data.vendor,
        notes: data.notes,
      })
      .returning('*');

    return this.mapToCostItem(item);
  }

  async findItemById(id: string): Promise<CostItem | null> {
    const item = await this.db(this.itemTableName)
      .where({ id })
      .first();

    return item ? this.mapToCostItem(item) : null;
  }

  async findItemsByProject(projectId: string): Promise<CostItem[]> {
    const items = await this.db(this.itemTableName)
      .where({ project_id: projectId })
      .orderBy('csi_code')
      .select('*');

    return items.map(this.mapToCostItem);
  }

  async findItemsByCSI(projectId: string, csiCode: string): Promise<CostItem[]> {
    const items = await this.db(this.itemTableName)
      .where({ project_id: projectId, csi_code: csiCode })
      .select('*');

    return items.map(this.mapToCostItem);
  }

  async updateItem(id: string, data: CostItemUpdate): Promise<CostItem | null> {
    const updateData: any = {
      updated_at: this.db.fn.now(),
    };

    // Get current item to recalculate costs
    const current = await this.findItemById(id);
    if (!current) return null;

    const quantity = data.quantity !== undefined ? data.quantity : current.quantity;
    const unitCost = data.unitCost !== undefined ? data.unitCost : current.unitCost;
    const regionalAdjustment = data.regionalAdjustment !== undefined ? data.regionalAdjustment : current.regionalAdjustment;

    if (data.description !== undefined) updateData.description = data.description;
    if (data.quantity !== undefined) updateData.quantity = data.quantity;
    if (data.unit !== undefined) updateData.unit = data.unit;
    if (data.unitCost !== undefined) updateData.unit_cost = data.unitCost;
    if (data.regionalAdjustment !== undefined) updateData.regional_adjustment = data.regionalAdjustment;
    if (data.costType !== undefined) updateData.cost_type = data.costType;
    if (data.vendor !== undefined) updateData.vendor = data.vendor;
    if (data.notes !== undefined) updateData.notes = data.notes;

    // Recalculate costs
    updateData.total_cost = quantity * unitCost;
    updateData.adjusted_unit_cost = unitCost * regionalAdjustment;
    updateData.adjusted_total_cost = quantity * unitCost * regionalAdjustment;

    const [item] = await this.db(this.itemTableName)
      .where({ id })
      .update(updateData)
      .returning('*');

    return item ? this.mapToCostItem(item) : null;
  }

  async deleteItem(id: string): Promise<boolean> {
    const count = await this.db(this.itemTableName)
      .where({ id })
      .delete();

    return count > 0;
  }

  // Cost Estimate Methods
  async createEstimate(data: CostEstimateCreate): Promise<CostEstimate> {
    const totalCost = data.directCosts + data.indirectCosts + data.contingency + data.overhead + data.profit;

    const [estimate] = await this.db(this.estimateTableName)
      .insert({
        project_id: data.projectId,
        name: data.name,
        description: data.description,
        direct_costs: data.directCosts,
        indirect_costs: data.indirectCosts,
        contingency: data.contingency,
        overhead: data.overhead,
        profit: data.profit,
        total_cost: totalCost,
        status: data.status,
        created_by: data.createdBy,
      })
      .returning('*');

    return this.mapToCostEstimate(estimate);
  }

  async findEstimateById(id: string): Promise<CostEstimate | null> {
    const estimate = await this.db(this.estimateTableName)
      .where({ id })
      .first();

    return estimate ? this.mapToCostEstimate(estimate) : null;
  }

  async findEstimatesByProject(projectId: string): Promise<CostEstimate[]> {
    const estimates = await this.db(this.estimateTableName)
      .where({ project_id: projectId })
      .orderBy('created_at', 'desc')
      .select('*');

    return estimates.map(this.mapToCostEstimate);
  }

  async updateEstimate(id: string, data: CostEstimateUpdate): Promise<CostEstimate | null> {
    const updateData: any = {
      updated_at: this.db.fn.now(),
    };

    // Get current estimate to recalculate total
    const current = await this.findEstimateById(id);
    if (!current) return null;

    const directCosts = data.directCosts !== undefined ? data.directCosts : current.directCosts;
    const indirectCosts = data.indirectCosts !== undefined ? data.indirectCosts : current.indirectCosts;
    const contingency = data.contingency !== undefined ? data.contingency : current.contingency;
    const overhead = data.overhead !== undefined ? data.overhead : current.overhead;
    const profit = data.profit !== undefined ? data.profit : current.profit;

    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.directCosts !== undefined) updateData.direct_costs = data.directCosts;
    if (data.indirectCosts !== undefined) updateData.indirect_costs = data.indirectCosts;
    if (data.contingency !== undefined) updateData.contingency = data.contingency;
    if (data.overhead !== undefined) updateData.overhead = data.overhead;
    if (data.profit !== undefined) updateData.profit = data.profit;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.approvedBy !== undefined) updateData.approved_by = data.approvedBy;
    if (data.approvedAt !== undefined) updateData.approved_at = data.approvedAt;

    // Recalculate total
    updateData.total_cost = directCosts + indirectCosts + contingency + overhead + profit;

    const [estimate] = await this.db(this.estimateTableName)
      .where({ id })
      .update(updateData)
      .returning('*');

    return estimate ? this.mapToCostEstimate(estimate) : null;
  }

  async deleteEstimate(id: string): Promise<boolean> {
    const count = await this.db(this.estimateTableName)
      .where({ id })
      .delete();

    return count > 0;
  }

  private mapToCostItem(row: any): CostItem {
    return {
      id: row.id,
      projectId: row.project_id,
      quantityId: row.quantity_id,
      csiCode: row.csi_code,
      description: row.description,
      quantity: parseFloat(row.quantity),
      unit: row.unit,
      unitCost: parseFloat(row.unit_cost),
      totalCost: parseFloat(row.total_cost),
      regionalAdjustment: parseFloat(row.regional_adjustment),
      adjustedUnitCost: parseFloat(row.adjusted_unit_cost),
      adjustedTotalCost: parseFloat(row.adjusted_total_cost),
      costType: row.cost_type,
      vendor: row.vendor,
      notes: row.notes,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      version: row.version,
    };
  }

  private mapToCostEstimate(row: any): CostEstimate {
    return {
      id: row.id,
      projectId: row.project_id,
      name: row.name,
      description: row.description,
      directCosts: parseFloat(row.direct_costs),
      indirectCosts: parseFloat(row.indirect_costs),
      contingency: parseFloat(row.contingency),
      overhead: parseFloat(row.overhead),
      profit: parseFloat(row.profit),
      totalCost: parseFloat(row.total_cost),
      status: row.status,
      createdBy: row.created_by,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      approvedBy: row.approved_by,
      approvedAt: row.approved_at ? new Date(row.approved_at) : undefined,
      version: row.version,
    };
  }
}
