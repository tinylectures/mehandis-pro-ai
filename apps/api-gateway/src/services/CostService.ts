import { Knex } from 'knex';
import { CostItem, CostItemCreate, CostItemUpdate, CostEstimate, CostEstimateCreate } from '../models/Cost';
import { CostRepository } from '../repositories/CostRepository';
import { CostDatabaseRepository } from '../repositories/CostDatabaseRepository';
import { QuantityRepository } from '../repositories/QuantityRepository';

export interface CostApplication {
  quantityId: string;
  materialType?: string;
  unitCost?: number;
  costType: 'material' | 'labor' | 'equipment' | 'subcontractor';
  csiCode?: string;
  vendor?: string;
  notes?: string;
}

export interface CostCalculationResult {
  costItem: CostItem;
  appliedRegionalAdjustment: number;
}

export interface EstimateTotals {
  directCosts: number;
  indirectCosts: number;
  contingency: number;
  overhead: number;
  profit: number;
  totalCost: number;
}

export interface EstimateCalculationOptions {
  contingencyPercent?: number;
  overheadPercent?: number;
  profitPercent?: number;
  indirectCosts?: number;
}

export interface ICostService {
  applyCostToQuantity(
    projectId: string,
    application: CostApplication,
    regionalAdjustment?: number
  ): Promise<CostCalculationResult>;
  calculateTotalCosts(projectId: string): Promise<number>;
  applyRegionalAdjustment(projectId: string, country: string, state?: string, city?: string): Promise<CostItem[]>;
  recalculateCostItem(costItemId: string): Promise<CostItem>;
  calculateEstimateTotals(projectId: string, options?: EstimateCalculationOptions): Promise<EstimateTotals>;
  createCostEstimate(projectId: string, name: string, options?: EstimateCalculationOptions, createdBy?: string): Promise<CostEstimate>;
}

export class CostService implements ICostService {
  private costRepo: CostRepository;
  private costDbRepo: CostDatabaseRepository;
  private quantityRepo: QuantityRepository;

  constructor(db: Knex) {
    this.costRepo = new CostRepository(db);
    this.costDbRepo = new CostDatabaseRepository(db);
    this.quantityRepo = new QuantityRepository(db);
  }

  /**
   * Apply unit costs to a quantity and create a cost item
   * Property 18: Cost calculation is accurate
   */
  async applyCostToQuantity(
    projectId: string,
    application: CostApplication,
    regionalAdjustment?: number
  ): Promise<CostCalculationResult> {
    // Get the quantity
    const quantity = await this.quantityRepo.findById(application.quantityId);
    if (!quantity) {
      throw new Error(`Quantity ${application.quantityId} not found`);
    }

    // Determine unit cost
    let unitCost = application.unitCost;
    let description = '';

    // If no unit cost provided, try to get from material database
    if (!unitCost && application.materialType) {
      const materialCost = await this.costDbRepo.findMaterialCostByType(application.materialType);
      if (materialCost) {
        unitCost = materialCost.defaultUnitCost;
        description = materialCost.description;
      }
    }

    if (!unitCost) {
      throw new Error('Unit cost must be provided or material type must exist in database');
    }

    // Use provided description or fall back to quantity category
    if (!description) {
      description = `${quantity.category} - ${quantity.quantityType}`;
    }

    // Use regional adjustment if provided, otherwise default to 1.0
    const adjustment = regionalAdjustment !== undefined ? regionalAdjustment : 1.0;

    // Create cost item
    const costItemData: CostItemCreate = {
      projectId,
      quantityId: application.quantityId,
      csiCode: application.csiCode,
      description,
      quantity: quantity.adjustedValue, // Use adjusted value (includes waste factor)
      unit: quantity.unit,
      unitCost,
      regionalAdjustment: adjustment,
      costType: application.costType,
      vendor: application.vendor,
      notes: application.notes,
    };

    const costItem = await this.costRepo.createItem(costItemData);

    return {
      costItem,
      appliedRegionalAdjustment: adjustment,
    };
  }

  /**
   * Calculate total costs for a project
   * Property 22: Project totals include all components
   */
  async calculateTotalCosts(projectId: string): Promise<number> {
    const costItems = await this.costRepo.findItemsByProject(projectId);
    
    // Sum all adjusted total costs
    const total = costItems.reduce((sum, item) => sum + item.adjustedTotalCost, 0);
    
    return total;
  }

