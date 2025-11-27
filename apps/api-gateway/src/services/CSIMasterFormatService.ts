import { Knex } from 'knex';
import { CostItem } from '../models/Cost';
import { CostRepository } from '../repositories/CostRepository';

export interface CSIDivision {
  code: string;
  title: string;
  description: string;
}

export interface CSICostBreakdown {
  division: CSIDivision;
  costItems: CostItem[];
  subtotal: number;
  adjustedSubtotal: number;
}

export interface CSICostSummary {
  projectId: string;
  breakdowns: CSICostBreakdown[];
  totalCost: number;
  totalAdjustedCost: number;
}

export interface ICSIMasterFormatService {
  getCostBreakdownByCSI(projectId: string): Promise<CSICostSummary>;
  getDivisionCosts(projectId: string, divisionCode: string): Promise<CSICostBreakdown>;
  getAllDivisions(): CSIDivision[];
  mapMaterialToCSI(materialType: string): string;
}

export class CSIMasterFormatService implements ICSIMasterFormatService {
  private costRepo: CostRepository;

  // CSI MasterFormat 2020 Divisions
  private static readonly CSI_DIVISIONS: CSIDivision[] = [
    { code: '00', title: 'Procurement and Contracting Requirements', description: 'Bidding and contract requirements' },
    { code: '01', title: 'General Requirements', description: 'Administrative and temporary facilities' },
    { code: '02', title: 'Existing Conditions', description: 'Demolition and site remediation' },
    { code: '03', title: 'Concrete', description: 'Concrete formwork, reinforcement, and cast-in-place' },
    { code: '04', title: 'Masonry', description: 'Brick, block, and stone masonry' },
    { code: '05', title: 'Metals', description: 'Structural steel and metal fabrications' },
    { code: '06', title: 'Wood, Plastics, and Composites', description: 'Rough and finish carpentry' },
    { code: '07', title: 'Thermal and Moisture Protection', description: 'Insulation, roofing, and waterproofing' },
    { code: '08', title: 'Openings', description: 'Doors, windows, and glazing' },
    { code: '09', title: 'Finishes', description: 'Drywall, flooring, painting, and coatings' },
    { code: '10', title: 'Specialties', description: 'Toilet partitions, signage, and accessories' },
    { code: '11', title: 'Equipment', description: 'Commercial and institutional equipment' },
    { code: '12', title: 'Furnishings', description: 'Furniture and window treatments' },
    { code: '13', title: 'Special Construction', description: 'Pools, fountains, and special structures' },
    { code: '14', title: 'Conveying Equipment', description: 'Elevators and escalators' },
    { code: '21', title: 'Fire Suppression', description: 'Fire sprinklers and suppression systems' },
    { code: '22', title: 'Plumbing', description: 'Plumbing fixtures and piping' },
    { code: '23', title: 'Heating, Ventilating, and Air Conditioning (HVAC)', description: 'HVAC systems and equipment' },
    { code: '25', title: 'Integrated Automation', description: 'Building automation systems' },
    { code: '26', title: 'Electrical', description: 'Electrical systems and lighting' },
    { code: '27', title: 'Communications', description: 'Data and communication systems' },
    { code: '28', title: 'Electronic Safety and Security', description: 'Security and fire alarm systems' },
    { code: '31', title: 'Earthwork', description: 'Excavation and grading' },
    { code: '32', title: 'Exterior Improvements', description: 'Paving, landscaping, and site improvements' },
    { code: '33', title: 'Utilities', description: 'Water, sewer, and utility distribution' },
  ];

  constructor(db: Knex) {
    this.costRepo = new CostRepository(db);
  }

