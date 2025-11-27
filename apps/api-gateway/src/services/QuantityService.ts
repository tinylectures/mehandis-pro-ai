import { Knex } from 'knex';
import { Quantity, QuantityCreate, QuantityType } from '../models/Quantity';
import { Element } from '../models/Element';
import { QuantityRepository } from '../repositories/QuantityRepository';
import { ElementRepository } from '../repositories/ElementRepository';
import {
  calculateBoundingBoxVolume,
  calculateBoundingBoxArea,
  calculateDistance,
} from '../utils/geometricCalculations';
import { applyWasteFactor } from '../utils/wasteFactor';

export interface CalculationOptions {
  wasteFactor?: number;
  unit?: string;
  calculatedBy?: string;
}

export interface QuantityResult {
  elementId: string;
  category: string;
  quantities: Quantity[];
}

export interface IQuantityService {
  calculateQuantitiesForModel(
    modelId: string,
    projectId: string,
    options?: CalculationOptions
  ): Promise<QuantityResult[]>;
  calculateQuantityForElement(
    element: Element,
    projectId: string,
    options?: CalculationOptions
  ): Promise<Quantity[]>;
  recalculateWithWasteFactor(quantityId: string, wasteFactor: number): Promise<Quantity>;
}

export class QuantityService implements IQuantityService {
  private quantityRepo: QuantityRepository;
  private elementRepo: ElementRepository;

  constructor(db: Knex) {
    this.quantityRepo = new QuantityRepository(db);
    this.elementRepo = new ElementRepository(db);
  }

  /**
   * Calculate quantities for all elements in a BIM model
   */
  async calculateQuantitiesForModel(
    modelId: string,
    projectId: string,
    options: CalculationOptions = {}
  ): Promise<QuantityResult[]> {
    // Fetch all elements for the model
    const elements = await this.elementRepo.findByModel(modelId);

    if (elements.length === 0) {
      throw new Error(`No elements found for model ${modelId}`);
    }

    const results: QuantityResult[] = [];

    // Calculate quantities for each element
    for (const element of elements) {
      const quantities = await this.calculateQuantityForElement(element, projectId, options);

      results.push({
        elementId: element.id,
        category: element.category,
        quantities,
      });
    }

    return results;
  }

  /**
   * Calculate quantities for a single element based on its geometry
   */
  async calculateQuantityForElement(
    element: Element,
    projectId: string,
    options: CalculationOptions = {}
  ): Promise<Quantity[]> {
    const quantities: Quantity[] = [];
    const { geometry, category } = element;
    const wasteFactor = options.wasteFactor || 0;

    // Determine appropriate calculations based on element category
    const categoryLower = category.toLowerCase();

    try {
      // Calculate volume for solid elements
      if (this.shouldCalculateVolume(categoryLower)) {
        const volume = this.calculateElementVolume(element);
        const unit = options.unit || 'm3';

        const quantityData: QuantityCreate = {
          projectId,
          elementId: element.id,
          category,
          quantityType: 'volume',
          value: volume,
          unit,
          wasteFactor,
          calculationMethod: 'bounding_box_volume',
          metadata: {
            formula: 'length × width × height',
            parameters: {
              length: Math.abs(geometry.boundingBox.max.x - geometry.boundingBox.min.x),
              width: Math.abs(geometry.boundingBox.max.y - geometry.boundingBox.min.y),
              height: Math.abs(geometry.boundingBox.max.z - geometry.boundingBox.min.z),
            },
          },
          calculatedBy: options.calculatedBy,
        };

        const quantity = await this.quantityRepo.create(quantityData);
        quantities.push(quantity);
      }

      // Calculate area for surface elements
      if (this.shouldCalculateArea(categoryLower)) {
        const area = this.calculateElementArea(element);
        const unit = options.unit || 'm2';

        const quantityData: QuantityCreate = {
          projectId,
          elementId: element.id,
          category,
          quantityType: 'area',
          value: area,
          unit,
          wasteFactor,
          calculationMethod: 'bounding_box_area',
          metadata: {
            formula: 'length × width',
            parameters: {
              length: Math.abs(geometry.boundingBox.max.x - geometry.boundingBox.min.x),
              width: Math.abs(geometry.boundingBox.max.y - geometry.boundingBox.min.y),
            },
          },
          calculatedBy: options.calculatedBy,
        };

        const quantity = await this.quantityRepo.create(quantityData);
        quantities.push(quantity);
      }

      // Calculate length for linear elements
      if (this.shouldCalculateLength(categoryLower)) {
        const length = this.calculateElementLength(element);
        const unit = options.unit || 'm';

        const quantityData: QuantityCreate = {
          projectId,
          elementId: element.id,
          category,
          quantityType: 'length',
          value: length,
          unit,
          wasteFactor,
          calculationMethod: 'bounding_box_diagonal',
          metadata: {
            formula: 'sqrt(dx² + dy² + dz²)',
            parameters: {
              dx: Math.abs(geometry.boundingBox.max.x - geometry.boundingBox.min.x),
              dy: Math.abs(geometry.boundingBox.max.y - geometry.boundingBox.min.y),
              dz: Math.abs(geometry.boundingBox.max.z - geometry.boundingBox.min.z),
            },
          },
          calculatedBy: options.calculatedBy,
        };

        const quantity = await this.quantityRepo.create(quantityData);
        quantities.push(quantity);
      }

      // Count elements that should be counted
      if (this.shouldCount(categoryLower)) {
        const quantityData: QuantityCreate = {
          projectId,
          elementId: element.id,
          category,
          quantityType: 'count',
          value: 1,
          unit: 'ea',
          wasteFactor: 0, // No waste factor for counts
          calculationMethod: 'count',
          metadata: {
            formula: 'count = 1',
            parameters: {},
          },
          calculatedBy: options.calculatedBy,
        };

        const quantity = await this.quantityRepo.create(quantityData);
        quantities.push(quantity);
      }
    } catch (error) {
      console.error(`Error calculating quantities for element ${element.id}:`, error);
      throw error;
    }

    return quantities;
  }

