/**
 * Material-Specific Calculation Utilities
 * Provides functions for calculating material-specific quantities
 */

export interface RebarSpecification {
  length: number;        // Length in meters or feet
  diameter: number;      // Diameter in millimeters or inches
  density?: number;      // Density in kg/m³ or lb/ft³ (default: steel density)
}

export interface ConcreteSpecification {
  volume: number;        // Volume in cubic meters or cubic yards
  strength?: string;     // Concrete strength grade (e.g., '3000psi', 'C30')
  mixRatio?: string;     // Mix ratio (e.g., '1:2:4')
}

export interface SteelSpecification {
  length: number;        // Length in meters or feet
  width: number;         // Width in meters or feet
  thickness: number;     // Thickness in millimeters or inches
  density?: number;      // Density in kg/m³ or lb/ft³ (default: steel density)
}

// Material density constants (SI units: kg/m³)
export const MATERIAL_DENSITIES = {
  STEEL: 7850,           // kg/m³
  CONCRETE: 2400,        // kg/m³
  ALUMINUM: 2700,        // kg/m³
  COPPER: 8960,          // kg/m³
  TIMBER: 600,           // kg/m³ (average for softwood)
};

/**
 * Calculate weight of rebar
 * Formula: Weight = π × (diameter/2)² × length × density
 * @param spec - Rebar specification
 * @param unit - Unit system ('metric' or 'imperial')
 * @returns Weight in kg (metric) or lb (imperial)
 */
export function calculateRebarWeight(
  spec: RebarSpecification,
  unit: 'metric' | 'imperial' = 'metric'
): number {
  const { length, diameter, density } = spec;
  
  if (length <= 0) {
    throw new Error('Length must be positive');
  }
  
  if (diameter <= 0) {
    throw new Error('Diameter must be positive');
  }
  
  // Use provided density or default steel density
  const materialDensity = density || MATERIAL_DENSITIES.STEEL;
  
  if (unit === 'metric') {
    // diameter in mm, length in m, density in kg/m³
    const radiusInMeters = (diameter / 1000) / 2;
    const crossSectionalArea = Math.PI * radiusInMeters * radiusInMeters;
    return crossSectionalArea * length * materialDensity;
  } else {
    // imperial: diameter in inches, length in feet, density in lb/ft³
    const imperialDensity = density || 490; // lb/ft³ for steel
    const radiusInFeet = (diameter / 12) / 2;
    const crossSectionalArea = Math.PI * radiusInFeet * radiusInFeet;
    return crossSectionalArea * length * imperialDensity;
  }
}

/**
 * Calculate concrete volume with adjustments
 * @param spec - Concrete specification
 * @returns Volume in cubic units
 */
export function calculateConcreteVolume(spec: ConcreteSpecification): number {
  const { volume } = spec;
  
  if (volume <= 0) {
    throw new Error('Volume must be positive');
  }
  
  return volume;
}

/**
 * Calculate concrete weight
 * @param volume - Volume in cubic meters or cubic yards
 * @param unit - Unit system ('metric' or 'imperial')
 * @returns Weight in kg (metric) or lb (imperial)
 */
export function calculateConcreteWeight(
  volume: number,
  unit: 'metric' | 'imperial' = 'metric'
): number {
  if (volume <= 0) {
    throw new Error('Volume must be positive');
  }
  
  if (unit === 'metric') {
    // volume in m³, density in kg/m³
    return volume * MATERIAL_DENSITIES.CONCRETE;
  } else {
    // volume in yd³, density in lb/yd³
    const imperialDensity = 4050; // lb/yd³ for concrete
    return volume * imperialDensity;
  }
}

/**
 * Calculate number of concrete bags needed
 * @param volume - Volume in cubic meters or cubic yards
 * @param bagSize - Size of bag in kg or lb
 * @param unit - Unit system ('metric' or 'imperial')
 * @returns Number of bags needed
 */
