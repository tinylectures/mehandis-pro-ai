import { Knex } from 'knex';
import {
  Project,
  ProjectCreate,
  ProjectUpdate,
  ProjectTeamMember,
  ProjectTeamMemberCreate,
  ProjectFilters,
} from '../models/Project';

export interface IProjectRepository {
  create(data: ProjectCreate): Promise<Project>;
  findById(id: string): Promise<Project | null>;
  findAll(filters?: ProjectFilters): Promise<Project[]>;
  findByUser(userId: string, filters?: ProjectFilters): Promise<Project[]>;
  update(id: string, data: ProjectUpdate): Promise<Project | null>;
  delete(id: string): Promise<boolean>;
  addTeamMember(data: ProjectTeamMemberCreate): Promise<ProjectTeamMember>;
  removeTeamMember(projectId: string, userId: string): Promise<boolean>;
  getTeamMembers(projectId: string): Promise<ProjectTeamMember[]>;
  isUserOnProject(projectId: string, userId: string): Promise<boolean>;
}

export class ProjectRepository implements IProjectRepository {
  private db: Knex;
  private tableName = 'projects';
  private teamTableName = 'project_team_members';

  constructor(db: Knex) {
    this.db = db;
  }

  async create(data: ProjectCreate): Promise<Project> {
    const [project] = await this.db(this.tableName)
      .insert({
        name: data.name,
        description: data.description,
        location: JSON.stringify(data.location),
        client_name: data.clientName,
        start_date: data.startDate,
        end_date: data.endDate,
        status: data.status,
        organization_id: data.organizationId,
        created_by: data.createdBy,
      })
      .returning('*');

    return this.mapToProject(project);
  }

  async findById(id: string): Promise<Project | null> {
    const project = await this.db(this.tableName)
      .where({ id })
      .first();

    return project ? this.mapToProject(project) : null;
  }

  async findAll(filters?: ProjectFilters): Promise<Project[]> {
    let query = this.db(this.tableName).select('*');

    if (filters?.status) {
      query = query.where({ status: filters.status });
    }

    if (filters?.organizationId) {
      query = query.where({ organization_id: filters.organizationId });
    }

    const projects = await query;
    return projects.map(this.mapToProject);
  }

  async findByUser(userId: string, filters?: ProjectFilters): Promise<Project[]> {
    let query = this.db(this.tableName)
      .select(`${this.tableName}.*`)
      .join(
        this.teamTableName,
        `${this.tableName}.id`,
        '=',
        `${this.teamTableName}.project_id`
      )
      .where(`${this.teamTableName}.user_id`, userId);

    if (filters?.status) {
      query = query.where(`${this.tableName}.status`, filters.status);
    }

    if (filters?.organizationId) {
      query = query.where(`${this.tableName}.organization_id`, filters.organizationId);
    }

    const projects = await query;
    return projects.map(this.mapToProject);
  }

  async update(id: string, data: ProjectUpdate): Promise<Project | null> {
    const updateData: any = {
      updated_at: this.db.fn.now(),
    };

    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.location !== undefined) updateData.location = JSON.stringify(data.location);
    if (data.clientName !== undefined) updateData.client_name = data.clientName;
    if (data.startDate !== undefined) updateData.start_date = data.startDate;
    if (data.endDate !== undefined) updateData.end_date = data.endDate;
    if (data.status !== undefined) updateData.status = data.status;

    const [project] = await this.db(this.tableName)
      .where({ id })
      .update(updateData)
      .returning('*');

    return project ? this.mapToProject(project) : null;
  }

  async delete(id: string): Promise<boolean> {
    const count = await this.db(this.tableName)
      .where({ id })
      .delete();

    return count > 0;
  }

  async addTeamMember(data: ProjectTeamMemberCreate): Promise<ProjectTeamMember> {
    const [member] = await this.db(this.teamTableName)
      .insert({
        project_id: data.projectId,
        user_id: data.userId,
        role: data.role,
        assigned_by: data.assignedBy,
      })
      .returning('*');

    return this.mapToTeamMember(member);
  }

  async removeTeamMember(projectId: string, userId: string): Promise<boolean> {
    const count = await this.db(this.teamTableName)
      .where({ project_id: projectId, user_id: userId })
      .delete();

    return count > 0;
  }

  async getTeamMembers(projectId: string): Promise<ProjectTeamMember[]> {
    const members = await this.db(this.teamTableName)
      .where({ project_id: projectId })
      .select('*');

    return members.map(this.mapToTeamMember);
  }

  async isUserOnProject(projectId: string, userId: string): Promise<boolean> {
    const member = await this.db(this.teamTableName)
      .where({ project_id: projectId, user_id: userId })
      .first();

    return !!member;
  }

  private mapToProject(row: any): Project {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      location: typeof row.location === 'string' ? JSON.parse(row.location) : row.location,
      clientName: row.client_name,
      startDate: new Date(row.start_date),
      endDate: row.end_date ? new Date(row.end_date) : undefined,
      status: row.status,
      organizationId: row.organization_id,
      createdBy: row.created_by,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  private mapToTeamMember(row: any): ProjectTeamMember {
    return {
      id: row.id,
      projectId: row.project_id,
      userId: row.user_id,
      role: row.role,
      assignedAt: new Date(row.assigned_at),
      assignedBy: row.assigned_by,
    };
  }
}
