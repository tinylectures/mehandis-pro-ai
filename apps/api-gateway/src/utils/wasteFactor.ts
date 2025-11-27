/**
 * Waste Factor Utilities
 * Provides functions for applying waste factors to quantities
 */

/**
 * Apply waste factor to a base quantity
 * @param baseQuantity - The base quantity value
 * @param wasteFactor - The waste factor as a decimal (e.g., 0.1 for 10%)
 * @returns Adjusted quantity with waste factor applied
 */
export function applyWasteFactor(baseQuantity: number, wasteFactor: number): number {
  if (baseQuantity < 0) {
    throw new Error('Base quantity cannot be negative');
  }
  
  if (wasteFactor < 0) {
    throw new Error('Waste factor cannot be negative');
  }
  
  if (wasteFactor > 1) {
    throw new Error('Waste factor cannot exceed 100% (1.0)');
  }
  
  return baseQuantity * (1 + wasteFactor);
}

/**
 * Calculate the waste amount from a base quantity and waste factor
 * @param baseQuantity - The base quantity value
 * @param wasteFactor - The waste factor as a decimal
 * @returns The waste amount
 */
export function calculateWasteAmount(baseQuantity: number, wasteFactor: number): number {
  if (baseQuantity < 0) {
    throw new Error('Base quantity cannot be negative');
  }
  
  if (wasteFactor < 0) {
    throw new Error('Waste factor cannot be negative');
  }
  
  if (wasteFactor > 1) {
    throw new Error('Waste factor cannot exceed 100% (1.0)');
  }
  
  return baseQuantity * wasteFactor;
}

/**
 * Calculate waste factor from base and adjusted quantities
 * @param baseQuantity - The base quantity value
 * @param adjustedQuantity - The adjusted quantity value
 * @returns The waste factor as a decimal
 */
export function calculateWasteFactor(baseQuantity: number, adjustedQuantity: number): number {
  if (baseQuantity <= 0) {
    throw new Error('Base quantity must be positive');
  }
  
  if (adjustedQuantity < baseQuantity) {
    throw new Error('Adjusted quantity cannot be less than base quantity');
  }
  
  return (adjustedQuantity - baseQuantity) / baseQuantity;
}

/**
 * Get recommended waste factor for common material types
 * @param materialType - The type of material
 * @returns Recommended waste factor as a decimal
 */
export function getRecommendedWasteFactor(materialType: string): number {
  const wasteFactors: Record<string, number> = {
    concrete: 0.05,      // 5% waste
    rebar: 0.10,         // 10% waste
    lumber: 0.15,        // 15% waste
    drywall: 0.10,       // 10% waste
    brick: 0.05,         // 5% waste
    tile: 0.10,          // 10% waste
    paint: 0.05,         // 5% waste
    insulation: 0.10,    // 10% waste
    roofing: 0.10,       // 10% waste
    flooring: 0.10,      // 10% waste
  };
  
  const normalizedType = materialType.toLowerCase();
  return wasteFactors[normalizedType] || 0.10; // Default 10% if not found
}

/**
 * Apply multiple waste factors sequentially
 * @param baseQuantity - The base quantity value
 * @param wasteFactors - Array of waste factors to apply
 * @returns Final adjusted quantity
 */
export function applyMultipleWasteFactors(baseQuantity: number, wasteFactors: number[]): number {
  if (baseQuantity < 0) {
    throw new Error('Base quantity cannot be negative');
  }
  
  return wasteFactors.reduce((quantity, factor) => {
    return applyWasteFactor(quantity, factor);
  }, baseQuantity);
}
