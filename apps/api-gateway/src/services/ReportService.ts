import { Knex } from 'knex';
import { Project } from '../models/Project';
import { Quantity } from '../models/Quantity';
import { CostItem, CostEstimate } from '../models/Cost';
import { ProjectRepository } from '../repositories/ProjectRepository';
import { QuantityRepository } from '../repositories/QuantityRepository';
import { CostRepository } from '../repositories/CostRepository';

/**
 * Report metadata included in all reports
 * Property 39: Reports include metadata
 */
export interface ReportMetadata {
  projectName: string;
  projectId: string;
  generatedAt: Date;
  generatedBy?: string;
  reportType: 'quantity' | 'cost_estimate';
}

/**
 * Quantity report data structure
 * Property 36: Quantity reports are organized
 */
export interface QuantityReportData {
  metadata: ReportMetadata;
  quantitiesByCategory: {
    category: string;
    quantities: Array<{
      id: string;
      quantityType: string;
      value: number;
      unit: string;
      wasteFactor: number;
      adjustedValue: number;
      calculationMethod?: string;
    }>;
    totalValue: number;
  }[];
  summary: {
    totalCategories: number;
    totalQuantities: number;
  };
}

/**
 * Cost estimate report data structure
 * Property 37: Cost reports are complete
 */
export interface CostEstimateReportData {
  metadata: ReportMetadata;
  estimate: {
    name: string;
    description?: string;
    status: string;
    version: number;
  };
  costBreakdown: {
    byCSICode: Array<{
      csiCode: string;
      description: string;
      items: Array<{
        id: string;
        description: string;
        quantity: number;
        unit: string;
        unitCost: number;
        adjustedUnitCost: number;
        adjustedTotalCost: number;
        costType: string;
      }>;
      subtotal: number;
    }>;
    byCategory: Array<{
      category: string;
      items: CostItem[];
      subtotal: number;
    }>;
  };
  totals: {
    directCosts: number;
    indirectCosts: number;
    contingency: number;
    overhead: number;
    profit: number;
    totalCost: number;
  };
  assumptions: string[];
  exclusions: string[];
}

export interface IReportService {
  generateQuantityReport(projectId: string, generatedBy?: string): Promise<QuantityReportData>;
  generateCostEstimateReport(
    projectId: string,
    estimateId?: string,
    generatedBy?: string
  ): Promise<CostEstimateReportData>;
}

export class ReportService implements IReportService {
  private projectRepo: ProjectRepository;
  private quantityRepo: QuantityRepository;
  private costRepo: CostRepository;

  constructor(db: Knex) {
    this.projectRepo = new ProjectRepository(db);
    this.quantityRepo = new QuantityRepository(db);
    this.costRepo = new CostRepository(db);
  }

  /**
   * Generate a quantity report organized by category
   * Property 36: Quantity reports are organized
   * Property 39: Reports include metadata
   * Validates: Requirements 9.1, 9.4
   */
  async generateQuantityReport(
    projectId: string,
    generatedBy?: string
  ): Promise<QuantityReportData> {
    // Get project information
    const project = await this.projectRepo.findById(projectId);
    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }

    // Get all quantities for the project
    const quantities = await this.quantityRepo.findByProject(projectId);

    if (quantities.length === 0) {
      throw new Error(`No quantities found for project ${projectId}`);
    }

    // Group quantities by category
    const quantitiesByCategory = this.groupQuantitiesByCategory(quantities);

    // Calculate summary statistics
    const summary = {
      totalCategories: quantitiesByCategory.length,
      totalQuantities: quantities.length,
    };

    // Create report metadata
    const metadata: ReportMetadata = {
      projectName: project.name,
      projectId: project.id,
      generatedAt: new Date(),
      generatedBy,
      reportType: 'quantity',
    };

