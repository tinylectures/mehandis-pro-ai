import { Knex } from 'knex';
import {
  MaterialCost,
  MaterialCostCreate,
  LaborRate,
  LaborRateCreate,
  RegionalAdjustment,
  RegionalAdjustmentCreate,
} from '../models/CostDatabase';

export interface ICostDatabaseRepository {
  // Material Costs
  createMaterialCost(data: MaterialCostCreate): Promise<MaterialCost>;
  findMaterialCostById(id: string): Promise<MaterialCost | null>;
  findMaterialCostsByCategory(category: string): Promise<MaterialCost[]>;
  findMaterialCostByType(materialType: string): Promise<MaterialCost | null>;
  getAllMaterialCosts(): Promise<MaterialCost[]>;
  updateMaterialCost(id: string, unitCost: number): Promise<MaterialCost | null>;
  
  // Labor Rates
  createLaborRate(data: LaborRateCreate): Promise<LaborRate>;
  findLaborRateById(id: string): Promise<LaborRate | null>;
  findLaborRatesByRegion(region: string): Promise<LaborRate[]>;
  findLaborRateByTrade(tradeType: string, region: string): Promise<LaborRate | null>;
  getAllLaborRates(): Promise<LaborRate[]>;
  updateLaborRate(id: string, hourlyRate: number): Promise<LaborRate | null>;
  
  // Regional Adjustments
  createRegionalAdjustment(data: RegionalAdjustmentCreate): Promise<RegionalAdjustment>;
  findRegionalAdjustmentById(id: string): Promise<RegionalAdjustment | null>;
  findRegionalAdjustmentByLocation(country: string, state?: string, city?: string): Promise<RegionalAdjustment | null>;
  getAllRegionalAdjustments(): Promise<RegionalAdjustment[]>;
  updateRegionalAdjustment(id: string, adjustmentFactor: number): Promise<RegionalAdjustment | null>;
}

export class CostDatabaseRepository implements ICostDatabaseRepository {
  private db: Knex;
  private materialCostsTable = 'material_costs';
  private laborRatesTable = 'labor_rates';
  private regionalAdjustmentsTable = 'regional_adjustments';

  constructor(db: Knex) {
    this.db = db;
  }

  // Material Costs Methods
  async createMaterialCost(data: MaterialCostCreate): Promise<MaterialCost> {
    const [cost] = await this.db(this.materialCostsTable)
      .insert({
        material_type: data.materialType,
        description: data.description,
        unit: data.unit,
        default_unit_cost: data.defaultUnitCost,
        category: data.category,
        csi_code: data.csiCode,
      })
      .returning('*');

    return this.mapToMaterialCost(cost);
  }

  async findMaterialCostById(id: string): Promise<MaterialCost | null> {
    const cost = await this.db(this.materialCostsTable)
      .where({ id })
      .first();

    return cost ? this.mapToMaterialCost(cost) : null;
  }

  async findMaterialCostsByCategory(category: string): Promise<MaterialCost[]> {
    const costs = await this.db(this.materialCostsTable)
      .where({ category })
      .orderBy('material_type')
      .select('*');

    return costs.map(this.mapToMaterialCost);
  }

  async findMaterialCostByType(materialType: string): Promise<MaterialCost | null> {
    const cost = await this.db(this.materialCostsTable)
      .where({ material_type: materialType })
      .first();

    return cost ? this.mapToMaterialCost(cost) : null;
  }

  async getAllMaterialCosts(): Promise<MaterialCost[]> {
    const costs = await this.db(this.materialCostsTable)
      .orderBy('category')
      .orderBy('material_type')
      .select('*');

    return costs.map(this.mapToMaterialCost);
  }

  async updateMaterialCost(id: string, unitCost: number): Promise<MaterialCost | null> {
    const [cost] = await this.db(this.materialCostsTable)
      .where({ id })
      .update({
        default_unit_cost: unitCost,
        last_updated: this.db.fn.now(),
      })
      .returning('*');

    return cost ? this.mapToMaterialCost(cost) : null;
  }

  // Labor Rates Methods
  async createLaborRate(data: LaborRateCreate): Promise<LaborRate> {
    const [rate] = await this.db(this.laborRatesTable)
      .insert({
        trade_type: data.tradeType,
        description: data.description,
        hourly_rate: data.hourlyRate,
        region: data.region,
      })
      .returning('*');

    return this.mapToLaborRate(rate);
  }

