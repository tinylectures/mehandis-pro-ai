export type QuantityType = 'volume' | 'area' | 'length' | 'count';

export interface QuantityMetadata {
  formula?: string;
  parameters?: Record<string, number>;
}

export interface Quantity {
  id: string;
  projectId: string;
  elementId: string;
  category: string;
  quantityType: QuantityType;
  value: number;
  unit: string;
  wasteFactor: number;
  adjustedValue: number;
  calculationMethod?: string;
  metadata?: QuantityMetadata;
  calculatedAt: Date;
  calculatedBy?: string;
  version: number;
}

export interface QuantityCreate {
  projectId: string;
  elementId: string;
  category: string;
  quantityType: QuantityType;
  value: number;
  unit: string;
  wasteFactor?: number;
  calculationMethod?: string;
  metadata?: QuantityMetadata;
  calculatedBy?: string;
}

export interface QuantityUpdate {
  value?: number;
  unit?: string;
  wasteFactor?: number;
  calculationMethod?: string;
  metadata?: QuantityMetadata;
}

export interface QuantityFilters {
  projectId?: string;
  elementId?: string;
  category?: string;
  quantityType?: QuantityType;
}
