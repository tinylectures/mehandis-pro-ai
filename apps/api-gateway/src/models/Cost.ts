export type CostType = 'material' | 'labor' | 'equipment' | 'subcontractor';
export type EstimateStatus = 'draft' | 'review' | 'approved' | 'rejected';

export interface CostItem {
  id: string;
  projectId: string;
  quantityId?: string;
  csiCode?: string;
  description: string;
  quantity: number;
  unit: string;
  unitCost: number;
  totalCost: number;
  regionalAdjustment: number;
  adjustedUnitCost: number;
  adjustedTotalCost: number;
  costType: CostType;
  vendor?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

export interface CostItemCreate {
  projectId: string;
  quantityId?: string;
  csiCode?: string;
  description: string;
  quantity: number;
  unit: string;
  unitCost: number;
  regionalAdjustment?: number;
  costType: CostType;
  vendor?: string;
  notes?: string;
}

export interface CostItemUpdate {
  description?: string;
  quantity?: number;
  unit?: string;
  unitCost?: number;
  regionalAdjustment?: number;
  costType?: CostType;
  vendor?: string;
  notes?: string;
}

export interface CostEstimate {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  directCosts: number;
  indirectCosts: number;
  contingency: number;
  overhead: number;
  profit: number;
  totalCost: number;
  status: EstimateStatus;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
  approvedBy?: string;
  approvedAt?: Date;
  version: number;
}

export interface CostEstimateCreate {
  projectId: string;
  name: string;
  description?: string;
  directCosts: number;
  indirectCosts: number;
  contingency: number;
  overhead: number;
  profit: number;
  status: EstimateStatus;
  createdBy?: string;
}

export interface CostEstimateUpdate {
  name?: string;
  description?: string;
  directCosts?: number;
  indirectCosts?: number;
  contingency?: number;
  overhead?: number;
  profit?: number;
  status?: EstimateStatus;
  approvedBy?: string;
  approvedAt?: Date;
}
