export interface MaterialCost {
  id: string;
  materialType: string;
  description: string;
  unit: string;
  defaultUnitCost: number;
  category: string;
  csiCode?: string;
  lastUpdated: Date;
}

export interface LaborRate {
  id: string;
  tradeType: string;
  description: string;
  hourlyRate: number;
  region: string;
  lastUpdated: Date;
}

export interface RegionalAdjustment {
  id: string;
  region: string;
  country: string;
  state?: string;
  city?: string;
  adjustmentFactor: number;
  effectiveDate: Date;
  notes?: string;
}

export interface MaterialCostCreate {
  materialType: string;
  description: string;
  unit: string;
  defaultUnitCost: number;
  category: string;
  csiCode?: string;
}

export interface LaborRateCreate {
  tradeType: string;
  description: string;
  hourlyRate: number;
  region: string;
}

export interface RegionalAdjustmentCreate {
  region: string;
  country: string;
  state?: string;
  city?: string;
  adjustmentFactor: number;
  effectiveDate: Date;
  notes?: string;
}
