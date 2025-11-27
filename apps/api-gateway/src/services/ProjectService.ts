import { IProjectRepository } from '../repositories/ProjectRepository';
import { IVersionHistoryRepository } from '../repositories/VersionHistoryRepository';
import {
  Project,
  ProjectCreate,
  ProjectUpdate,
  ProjectFilters,
  ProjectTeamMemberCreate,
  ProjectTeamMember,
} from '../models/Project';
import { VersionHistory } from '../models/VersionHistory';

export class ProjectService {
  private projectRepository: IProjectRepository;
  private versionHistoryRepository?: IVersionHistoryRepository;

  constructor(
    projectRepository: IProjectRepository,
    versionHistoryRepository?: IVersionHistoryRepository
  ) {
    this.projectRepository = projectRepository;
    this.versionHistoryRepository = versionHistoryRepository;
  }

  /**
   * Create a new project
   * Validates: Requirements 2.1
   */
  async createProject(data: ProjectCreate): Promise<Project> {
    // Validate required fields
    if (!data.name || data.name.trim().length === 0) {
      throw new Error('Project name is required');
    }

    if (!data.location || !data.location.address || !data.location.city) {
      throw new Error('Project location with address and city is required');
    }

    if (!data.startDate) {
      throw new Error('Project start date is required');
    }

    if (!data.organizationId) {
      throw new Error('Organization ID is required');
    }

    // Create the project
    const project = await this.projectRepository.create(data);

    // If createdBy is provided, automatically add them as owner
    if (data.createdBy) {
      await this.projectRepository.addTeamMember({
        projectId: project.id,
        userId: data.createdBy,
        role: 'owner',
        assignedBy: data.createdBy,
      });
    }

    return project;
  }

  /**
   * Get a project by ID
   */
  async getProject(projectId: string, userId?: string): Promise<Project> {
    const project = await this.projectRepository.findById(projectId);

    if (!project) {
      throw new Error('Project not found');
    }

    // If userId is provided, verify user has access
    if (userId) {
      const hasAccess = await this.projectRepository.isUserOnProject(projectId, userId);
      if (!hasAccess) {
        throw new Error('Access denied to this project');
      }
    }

    return project;
  }

  /**
   * Get projects with filtering
   * Validates: Requirements 2.3
   */
  async getProjects(filters?: ProjectFilters): Promise<Project[]> {
    if (filters?.userId) {
      // Get projects user has access to
      return await this.projectRepository.findByUser(filters.userId, filters);
    }

    return await this.projectRepository.findAll(filters);
  }

  /**
   * Update a project
   * Validates: Requirements 2.4
   */
  async updateProject(
    projectId: string,
    data: ProjectUpdate,
    userId?: string,
    changeDescription?: string
  ): Promise<Project> {
    // Verify project exists
    const existingProject = await this.projectRepository.findById(projectId);
    if (!existingProject) {
      throw new Error('Project not found');
    }

    // If userId is provided, verify user has access
    if (userId) {
      const hasAccess = await this.projectRepository.isUserOnProject(projectId, userId);
      if (!hasAccess) {
        throw new Error('Access denied to this project');
      }
    }

    // Create version history entry before updating
    if (this.versionHistoryRepository) {
      const latestVersion = await this.versionHistoryRepository.getLatestVersion(
        'project',
        projectId
      );
      const newVersion = latestVersion + 1;

      // Calculate changes
      const changes: any = {};
      if (data.name !== undefined && data.name !== existingProject.name) {
        changes.name = { from: existingProject.name, to: data.name };
      }
      if (data.description !== undefined && data.description !== existingProject.description) {
        changes.description = { from: existingProject.description, to: data.description };
      }
      if (data.status !== undefined && data.status !== existingProject.status) {
        changes.status = { from: existingProject.status, to: data.status };
      }
      if (data.clientName !== undefined && data.clientName !== existingProject.clientName) {
        changes.clientName = { from: existingProject.clientName, to: data.clientName };
      }

      await this.versionHistoryRepository.create({
        entityType: 'project',
        entityId: projectId,
        versionNumber: newVersion,
        data: existingProject,
        changes: Object.keys(changes).length > 0 ? changes : undefined,
        changedBy: userId,
        changeDescription,
      });
    }

    // Update the project
    const updatedProject = await this.projectRepository.update(projectId, data);

    if (!updatedProject) {
      throw new Error('Failed to update project');
    }

    return updatedProject;
  }

  /**
   * Archive a project
   * Validates: Requirements 2.5
   */
  async archiveProject(projectId: string, userId?: string): Promise<Project> {
    // Verify project exists
    const existingProject = await this.projectRepository.findById(projectId);
    if (!existingProject) {
      throw new Error('Project not found');
    }

    // If userId is provided, verify user has access
    if (userId) {
      const hasAccess = await this.projectRepository.isUserOnProject(projectId, userId);
      if (!hasAccess) {
        throw new Error('Access denied to this project');
      }
    }

    // Archive by updating status
    const archivedProject = await this.projectRepository.update(projectId, {
      status: 'archived',
    });

    if (!archivedProject) {
      throw new Error('Failed to archive project');
    }

    return archivedProject;
  }

