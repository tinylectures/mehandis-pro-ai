/**
 * Unit Conversion System
 * Provides functions for converting between imperial and metric units
 */

export type LengthUnit = 'mm' | 'cm' | 'm' | 'km' | 'in' | 'ft' | 'yd' | 'mi';
export type AreaUnit = 'mm2' | 'cm2' | 'm2' | 'km2' | 'in2' | 'ft2' | 'yd2' | 'ac' | 'mi2';
export type VolumeUnit = 'mm3' | 'cm3' | 'm3' | 'l' | 'in3' | 'ft3' | 'yd3' | 'gal';
export type MassUnit = 'mg' | 'g' | 'kg' | 't' | 'oz' | 'lb' | 'ton';

export type Unit = LengthUnit | AreaUnit | VolumeUnit | MassUnit;

// Conversion factors to base units (meters, square meters, cubic meters, kilograms)
const LENGTH_TO_METERS: Record<LengthUnit, number> = {
  mm: 0.001,
  cm: 0.01,
  m: 1,
  km: 1000,
  in: 0.0254,
  ft: 0.3048,
  yd: 0.9144,
  mi: 1609.344,
};

const AREA_TO_SQUARE_METERS: Record<AreaUnit, number> = {
  mm2: 0.000001,
  cm2: 0.0001,
  m2: 1,
  km2: 1000000,
  in2: 0.00064516,
  ft2: 0.09290304,
  yd2: 0.83612736,
  ac: 4046.8564224,
  mi2: 2589988.110336,
};

const VOLUME_TO_CUBIC_METERS: Record<VolumeUnit, number> = {
  mm3: 0.000000001,
  cm3: 0.000001,
  m3: 1,
  l: 0.001,
  in3: 0.000016387064,
  ft3: 0.028316846592,
  yd3: 0.764554857984,
  gal: 0.003785411784,
};

const MASS_TO_KILOGRAMS: Record<MassUnit, number> = {
  mg: 0.000001,
  g: 0.001,
  kg: 1,
  t: 1000,
  oz: 0.028349523125,
  lb: 0.45359237,
  ton: 907.18474,
};

/**
 * Convert length between units
 * @param value - The value to convert
 * @param fromUnit - The source unit
 * @param toUnit - The target unit
 * @returns Converted value
 */
export function convertLength(value: number, fromUnit: LengthUnit, toUnit: LengthUnit): number {
  if (value < 0) {
    throw new Error('Value cannot be negative');
  }
  
  if (fromUnit === toUnit) {
    return value;
  }
  
  // Convert to base unit (meters) then to target unit
  const valueInMeters = value * LENGTH_TO_METERS[fromUnit];
  return valueInMeters / LENGTH_TO_METERS[toUnit];
}

/**
 * Convert area between units
 * @param value - The value to convert
 * @param fromUnit - The source unit
 * @param toUnit - The target unit
 * @returns Converted value
 */
export function convertArea(value: number, fromUnit: AreaUnit, toUnit: AreaUnit): number {
  if (value < 0) {
    throw new Error('Value cannot be negative');
  }
  
  if (fromUnit === toUnit) {
    return value;
  }
  
  // Convert to base unit (square meters) then to target unit
  const valueInSquareMeters = value * AREA_TO_SQUARE_METERS[fromUnit];
  return valueInSquareMeters / AREA_TO_SQUARE_METERS[toUnit];
}

/**
 * Convert volume between units
 * @param value - The value to convert
 * @param fromUnit - The source unit
 * @param toUnit - The target unit
 * @returns Converted value
 */
export function convertVolume(value: number, fromUnit: VolumeUnit, toUnit: VolumeUnit): number {
  if (value < 0) {
    throw new Error('Value cannot be negative');
  }
  
  if (fromUnit === toUnit) {
    return value;
  }
  
  // Convert to base unit (cubic meters) then to target unit
  const valueInCubicMeters = value * VOLUME_TO_CUBIC_METERS[fromUnit];
  return valueInCubicMeters / VOLUME_TO_CUBIC_METERS[toUnit];
}

/**
 * Convert mass between units
 * @param value - The value to convert
 * @param fromUnit - The source unit
 * @param toUnit - The target unit
 * @returns Converted value
 */
