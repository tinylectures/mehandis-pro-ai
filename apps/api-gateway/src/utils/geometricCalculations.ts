/**
 * Geometric Calculation Utilities
 * Provides functions for calculating volumes, areas, and lengths for construction elements
 */

export interface RectangularDimensions {
  length: number;
  width: number;
  height: number;
}

export interface CylindricalDimensions {
  radius: number;
  height: number;
}

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

/**
 * Calculate volume of a rectangular solid
 * @param dimensions - Length, width, and height
 * @returns Volume in cubic units
 */
export function calculateRectangularVolume(dimensions: RectangularDimensions): number {
  const { length, width, height } = dimensions;
  
  if (length <= 0 || width <= 0 || height <= 0) {
    throw new Error('All dimensions must be positive numbers');
  }
  
  return length * width * height;
}

/**
 * Calculate volume of a cylinder
 * @param dimensions - Radius and height
 * @returns Volume in cubic units
 */
export function calculateCylindricalVolume(dimensions: CylindricalDimensions): number {
  const { radius, height } = dimensions;
  
  if (radius <= 0 || height <= 0) {
    throw new Error('Radius and height must be positive numbers');
  }
  
  return Math.PI * radius * radius * height;
}

/**
 * Calculate area of a rectangle
 * @param length - Length of rectangle
 * @param width - Width of rectangle
 * @returns Area in square units
 */
export function calculateRectangularArea(length: number, width: number): number {
  if (length <= 0 || width <= 0) {
    throw new Error('Length and width must be positive numbers');
  }
  
  return length * width;
}

/**
 * Calculate area of a circle
 * @param radius - Radius of circle
 * @returns Area in square units
 */
export function calculateCircularArea(radius: number): number {
  if (radius <= 0) {
    throw new Error('Radius must be a positive number');
  }
  
  return Math.PI * radius * radius;
}

/**
 * Calculate surface area of a cylinder
 * @param dimensions - Radius and height
 * @returns Surface area in square units
 */
export function calculateCylindricalSurfaceArea(dimensions: CylindricalDimensions): number {
  const { radius, height } = dimensions;
  
  if (radius <= 0 || height <= 0) {
    throw new Error('Radius and height must be positive numbers');
  }
  
  // Surface area = 2πr² + 2πrh (top + bottom + lateral)
  return 2 * Math.PI * radius * radius + 2 * Math.PI * radius * height;
}

/**
 * Calculate distance between two 3D points
 * @param point1 - First point
 * @param point2 - Second point
 * @returns Distance in linear units
 */
export function calculateDistance(point1: Point3D, point2: Point3D): number {
  const dx = point2.x - point1.x;
  const dy = point2.y - point1.y;
  const dz = point2.z - point1.z;
  
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Calculate perimeter of a rectangle
 * @param length - Length of rectangle
 * @param width - Width of rectangle
 * @returns Perimeter in linear units
 */
export function calculateRectangularPerimeter(length: number, width: number): number {
  if (length <= 0 || width <= 0) {
    throw new Error('Length and width must be positive numbers');
  }
  
  return 2 * (length + width);
}

/**
 * Calculate circumference of a circle
 * @param radius - Radius of circle
 * @returns Circumference in linear units
 */
export function calculateCircumference(radius: number): number {
  if (radius <= 0) {
    throw new Error('Radius must be a positive number');
  }
  
  return 2 * Math.PI * radius;
}

/**
 * Calculate volume from bounding box
 * @param min - Minimum point of bounding box
 * @param max - Maximum point of bounding box
 * @returns Volume in cubic units
 */
export function calculateBoundingBoxVolume(min: Point3D, max: Point3D): number {
  const length = Math.abs(max.x - min.x);
  const width = Math.abs(max.y - min.y);
  const height = Math.abs(max.z - min.z);
  
  return calculateRectangularVolume({ length, width, height });
}

/**
 * Calculate area from bounding box (XY plane projection)
 * @param min - Minimum point of bounding box
 * @param max - Maximum point of bounding box
 * @returns Area in square units
 */
export function calculateBoundingBoxArea(min: Point3D, max: Point3D): number {
  const length = Math.abs(max.x - min.x);
  const width = Math.abs(max.y - min.y);
  
  return calculateRectangularArea(length, width);
}

/**
 * Calculate volume of a triangular prism
 * @param baseLength - Length of triangle base
 * @param baseHeight - Height of triangle
 * @param prismHeight - Height of prism
 * @returns Volume in cubic units
 */
export function calculateTriangularPrismVolume(
  baseLength: number,
  baseHeight: number,
  prismHeight: number
): number {
  if (baseLength <= 0 || baseHeight <= 0 || prismHeight <= 0) {
    throw new Error('All dimensions must be positive numbers');
  }
  
  const triangleArea = (baseLength * baseHeight) / 2;
  return triangleArea * prismHeight;
}

/**
 * Calculate volume of a sphere
 * @param radius - Radius of sphere
 * @returns Volume in cubic units
 */
export function calculateSphereVolume(radius: number): number {
  if (radius <= 0) {
    throw new Error('Radius must be a positive number');
  }
  
  return (4 / 3) * Math.PI * radius * radius * radius;
}

/**
 * Calculate surface area of a sphere
 * @param radius - Radius of sphere
 * @returns Surface area in square units
 */
export function calculateSphereSurfaceArea(radius: number): number {
  if (radius <= 0) {
    throw new Error('Radius must be a positive number');
  }
  
  return 4 * Math.PI * radius * radius;
}