  /**
   * Delete a project (hard delete)
   */
  async deleteProject(projectId: string, userId?: string): Promise<void> {
    // Verify project exists
    const existingProject = await this.projectRepository.findById(projectId);
    if (!existingProject) {
      throw new Error('Project not found');
    }

    // If userId is provided, verify user has access
    if (userId) {
      const hasAccess = await this.projectRepository.isUserOnProject(projectId, userId);
      if (!hasAccess) {
        throw new Error('Access denied to this project');
      }
    }

    const deleted = await this.projectRepository.delete(projectId);

    if (!deleted) {
      throw new Error('Failed to delete project');
    }
  }

  /**
   * Assign a team member to a project
   * Validates: Requirements 2.2
   */
  async assignTeamMember(data: ProjectTeamMemberCreate): Promise<ProjectTeamMember> {
    // Verify project exists
    const project = await this.projectRepository.findById(data.projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    // Check if user is already on the project
    const isAlreadyMember = await this.projectRepository.isUserOnProject(
      data.projectId,
      data.userId
    );

    if (isAlreadyMember) {
      throw new Error('User is already a member of this project');
    }

    return await this.projectRepository.addTeamMember(data);
  }

  /**
   * Remove a team member from a project
   * Validates: Requirements 2.2
   */
  async removeTeamMember(projectId: string, userId: string): Promise<void> {
    // Verify project exists
    const project = await this.projectRepository.findById(projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    const removed = await this.projectRepository.removeTeamMember(projectId, userId);

    if (!removed) {
      throw new Error('Failed to remove team member or user not found on project');
    }
  }

  /**
   * Get team members for a project
   */
  async getTeamMembers(projectId: string): Promise<ProjectTeamMember[]> {
    // Verify project exists
    const project = await this.projectRepository.findById(projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    return await this.projectRepository.getTeamMembers(projectId);
  }

  /**
   * Get project statistics for dashboard
   * Validates: Requirements 2.3
   */
  async getProjectStatistics(projectId: string): Promise<{
    teamMemberCount: number;
    status: string;
    daysActive: number;
  }> {
    const project = await this.projectRepository.findById(projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    const teamMembers = await this.projectRepository.getTeamMembers(projectId);
    const daysActive = Math.floor(
      (new Date().getTime() - project.createdAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    return {
      teamMemberCount: teamMembers.length,
      status: project.status,
      daysActive,
    };
  }

  /**
   * Get version history for a project
   * Validates: Requirements 10.3
   */
  async getVersionHistory(projectId: string): Promise<VersionHistory[]> {
    if (!this.versionHistoryRepository) {
      throw new Error('Version history not enabled');
    }

    // Verify project exists
    const project = await this.projectRepository.findById(projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    return await this.versionHistoryRepository.findByEntity('project', projectId);
  }

  /**
   * Get a specific version of a project
   * Validates: Requirements 10.3
   */
  async getProjectVersion(projectId: string, versionNumber: number): Promise<VersionHistory | null> {
    if (!this.versionHistoryRepository) {
      throw new Error('Version history not enabled');
    }

    // Verify project exists
    const project = await this.projectRepository.findById(projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    return await this.versionHistoryRepository.findByEntityAndVersion(
      'project',
      projectId,
      versionNumber
    );
  }

  /**
   * Restore a project to a previous version
   * Validates: Requirements 10.4
   */
  async restoreProjectVersion(
    projectId: string,
    versionNumber: number,
    userId?: string
  ): Promise<Project> {
    if (!this.versionHistoryRepository) {
      throw new Error('Version history not enabled');
    }

    // Verify project exists
    const currentProject = await this.projectRepository.findById(projectId);
    if (!currentProject) {
      throw new Error('Project not found');
    }

    // If userId is provided, verify user has access
    if (userId) {
      const hasAccess = await this.projectRepository.isUserOnProject(projectId, userId);
      if (!hasAccess) {
        throw new Error('Access denied to this project');
      }
    }

    // Get the version to restore
    const versionToRestore = await this.versionHistoryRepository.findByEntityAndVersion(
      'project',
      projectId,
      versionNumber
    );

    if (!versionToRestore) {
      throw new Error('Version not found');
    }

    // Create a new version entry for the current state before restoring
    const latestVersion = await this.versionHistoryRepository.getLatestVersion('project', projectId);
    const newVersion = latestVersion + 1;

    await this.versionHistoryRepository.create({
      entityType: 'project',
      entityId: projectId,
      versionNumber: newVersion,
      data: currentProject,
      changedBy: userId,
      changeDescription: `Restored to version ${versionNumber}`,
    });

    // Restore the project data
    const restoredData = versionToRestore.data as Project;
    const updateData: ProjectUpdate = {
      name: restoredData.name,
      description: restoredData.description,
      location: restoredData.location,
      clientName: restoredData.clientName,
      startDate: restoredData.startDate,
      endDate: restoredData.endDate,
      status: restoredData.status,
    };

    const restoredProject = await this.projectRepository.update(projectId, updateData);

    if (!restoredProject) {
      throw new Error('Failed to restore project');
    }

    return restoredProject;
  }
}