export function convertMass(value: number, fromUnit: MassUnit, toUnit: MassUnit): number {
  if (value < 0) {
    throw new Error('Value cannot be negative');
  }
  
  if (fromUnit === toUnit) {
    return value;
  }
  
  // Convert to base unit (kilograms) then to target unit
  const valueInKilograms = value * MASS_TO_KILOGRAMS[fromUnit];
  return valueInKilograms / MASS_TO_KILOGRAMS[toUnit];
}

/**
 * Generic unit conversion function
 * @param value - The value to convert
 * @param fromUnit - The source unit
 * @param toUnit - The target unit
 * @returns Converted value
 */
export function convertUnit(value: number, fromUnit: Unit, toUnit: Unit): number {
  // Determine unit type and call appropriate conversion function
  if (fromUnit in LENGTH_TO_METERS && toUnit in LENGTH_TO_METERS) {
    return convertLength(value, fromUnit as LengthUnit, toUnit as LengthUnit);
  }
  
  if (fromUnit in AREA_TO_SQUARE_METERS && toUnit in AREA_TO_SQUARE_METERS) {
    return convertArea(value, fromUnit as AreaUnit, toUnit as AreaUnit);
  }
  
  if (fromUnit in VOLUME_TO_CUBIC_METERS && toUnit in VOLUME_TO_CUBIC_METERS) {
    return convertVolume(value, fromUnit as VolumeUnit, toUnit as VolumeUnit);
  }
  
  if (fromUnit in MASS_TO_KILOGRAMS && toUnit in MASS_TO_KILOGRAMS) {
    return convertMass(value, fromUnit as MassUnit, toUnit as MassUnit);
  }
  
  throw new Error(`Cannot convert from ${fromUnit} to ${toUnit}: incompatible unit types`);
}

/**
 * Get the unit type for a given unit
 * @param unit - The unit to check
 * @returns The unit type
 */
export function getUnitType(unit: Unit): 'length' | 'area' | 'volume' | 'mass' {
  if (unit in LENGTH_TO_METERS) return 'length';
  if (unit in AREA_TO_SQUARE_METERS) return 'area';
  if (unit in VOLUME_TO_CUBIC_METERS) return 'volume';
  if (unit in MASS_TO_KILOGRAMS) return 'mass';
  throw new Error(`Unknown unit: ${unit}`);
}

/**
 * Check if two units are compatible for conversion
 * @param unit1 - First unit
 * @param unit2 - Second unit
 * @returns True if units can be converted between each other
 */
export function areUnitsCompatible(unit1: Unit, unit2: Unit): boolean {
  try {
    const type1 = getUnitType(unit1);
    const type2 = getUnitType(unit2);
    return type1 === type2;
  } catch {
    return false;
  }
}

/**
 * Format a value with its unit
 * @param value - The numeric value
 * @param unit - The unit
 * @param precision - Number of decimal places (default: 2)
 * @returns Formatted string
 */
export function formatWithUnit(value: number, unit: Unit, precision: number = 2): string {
  return `${value.toFixed(precision)} ${unit}`;
}

/**
 * Convert common construction units
 */
export const CommonConversions = {
  // Length conversions
  feetToMeters: (feet: number) => convertLength(feet, 'ft', 'm'),
  metersToFeet: (meters: number) => convertLength(meters, 'm', 'ft'),
  inchesToMillimeters: (inches: number) => convertLength(inches, 'in', 'mm'),
  millimetersToInches: (mm: number) => convertLength(mm, 'mm', 'in'),
  
  // Area conversions
  squareFeetToSquareMeters: (sqft: number) => convertArea(sqft, 'ft2', 'm2'),
  squareMetersToSquareFeet: (sqm: number) => convertArea(sqm, 'm2', 'ft2'),
  
  // Volume conversions
  cubicYardsToCubicMeters: (cy: number) => convertVolume(cy, 'yd3', 'm3'),
  cubicMetersToCubicYards: (cm: number) => convertVolume(cm, 'm3', 'yd3'),
  cubicFeetToCubicMeters: (cf: number) => convertVolume(cf, 'ft3', 'm3'),
  cubicMetersToCubicFeet: (cm: number) => convertVolume(cm, 'm3', 'ft3'),
  
  // Mass conversions
  poundsToKilograms: (lbs: number) => convertMass(lbs, 'lb', 'kg'),
  kilogramsToPounds: (kg: number) => convertMass(kg, 'kg', 'lb'),
  tonsToMetricTons: (tons: number) => convertMass(tons, 'ton', 't'),
  metricTonsToTons: (mt: number) => convertMass(mt, 't', 'ton'),
};
