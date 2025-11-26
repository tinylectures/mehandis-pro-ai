export type ProjectStatus = 'planning' | 'active' | 'on_hold' | 'completed' | 'archived';
export type ProjectRole = 'owner' | 'manager' | 'surveyor' | 'viewer';

export interface ProjectLocation {
  address: string;
  city: string;
  region: string;
  country: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  location: ProjectLocation;
  clientName?: string;
  startDate: Date;
  endDate?: Date;
  status: ProjectStatus;
  organizationId: string;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectCreate {
  name: string;
  description?: string;
  location: ProjectLocation;
  clientName?: string;
  startDate: Date;
  endDate?: Date;
  status: ProjectStatus;
  organizationId: string;
  createdBy?: string;
}

export interface ProjectUpdate {
  name?: string;
  description?: string;
  location?: ProjectLocation;
  clientName?: string;
  startDate?: Date;
  endDate?: Date;
  status?: ProjectStatus;
}

export interface ProjectTeamMember {
  id: string;
  projectId: string;
  userId: string;
  role: ProjectRole;
  assignedAt: Date;
  assignedBy?: string;
}

export interface ProjectTeamMemberCreate {
  projectId: string;
  userId: string;
  role: ProjectRole;
  assignedBy?: string;
}

export interface ProjectFilters {
  status?: ProjectStatus;
  organizationId?: string;
  userId?: string;
}