  async findLaborRateById(id: string): Promise<LaborRate | null> {
    const rate = await this.db(this.laborRatesTable)
      .where({ id })
      .first();

    return rate ? this.mapToLaborRate(rate) : null;
  }

  async findLaborRatesByRegion(region: string): Promise<LaborRate[]> {
    const rates = await this.db(this.laborRatesTable)
      .where({ region })
      .orderBy('trade_type')
      .select('*');

    return rates.map(this.mapToLaborRate);
  }

  async findLaborRateByTrade(tradeType: string, region: string): Promise<LaborRate | null> {
    const rate = await this.db(this.laborRatesTable)
      .where({ trade_type: tradeType, region })
      .first();

    return rate ? this.mapToLaborRate(rate) : null;
  }

  async getAllLaborRates(): Promise<LaborRate[]> {
    const rates = await this.db(this.laborRatesTable)
      .orderBy('region')
      .orderBy('trade_type')
      .select('*');

    return rates.map(this.mapToLaborRate);
  }

  async updateLaborRate(id: string, hourlyRate: number): Promise<LaborRate | null> {
    const [rate] = await this.db(this.laborRatesTable)
      .where({ id })
      .update({
        hourly_rate: hourlyRate,
        last_updated: this.db.fn.now(),
      })
      .returning('*');

    return rate ? this.mapToLaborRate(rate) : null;
  }

  // Regional Adjustments Methods
  async createRegionalAdjustment(data: RegionalAdjustmentCreate): Promise<RegionalAdjustment> {
    const [adjustment] = await this.db(this.regionalAdjustmentsTable)
      .insert({
        region: data.region,
        country: data.country,
        state: data.state,
        city: data.city,
        adjustment_factor: data.adjustmentFactor,
        effective_date: data.effectiveDate,
        notes: data.notes,
      })
      .returning('*');

    return this.mapToRegionalAdjustment(adjustment);
  }

  async findRegionalAdjustmentById(id: string): Promise<RegionalAdjustment | null> {
    const adjustment = await this.db(this.regionalAdjustmentsTable)
      .where({ id })
      .first();

    return adjustment ? this.mapToRegionalAdjustment(adjustment) : null;
  }

  async findRegionalAdjustmentByLocation(
    country: string,
    state?: string,
    city?: string
  ): Promise<RegionalAdjustment | null> {
    let query = this.db(this.regionalAdjustmentsTable).where({ country });

    if (city && state) {
      query = query.where({ city, state });
    } else if (state) {
      query = query.where({ state }).whereNull('city');
    } else {
      query = query.whereNull('state').whereNull('city');
    }

    const adjustment = await query.first();
    return adjustment ? this.mapToRegionalAdjustment(adjustment) : null;
  }

  async getAllRegionalAdjustments(): Promise<RegionalAdjustment[]> {
    const adjustments = await this.db(this.regionalAdjustmentsTable)
      .orderBy('country')
      .orderBy('state')
      .orderBy('city')
      .select('*');

    return adjustments.map(this.mapToRegionalAdjustment);
  }

  async updateRegionalAdjustment(id: string, adjustmentFactor: number): Promise<RegionalAdjustment | null> {
    const [adjustment] = await this.db(this.regionalAdjustmentsTable)
      .where({ id })
      .update({
        adjustment_factor: adjustmentFactor,
      })
      .returning('*');

    return adjustment ? this.mapToRegionalAdjustment(adjustment) : null;
  }

  // Mapping functions
  private mapToMaterialCost(row: any): MaterialCost {
    return {
      id: row.id,
      materialType: row.material_type,
      description: row.description,
      unit: row.unit,
      defaultUnitCost: parseFloat(row.default_unit_cost),
      category: row.category,
      csiCode: row.csi_code,
      lastUpdated: new Date(row.last_updated),
    };
  }

  private mapToLaborRate(row: any): LaborRate {
    return {
      id: row.id,
      tradeType: row.trade_type,
      description: row.description,
      hourlyRate: parseFloat(row.hourly_rate),
      region: row.region,
      lastUpdated: new Date(row.last_updated),
    };
  }

  private mapToRegionalAdjustment(row: any): RegionalAdjustment {
    return {
      id: row.id,
      region: row.region,
      country: row.country,
      state: row.state,
      city: row.city,
      adjustmentFactor: parseFloat(row.adjustment_factor),
      effectiveDate: new Date(row.effective_date),
      notes: row.notes,
    };
  }
}
