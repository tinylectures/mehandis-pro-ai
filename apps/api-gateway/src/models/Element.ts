export type GeometryType = 'solid' | 'surface' | 'curve';

export interface BoundingBox {
  min: { x: number; y: number; z: number };
  max: { x: number; y: number; z: number };
}

export interface ElementGeometry {
  type: GeometryType;
  boundingBox: BoundingBox;
  vertices?: number[][];
  faces?: number[][];
}

export interface Element {
  id: string;
  modelId: string;
  externalId: string;
  category: string;
  familyName?: string;
  typeName?: string;
  level?: string;
  geometry: ElementGeometry;
  properties?: Record<string, any>;
  materialIds: string[];
  createdAt: Date;
}

export interface ElementCreate {
  modelId: string;
  externalId: string;
  category: string;
  familyName?: string;
  typeName?: string;
  level?: string;
  geometry: ElementGeometry;
  properties?: Record<string, any>;
  materialIds: string[];
}

export interface ElementFilters {
  modelId?: string;
  category?: string;
  level?: string;
}