  /**
   * Get cost breakdown organized by CSI divisions
   * Property 20: Costs are organized by CSI codes
   */
  async getCostBreakdownByCSI(projectId: string): Promise<CSICostSummary> {
    // Get all cost items for the project
    const allCostItems = await this.costRepo.findItemsByProject(projectId);

    // Group cost items by CSI division
    const breakdowns: CSICostBreakdown[] = [];
    let totalCost = 0;
    let totalAdjustedCost = 0;

    // Process each division
    for (const division of CSIMasterFormatService.CSI_DIVISIONS) {
      // Find cost items that belong to this division
      const divisionItems = allCostItems.filter(item => {
        if (!item.csiCode) return false;
        // Match division code (first 2 digits)
        const itemDivision = item.csiCode.substring(0, 2);
        return itemDivision === division.code;
      });

      if (divisionItems.length > 0) {
        // Calculate subtotals
        const subtotal = divisionItems.reduce((sum, item) => sum + item.totalCost, 0);
        const adjustedSubtotal = divisionItems.reduce((sum, item) => sum + item.adjustedTotalCost, 0);

        breakdowns.push({
          division,
          costItems: divisionItems,
          subtotal,
          adjustedSubtotal,
        });

        totalCost += subtotal;
        totalAdjustedCost += adjustedSubtotal;
      }
    }

    // Handle items without CSI codes
    const uncodedItems = allCostItems.filter(item => !item.csiCode);
    if (uncodedItems.length > 0) {
      const subtotal = uncodedItems.reduce((sum, item) => sum + item.totalCost, 0);
      const adjustedSubtotal = uncodedItems.reduce((sum, item) => sum + item.adjustedTotalCost, 0);

      breakdowns.push({
        division: {
          code: '99',
          title: 'Uncategorized',
          description: 'Items without CSI classification',
        },
        costItems: uncodedItems,
        subtotal,
        adjustedSubtotal,
      });

      totalCost += subtotal;
      totalAdjustedCost += adjustedSubtotal;
    }

    return {
      projectId,
      breakdowns,
      totalCost,
      totalAdjustedCost,
    };
  }

  /**
   * Get costs for a specific CSI division
   */
  async getDivisionCosts(projectId: string, divisionCode: string): Promise<CSICostBreakdown> {
    const division = CSIMasterFormatService.CSI_DIVISIONS.find(d => d.code === divisionCode);
    if (!division) {
      throw new Error(`Invalid CSI division code: ${divisionCode}`);
    }

    const allCostItems = await this.costRepo.findItemsByProject(projectId);
    
    // Filter items for this division
    const divisionItems = allCostItems.filter(item => {
      if (!item.csiCode) return false;
      const itemDivision = item.csiCode.substring(0, 2);
      return itemDivision === divisionCode;
    });

    const subtotal = divisionItems.reduce((sum, item) => sum + item.totalCost, 0);
    const adjustedSubtotal = divisionItems.reduce((sum, item) => sum + item.adjustedTotalCost, 0);

    return {
      division,
      costItems: divisionItems,
      subtotal,
      adjustedSubtotal,
    };
  }

  /**
   * Get all CSI divisions
   */
  getAllDivisions(): CSIDivision[] {
    return CSIMasterFormatService.CSI_DIVISIONS;
  }

  /**
   * Map material type to CSI code
   * This is a helper function to automatically assign CSI codes
   */
  mapMaterialToCSI(materialType: string): string {
    const materialLower = materialType.toLowerCase();

    // Concrete - Division 03
    if (materialLower.includes('concrete')) return '03 30 00';
    if (materialLower.includes('rebar') || materialLower.includes('reinforcement')) return '03 20 00';

    // Masonry - Division 04
    if (materialLower.includes('brick')) return '04 21 00';
    if (materialLower.includes('cmu') || materialLower.includes('block')) return '04 22 00';

    // Metals - Division 05
    if (materialLower.includes('steel') || materialLower.includes('structural')) return '05 12 00';

    // Wood - Division 06
    if (materialLower.includes('lumber') || materialLower.includes('wood')) return '06 10 00';
    if (materialLower.includes('plywood')) return '06 10 00';

    // Thermal and Moisture - Division 07
    if (materialLower.includes('insulation')) return '07 21 00';
    if (materialLower.includes('roofing') || materialLower.includes('shingle')) return '07 31 00';
    if (materialLower.includes('waterproof')) return '07 10 00';

    // Openings - Division 08
    if (materialLower.includes('door')) return '08 10 00';
    if (materialLower.includes('window')) return '08 50 00';

    // Finishes - Division 09
    if (materialLower.includes('drywall') || materialLower.includes('gypsum')) return '09 29 00';
    if (materialLower.includes('paint')) return '09 91 00';
    if (materialLower.includes('flooring') || materialLower.includes('tile')) return '09 60 00';

    // Plumbing - Division 22
    if (materialLower.includes('plumb') || materialLower.includes('pipe')) return '22 00 00';

    // HVAC - Division 23
    if (materialLower.includes('hvac') || materialLower.includes('duct')) return '23 00 00';

    // Electrical - Division 26
    if (materialLower.includes('electric') || materialLower.includes('wire')) return '26 00 00';

    // Default to uncategorized
    return '99 00 00';
  }
}
