export interface Organization {
  id: string;
  name: string;
  description?: string;
  address?: string;
  phone?: string;
  email?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrganizationCreate {
  name: string;
  description?: string;
  address?: string;
  phone?: string;
  email?: string;
}

export interface OrganizationUpdate {
  name?: string;
  description?: string;
  address?: string;
  phone?: string;
  email?: string;
  isActive?: boolean;
}