export function calculateConcreteBags(
  volume: number,
  bagSize: number = 40,
  unit: 'metric' | 'imperial' = 'metric'
): number {
  if (volume <= 0) {
    throw new Error('Volume must be positive');
  }
  
  if (bagSize <= 0) {
    throw new Error('Bag size must be positive');
  }
  
  const weight = calculateConcreteWeight(volume, unit);
  return Math.ceil(weight / bagSize);
}

/**
 * Calculate steel plate weight
 * @param spec - Steel specification
 * @param unit - Unit system ('metric' or 'imperial')
 * @returns Weight in kg (metric) or lb (imperial)
 */
export function calculateSteelWeight(
  spec: SteelSpecification,
  unit: 'metric' | 'imperial' = 'metric'
): number {
  const { length, width, thickness, density } = spec;
  
  if (length <= 0 || width <= 0 || thickness <= 0) {
    throw new Error('All dimensions must be positive');
  }
  
  const materialDensity = density || MATERIAL_DENSITIES.STEEL;
  
  if (unit === 'metric') {
    // length and width in m, thickness in mm, density in kg/m³
    const thicknessInMeters = thickness / 1000;
    const volume = length * width * thicknessInMeters;
    return volume * materialDensity;
  } else {
    // length and width in ft, thickness in inches, density in lb/ft³
    const imperialDensity = density || 490; // lb/ft³ for steel
    const thicknessInFeet = thickness / 12;
    const volume = length * width * thicknessInFeet;
    return volume * imperialDensity;
  }
}

/**
 * Calculate rebar spacing for a given area
 * @param length - Length of area in meters or feet
 * @param width - Width of area in meters or feet
 * @param spacing - Spacing between rebars in meters or feet
 * @returns Number of rebars needed
 */
export function calculateRebarCount(length: number, width: number, spacing: number): number {
  if (length <= 0 || width <= 0 || spacing <= 0) {
    throw new Error('All dimensions must be positive');
  }
  
  // Calculate number of rebars in each direction
  const lengthwiseBars = Math.ceil(width / spacing) + 1;
  const widthwiseBars = Math.ceil(length / spacing) + 1;
  
  return lengthwiseBars + widthwiseBars;
}

/**
 * Calculate total rebar length for a mesh
 * @param areaLength - Length of area in meters or feet
 * @param areaWidth - Width of area in meters or feet
 * @param spacing - Spacing between rebars in meters or feet
 * @returns Total length of rebar needed
 */
export function calculateRebarMeshLength(
  areaLength: number,
  areaWidth: number,
  spacing: number
): number {
  if (areaLength <= 0 || areaWidth <= 0 || spacing <= 0) {
    throw new Error('All dimensions must be positive');
  }
  
  // Calculate number of rebars in each direction
  const lengthwiseBars = Math.ceil(areaWidth / spacing) + 1;
  const widthwiseBars = Math.ceil(areaLength / spacing) + 1;
  
  // Calculate total length
  const lengthwiseTotal = lengthwiseBars * areaLength;
  const widthwiseTotal = widthwiseBars * areaWidth;
  
  return lengthwiseTotal + widthwiseTotal;
}

/**
 * Calculate concrete mix components
 * @param volume - Total concrete volume in cubic meters or cubic yards
 * @param ratio - Mix ratio as string (e.g., '1:2:4' for cement:sand:aggregate)
 * @returns Object with cement, sand, and aggregate volumes
 */
export function calculateConcreteMix(
  volume: number,
  ratio: string = '1:2:4'
): { cement: number; sand: number; aggregate: number } {
  if (volume <= 0) {
    throw new Error('Volume must be positive');
  }
  
  const parts = ratio.split(':').map(Number);
  
  if (parts.length !== 3 || parts.some(p => isNaN(p) || p <= 0)) {
    throw new Error('Invalid mix ratio format. Expected format: "1:2:4"');
  }
  
  const [cementParts, sandParts, aggregateParts] = parts;
  const totalParts = cementParts + sandParts + aggregateParts;
  
  return {
    cement: (volume * cementParts) / totalParts,
    sand: (volume * sandParts) / totalParts,
    aggregate: (volume * aggregateParts) / totalParts,
  };
}