    return {
      metadata,
      quantitiesByCategory,
      summary,
    };
  }

  /**
   * Generate a cost estimate report with breakdowns and totals
   * Property 37: Cost reports are complete
   * Property 39: Reports include metadata
   * Validates: Requirements 9.2, 9.4
   */
  async generateCostEstimateReport(
    projectId: string,
    estimateId?: string,
    generatedBy?: string
  ): Promise<CostEstimateReportData> {
    // Get project information
    const project = await this.projectRepo.findById(projectId);
    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }

    // Get cost estimate (if specific estimate requested, otherwise get latest)
    let estimate: CostEstimate | null = null;
    if (estimateId) {
      estimate = await this.costRepo.findEstimateById(estimateId);
    } else {
      const estimates = await this.costRepo.findEstimatesByProject(projectId);
      if (estimates.length > 0) {
        // Get the most recent estimate
        estimate = estimates.sort(
          (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
        )[0];
      }
    }

    if (!estimate) {
      throw new Error(
        `No cost estimate found for project ${projectId}${estimateId ? ` with ID ${estimateId}` : ''}`
      );
    }

    // Get all cost items for the project
    const costItems = await this.costRepo.findItemsByProject(projectId);

    if (costItems.length === 0) {
      throw new Error(`No cost items found for project ${projectId}`);
    }

    // Create cost breakdown by CSI code
    const byCSICode = this.groupCostItemsByCSICode(costItems);

    // Create cost breakdown by category (from linked quantities)
    const byCategory = await this.groupCostItemsByCategory(costItems);

    // Create report metadata
    const metadata: ReportMetadata = {
      projectName: project.name,
      projectId: project.id,
      generatedAt: new Date(),
      generatedBy,
      reportType: 'cost_estimate',
    };

    // Default assumptions and exclusions
    const assumptions = [
      'All quantities are based on BIM model data',
      'Unit costs include material and labor',
      'Regional adjustments have been applied',
      'Waste factors are included in adjusted quantities',
    ];

    const exclusions = [
      'Permits and fees',
      'Site mobilization costs',
      'Temporary facilities',
      'Owner-supplied materials',
    ];

    return {
      metadata,
      estimate: {
        name: estimate.name,
        description: estimate.description,
        status: estimate.status,
        version: estimate.version,
      },
      costBreakdown: {
        byCSICode,
        byCategory,
      },
      totals: {
        directCosts: estimate.directCosts,
        indirectCosts: estimate.indirectCosts,
        contingency: estimate.contingency,
        overhead: estimate.overhead,
        profit: estimate.profit,
        totalCost: estimate.totalCost,
      },
      assumptions,
      exclusions,
    };
  }

  /**
   * Group quantities by category
   */
  private groupQuantitiesByCategory(quantities: Quantity[]) {
    const grouped = new Map<string, Quantity[]>();

    for (const quantity of quantities) {
      const category = quantity.category;
      if (!grouped.has(category)) {
        grouped.set(category, []);
      }
      grouped.get(category)!.push(quantity);
    }

    return Array.from(grouped.entries()).map(([category, items]) => {
      const totalValue = items.reduce((sum, item) => sum + item.adjustedValue, 0);

      return {
        category,
        quantities: items.map((q) => ({
          id: q.id,
          quantityType: q.quantityType,
          value: q.value,
          unit: q.unit,
          wasteFactor: q.wasteFactor,
          adjustedValue: q.adjustedValue,
          calculationMethod: q.calculationMethod,
        })),
        totalValue,
      };
    });
  }

  /**
   * Group cost items by CSI code
   */
  private groupCostItemsByCSICode(costItems: CostItem[]) {
    const grouped = new Map<string, CostItem[]>();

    for (const item of costItems) {
      const csiCode = item.csiCode || 'Uncategorized';
      if (!grouped.has(csiCode)) {
        grouped.set(csiCode, []);
      }
      grouped.get(csiCode)!.push(item);
    }

    return Array.from(grouped.entries()).map(([csiCode, items]) => {
      const subtotal = items.reduce((sum, item) => sum + item.adjustedTotalCost, 0);

      return {
        csiCode,
        description: this.getCSICodeDescription(csiCode),
        items: items.map((item) => ({
          id: item.id,
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          unitCost: item.unitCost,
          adjustedUnitCost: item.adjustedUnitCost,
          adjustedTotalCost: item.adjustedTotalCost,
          costType: item.costType,
        })),
        subtotal,
      };
    });
  }

  /**
   * Group cost items by category (from linked quantities)
   */
  private async groupCostItemsByCategory(costItems: CostItem[]) {
    const grouped = new Map<string, CostItem[]>();

    for (const item of costItems) {
      let category = 'General';

      // If linked to a quantity, get the category from the quantity
      if (item.quantityId) {
        const quantity = await this.quantityRepo.findById(item.quantityId);
        if (quantity) {
          category = quantity.category;
        }
      }

      if (!grouped.has(category)) {
        grouped.set(category, []);
      }
      grouped.get(category)!.push(item);
    }

    return Array.from(grouped.entries()).map(([category, items]) => {
      const subtotal = items.reduce((sum, item) => sum + item.adjustedTotalCost, 0);

      return {
        category,
        items,
        subtotal,
      };
    });
  }

  /**
   * Get description for CSI MasterFormat code
   */
  private getCSICodeDescription(csiCode: string): string {
    const csiDescriptions: Record<string, string> = {
      '03': 'Concrete',
      '04': 'Masonry',
      '05': 'Metals',
      '06': 'Wood, Plastics, and Composites',
      '07': 'Thermal and Moisture Protection',
      '08': 'Openings',
      '09': 'Finishes',
      '10': 'Specialties',
      '11': 'Equipment',
      '12': 'Furnishings',
      '13': 'Special Construction',
      '14': 'Conveying Equipment',
      '21': 'Fire Suppression',
      '22': 'Plumbing',
      '23': 'Heating, Ventilating, and Air Conditioning',
      '26': 'Electrical',
      '27': 'Communications',
      '28': 'Electronic Safety and Security',
      '31': 'Earthwork',
      '32': 'Exterior Improvements',
      '33': 'Utilities',
      Uncategorized: 'Uncategorized Items',
    };

    // Extract division number (first 2 digits)
    const division = csiCode.substring(0, 2);
    return csiDescriptions[division] || csiDescriptions[csiCode] || csiCode;
  }
}
