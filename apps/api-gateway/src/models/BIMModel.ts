export type BIMFileType = 'revit' | 'ifc';
export type BIMModelStatus = 'uploading' | 'processing' | 'ready' | 'error';

export interface BIMModelMetadata {
  softwareVersion?: string;
  projectInfo?: Record<string, any>;
  elementCount?: number;
}

export interface BIMModel {
  id: string;
  projectId: string;
  fileName: string;
  fileSize: number;
  fileType: BIMFileType;
  storageUrl: string;
  status: BIMModelStatus;
  processingProgress: number;
  errorMessage?: string;
  metadata?: BIMModelMetadata;
  uploadedBy?: string;
  uploadedAt: Date;
  processedAt?: Date;
}

export interface BIMModelCreate {
  projectId: string;
  fileName: string;
  fileSize: number;
  fileType: BIMFileType;
  storageUrl: string;
  uploadedBy?: string;
}

export interface BIMModelUpdate {
  status?: BIMModelStatus;
  processingProgress?: number;
  errorMessage?: string;
  metadata?: BIMModelMetadata;
  processedAt?: Date;
}