  /**
   * Apply regional adjustment to all cost items in a project
   * Property 19: Regional adjustments are applied
   */
  async applyRegionalAdjustment(
    projectId: string,
    country: string,
    state?: string,
    city?: string
  ): Promise<CostItem[]> {
    // Get regional adjustment factor
    const regionalAdjustment = await this.costDbRepo.findRegionalAdjustmentByLocation(
      country,
      state,
      city
    );

    if (!regionalAdjustment) {
      throw new Error(`No regional adjustment found for location: ${country}, ${state}, ${city}`);
    }

    // Get all cost items for the project
    const costItems = await this.costRepo.findItemsByProject(projectId);

    // Update each cost item with the regional adjustment
    const updatedItems: CostItem[] = [];
    for (const item of costItems) {
      const updated = await this.costRepo.updateItem(item.id, {
        regionalAdjustment: regionalAdjustment.adjustmentFactor,
      });
      if (updated) {
        updatedItems.push(updated);
      }
    }

    return updatedItems;
  }

  /**
   * Recalculate a cost item (useful when quantity or unit cost changes)
   * Property 21: Unit cost updates trigger recalculation
   */
  async recalculateCostItem(costItemId: string): Promise<CostItem> {
    const costItem = await this.costRepo.findItemById(costItemId);
    if (!costItem) {
      throw new Error(`Cost item ${costItemId} not found`);
    }

    // If linked to a quantity, update with latest quantity value
    if (costItem.quantityId) {
      const quantity = await this.quantityRepo.findById(costItem.quantityId);
      if (quantity) {
        const updated = await this.costRepo.updateItem(costItemId, {
          quantity: quantity.adjustedValue,
        });
        if (!updated) {
          throw new Error(`Failed to update cost item ${costItemId}`);
        }
        return updated;
      }
    }

    return costItem;
  }

  /**
   * Calculate estimate totals with contingency, overhead, and profit
   * Property 22: Project totals include all components
   */
  async calculateEstimateTotals(
    projectId: string,
    options: EstimateCalculationOptions = {}
  ): Promise<EstimateTotals> {
    // Get all cost items for the project
    const costItems = await this.costRepo.findItemsByProject(projectId);

    // Calculate direct costs (sum of all adjusted cost items)
    const directCosts = costItems.reduce((sum, item) => sum + item.adjustedTotalCost, 0);

    // Get indirect costs (default to 0 if not provided)
    const indirectCosts = options.indirectCosts || 0;

    // Calculate contingency (default to 10% of direct costs)
    const contingencyPercent = options.contingencyPercent !== undefined ? options.contingencyPercent : 0.10;
    const contingency = directCosts * contingencyPercent;

    // Calculate overhead (default to 15% of direct + indirect costs)
    const overheadPercent = options.overheadPercent !== undefined ? options.overheadPercent : 0.15;
    const overhead = (directCosts + indirectCosts) * overheadPercent;

    // Calculate profit (default to 10% of direct + indirect + overhead)
    const profitPercent = options.profitPercent !== undefined ? options.profitPercent : 0.10;
    const profit = (directCosts + indirectCosts + overhead) * profitPercent;

    // Calculate total cost
    const totalCost = directCosts + indirectCosts + contingency + overhead + profit;

    return {
      directCosts,
      indirectCosts,
      contingency,
      overhead,
      profit,
      totalCost,
    };
  }

  /**
   * Create a cost estimate with calculated totals
   */
  async createCostEstimate(
    projectId: string,
    name: string,
    options: EstimateCalculationOptions = {},
    createdBy?: string
  ): Promise<CostEstimate> {
    // Calculate totals
    const totals = await this.calculateEstimateTotals(projectId, options);

    // Create estimate
    const estimateData: CostEstimateCreate = {
      projectId,
      name,
      description: `Cost estimate generated on ${new Date().toISOString()}`,
      directCosts: totals.directCosts,
      indirectCosts: totals.indirectCosts,
      contingency: totals.contingency,
      overhead: totals.overhead,
      profit: totals.profit,
      status: 'draft',
      createdBy,
    };

    const estimate = await this.costRepo.createEstimate(estimateData);
    return estimate;
  }
}