  /**
   * Recalculate a quantity with a new waste factor
   */
  async recalculateWithWasteFactor(quantityId: string, wasteFactor: number): Promise<Quantity> {
    const quantity = await this.quantityRepo.findById(quantityId);

    if (!quantity) {
      throw new Error(`Quantity ${quantityId} not found`);
    }

    const updated = await this.quantityRepo.update(quantityId, { wasteFactor });

    if (!updated) {
      throw new Error(`Failed to update quantity ${quantityId}`);
    }

    return updated;
  }

  /**
   * Calculate volume for an element
   */
  private calculateElementVolume(element: Element): number {
    const { boundingBox } = element.geometry;
    return calculateBoundingBoxVolume(boundingBox.min, boundingBox.max);
  }

  /**
   * Calculate area for an element
   */
  private calculateElementArea(element: Element): number {
    const { boundingBox } = element.geometry;
    return calculateBoundingBoxArea(boundingBox.min, boundingBox.max);
  }

  /**
   * Calculate length for an element
   */
  private calculateElementLength(element: Element): number {
    const { boundingBox } = element.geometry;
    return calculateDistance(boundingBox.min, boundingBox.max);
  }

  /**
   * Determine if volume should be calculated for this category
   */
  private shouldCalculateVolume(category: string): boolean {
    const volumeCategories = [
      'wall',
      'floor',
      'slab',
      'column',
      'beam',
      'foundation',
      'footing',
      'concrete',
    ];
    return volumeCategories.some((cat) => category.includes(cat));
  }

  /**
   * Determine if area should be calculated for this category
   */
  private shouldCalculateArea(category: string): boolean {
    const areaCategories = [
      'wall',
      'floor',
      'slab',
      'roof',
      'ceiling',
      'door',
      'window',
      'panel',
    ];
    return areaCategories.some((cat) => category.includes(cat));
  }

  /**
   * Determine if length should be calculated for this category
   */
  private shouldCalculateLength(category: string): boolean {
    const lengthCategories = [
      'beam',
      'column',
      'pipe',
      'duct',
      'cable',
      'conduit',
      'rebar',
      'truss',
    ];
    return lengthCategories.some((cat) => category.includes(cat));
  }

  /**
   * Determine if element should be counted
   */
  private shouldCount(category: string): boolean {
    const countCategories = [
      'door',
      'window',
      'fixture',
      'equipment',
      'furniture',
      'lighting',
      'outlet',
      'switch',
    ];
    return countCategories.some((cat) => category.includes(cat));
  }
}
