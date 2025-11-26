import { Knex } from 'knex';
import { Organization, OrganizationCreate, OrganizationUpdate } from '../models/Organization';

export interface IOrganizationRepository {
  create(data: OrganizationCreate): Promise<Organization>;
  findById(id: string): Promise<Organization | null>;
  findAll(): Promise<Organization[]>;
  update(id: string, data: OrganizationUpdate): Promise<Organization | null>;
  delete(id: string): Promise<boolean>;
}

export class OrganizationRepository implements IOrganizationRepository {
  private db: Knex;
  private tableName = 'organizations';

  constructor(db: Knex) {
    this.db = db;
  }

  async create(data: OrganizationCreate): Promise<Organization> {
    const [organization] = await this.db(this.tableName)
      .insert({
        name: data.name,
        description: data.description,
        address: data.address,
        phone: data.phone,
        email: data.email,
      })
      .returning('*');

    return this.mapToOrganization(organization);
  }

  async findById(id: string): Promise<Organization | null> {
    const organization = await this.db(this.tableName)
      .where({ id })
      .first();

    return organization ? this.mapToOrganization(organization) : null;
  }

  async findAll(): Promise<Organization[]> {
    const organizations = await this.db(this.tableName)
      .where({ is_active: true })
      .select('*');

    return organizations.map(this.mapToOrganization);
  }

  async update(id: string, data: OrganizationUpdate): Promise<Organization | null> {
    const updateData: any = {
      updated_at: this.db.fn.now(),
    };

    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.address !== undefined) updateData.address = data.address;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.isActive !== undefined) updateData.is_active = data.isActive;

    const [organization] = await this.db(this.tableName)
      .where({ id })
      .update(updateData)
      .returning('*');

    return organization ? this.mapToOrganization(organization) : null;
  }

  async delete(id: string): Promise<boolean> {
    const count = await this.db(this.tableName)
      .where({ id })
      .delete();

    return count > 0;
  }

  private mapToOrganization(row: any): Organization {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      address: row.address,
      phone: row.phone,
      email: row.email,
      isActive: row.is_active,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}
