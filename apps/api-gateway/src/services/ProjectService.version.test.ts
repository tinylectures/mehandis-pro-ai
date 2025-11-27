import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProjectService } from './ProjectService';
import { ProjectRepository, IProjectRepository } from '../repositories/ProjectRepository';
import { VersionHistoryRepository, IVersionHistoryRepository } from '../repositories/VersionHistoryRepository';
import { Project, ProjectCreate, ProjectUpdate } from '../models/Project';
import { VersionHistory, VersionHistoryCreate } from '../models/VersionHistory';

// Mock ProjectRepository
const createMockProjectRepository = (): IProjectRepository => {
  const mockProjects = new Map<string, Project>();
  
  return {
    create: vi.fn(async (data: ProjectCreate): Promise<Project> => {
      const project: Project = {
        id: 'test-project-id',
        name: data.name,
        description: data.description,
        location: data.location,
        clientName: data.clientName,
        startDate: data.startDate,
        endDate: data.endDate,
        status: data.status,
        organizationId: data.organizationId,
        createdBy: data.createdBy,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockProjects.set(project.id, project);
      return project;
    }),
    findById: vi.fn(async (id: string): Promise<Project | null> => {
      return mockProjects.get(id) || null;
    }),
    findAll: vi.fn(async (): Promise<Project[]> => {
      return Array.from(mockProjects.values());
    }),
    findByUser: vi.fn(async (): Promise<Project[]> => {
      return Array.from(mockProjects.values());
    }),
    update: vi.fn(async (id: string, data: ProjectUpdate): Promise<Project | null> => {
      const project = mockProjects.get(id);
      if (!project) return null;
      
      const updatedProject: Project = {
        ...project,
        ...data,
        updatedAt: new Date(),
      };
      mockProjects.set(id, updatedProject);
      return updatedProject;
    }),
    delete: vi.fn(async (id: string): Promise<boolean> => {
      return mockProjects.delete(id);
    }),
    addTeamMember: vi.fn(async () => ({
      id: 'team-member-id',
      projectId: 'test-project-id',
      userId: 'user-id',
      role: 'owner' as const,
      assignedAt: new Date(),
    })),
    removeTeamMember: vi.fn(async (): Promise<boolean> => true),
    getTeamMembers: vi.fn(async () => []),
    isUserOnProject: vi.fn(async (): Promise<boolean> => true),
  } as any;
};

// Mock VersionHistoryRepository
const createMockVersionHistoryRepository = (): IVersionHistoryRepository => {
  const mockVersions = new Map<string, VersionHistory[]>();
  
  return {
    create: vi.fn(async (data: VersionHistoryCreate): Promise<VersionHistory> => {
      const version: VersionHistory = {
        id: `version-${Date.now()}`,
        entityType: data.entityType,
        entityId: data.entityId,
        versionNumber: data.versionNumber,
        data: data.data,
        changes: data.changes,
        changedBy: data.changedBy,
        createdAt: new Date(),
        changeDescription: data.changeDescription,
      };
      
      const key = `${data.entityType}-${data.entityId}`;
      const versions = mockVersions.get(key) || [];
      versions.push(version);
      mockVersions.set(key, versions);
      
      return version;
    }),
    findByEntity: vi.fn(async (entityType, entityId): Promise<VersionHistory[]> => {
      const key = `${entityType}-${entityId}`;
      return mockVersions.get(key) || [];
    }),
    findByEntityAndVersion: vi.fn(async (entityType, entityId, versionNumber): Promise<VersionHistory | null> => {
      const key = `${entityType}-${entityId}`;
      const versions = mockVersions.get(key) || [];
      return versions.find(v => v.versionNumber === versionNumber) || null;
    }),
    getLatestVersion: vi.fn(async (entityType, entityId): Promise<number> => {
      const key = `${entityType}-${entityId}`;
      const versions = mockVersions.get(key) || [];
      if (versions.length === 0) return 0;
      return Math.max(...versions.map(v => v.versionNumber));
    }),
  } as any;
};

describe('ProjectService - Version History', () => {
  let projectService: ProjectService;
  let mockProjectRepository: IProjectRepository;
  let mockVersionHistoryRepository: IVersionHistoryRepository;

  beforeEach(() => {
    mockProjectRepository = createMockProjectRepository();
    mockVersionHistoryRepository = createMockVersionHistoryRepository();
    projectService = new ProjectService(mockProjectRepository, mockVersionHistoryRepository);
  });

  describe('updateProject with version tracking', () => {
    it('should create version history entry when updating project', async () => {
      // Create a project first
      const projectData: ProjectCreate = {
        name: 'Test Project',
        description: 'Initial description',
        location: {
          address: '123 Main St',
          city: 'Test City',
          region: 'Test Region',
          country: 'Test Country',
        },
        clientName: 'Test Client',
        startDate: new Date('2024-01-01'),
        status: 'planning',
        organizationId: 'org-123',
        createdBy: 'user-123',
      };
      
      const project = await projectService.createProject(projectData);

      // Update the project
      const updateData: ProjectUpdate = {
        name: 'Updated Project Name',
        description: 'Updated description',
      };

      await projectService.updateProject(project.id, updateData, 'user-123', 'Updated project details');

      // Verify version history was created
      expect(mockVersionHistoryRepository.create).toHaveBeenCalled();
      const createCall = (mockVersionHistoryRepository.create as any).mock.calls[0][0];
      expect(createCall.entityType).toBe('project');
      expect(createCall.entityId).toBe(project.id);
      expect(createCall.versionNumber).toBe(1);
      expect(createCall.changedBy).toBe('user-123');
      expect(createCall.changeDescription).toBe('Updated project details');
    });

    it('should track changes in version history', async () => {
      // Create a project
      const projectData: ProjectCreate = {
        name: 'Original Name',
        description: 'Original description',
        location: {
          address: '123 Main St',
          city: 'Test City',
          region: 'Test Region',
          country: 'Test Country',
        },
        startDate: new Date('2024-01-01'),
        status: 'planning',
        organizationId: 'org-123',
        createdBy: 'user-123',
      };
      
      const project = await projectService.createProject(projectData);

      // Update the project
      const updateData: ProjectUpdate = {
        name: 'New Name',
        status: 'active',
      };

      await projectService.updateProject(project.id, updateData, 'user-123');

      // Verify changes were tracked
      const createCall = (mockVersionHistoryRepository.create as any).mock.calls[0][0];
      expect(createCall.changes).toBeDefined();
      expect(createCall.changes.name).toEqual({ from: 'Original Name', to: 'New Name' });
      expect(createCall.changes.status).toEqual({ from: 'planning', to: 'active' });
    });

    it('should increment version number on subsequent updates', async () => {
      // Create a project
      const projectData: ProjectCreate = {
        name: 'Test Project',
        location: {
          address: '123 Main St',
          city: 'Test City',
          region: 'Test Region',
          country: 'Test Country',
        },
        startDate: new Date('2024-01-01'),
        status: 'planning',
        organizationId: 'org-123',
        createdBy: 'user-123',
      };
      
      const project = await projectService.createProject(projectData);

      // First update
      await projectService.updateProject(project.id, { name: 'Update 1' }, 'user-123');
      
      // Second update
      await projectService.updateProject(project.id, { name: 'Update 2' }, 'user-123');

      // Verify version numbers
      const calls = (mockVersionHistoryRepository.create as any).mock.calls;
      expect(calls[0][0].versionNumber).toBe(1);
      expect(calls[1][0].versionNumber).toBe(2);
    });
  });

  describe('getVersionHistory', () => {
    it('should retrieve all versions for a project', async () => {
      // Create a project
      const projectData: ProjectCreate = {
        name: 'Test Project',
        location: {
          address: '123 Main St',
          city: 'Test City',
          region: 'Test Region',
          country: 'Test Country',
        },
        startDate: new Date('2024-01-01'),
        status: 'planning',
        organizationId: 'org-123',
        createdBy: 'user-123',
      };
      
      const project = await projectService.createProject(projectData);

      // Make multiple updates
      await projectService.updateProject(project.id, { name: 'Update 1' }, 'user-123');
      await projectService.updateProject(project.id, { name: 'Update 2' }, 'user-123');

      // Get version history
      const versions = await projectService.getVersionHistory(project.id);

      expect(mockVersionHistoryRepository.findByEntity).toHaveBeenCalledWith('project', project.id);
      expect(versions).toBeDefined();
    });

    it('should throw error if project not found', async () => {
      await expect(
        projectService.getVersionHistory('non-existent-id')
      ).rejects.toThrow('Project not found');
    });

    it('should throw error if version history not enabled', async () => {
      const serviceWithoutVersioning = new ProjectService(mockProjectRepository);
      
      const projectData: ProjectCreate = {
        name: 'Test Project',
        location: {
          address: '123 Main St',
          city: 'Test City',
          region: 'Test Region',
          country: 'Test Country',
        },
        startDate: new Date('2024-01-01'),
        status: 'planning',
        organizationId: 'org-123',
        createdBy: 'user-123',
      };
      
      const project = await serviceWithoutVersioning.createProject(projectData);

      await expect(
        serviceWithoutVersioning.getVersionHistory(project.id)
      ).rejects.toThrow('Version history not enabled');
    });
  });

  describe('getProjectVersion', () => {
    it('should retrieve a specific version of a project', async () => {
      // Create a project
      const projectData: ProjectCreate = {
        name: 'Test Project',
        location: {
          address: '123 Main St',
          city: 'Test City',
          region: 'Test Region',
          country: 'Test Country',
        },
        startDate: new Date('2024-01-01'),
        status: 'planning',
        organizationId: 'org-123',
        createdBy: 'user-123',
      };
      
      const project = await projectService.createProject(projectData);

      // Make an update
      await projectService.updateProject(project.id, { name: 'Updated' }, 'user-123');

      // Get specific version
      await projectService.getProjectVersion(project.id, 1);

      expect(mockVersionHistoryRepository.findByEntityAndVersion).toHaveBeenCalledWith(
        'project',
        project.id,
        1
      );
    });

    it('should return null if version not found', async () => {
      const projectData: ProjectCreate = {
        name: 'Test Project',
        location: {
          address: '123 Main St',
          city: 'Test City',
          region: 'Test Region',
          country: 'Test Country',
        },
        startDate: new Date('2024-01-01'),
        status: 'planning',
        organizationId: 'org-123',
        createdBy: 'user-123',
      };
      
      const project = await projectService.createProject(projectData);

      const version = await projectService.getProjectVersion(project.id, 999);

      expect(version).toBeNull();
    });
  });

  describe('restoreProjectVersion', () => {
    it('should restore project to a previous version', async () => {
      // Create a project
      const projectData: ProjectCreate = {
        name: 'Original Name',
        description: 'Original description',
        location: {
          address: '123 Main St',
          city: 'Test City',
          region: 'Test Region',
          country: 'Test Country',
        },
        clientName: 'Original Client',
        startDate: new Date('2024-01-01'),
        status: 'planning',
        organizationId: 'org-123',
        createdBy: 'user-123',
      };
      
      const project = await projectService.createProject(projectData);

      // Make an update (this creates version 1)
      await projectService.updateProject(
        project.id,
        { name: 'Updated Name', description: 'Updated description' },
        'user-123'
      );

      // Manually create a version history entry for restoration
      const versionToRestore: VersionHistory = {
        id: 'version-1',
        entityType: 'project',
        entityId: project.id,
        versionNumber: 1,
        data: {
          ...project,
          name: 'Original Name',
          description: 'Original description',
        },
        changedBy: 'user-123',
        createdAt: new Date(),
      };

      // Mock the findByEntityAndVersion to return our version
      (mockVersionHistoryRepository.findByEntityAndVersion as any).mockResolvedValueOnce(versionToRestore);

      // Restore to version 1
      const restoredProject = await projectService.restoreProjectVersion(project.id, 1, 'user-123');

      // Verify restoration
      expect(restoredProject).toBeDefined();
      expect(mockProjectRepository.update).toHaveBeenCalled();
      
      // Verify a new version entry was created for the restoration
      const createCalls = (mockVersionHistoryRepository.create as any).mock.calls;
      const restorationCall = createCalls[createCalls.length - 1][0];
      expect(restorationCall.changeDescription).toContain('Restored to version 1');
    });

    it('should throw error if version not found', async () => {
      const projectData: ProjectCreate = {
        name: 'Test Project',
        location: {
          address: '123 Main St',
          city: 'Test City',
          region: 'Test Region',
          country: 'Test Country',
        },
        startDate: new Date('2024-01-01'),
        status: 'planning',
        organizationId: 'org-123',
        createdBy: 'user-123',
      };
      
      const project = await projectService.createProject(projectData);

      await expect(
        projectService.restoreProjectVersion(project.id, 999, 'user-123')
      ).rejects.toThrow('Version not found');
    });

    it('should throw error if user does not have access', async () => {
      const projectData: ProjectCreate = {
        name: 'Test Project',
        location: {
          address: '123 Main St',
          city: 'Test City',
          region: 'Test Region',
          country: 'Test Country',
        },
        startDate: new Date('2024-01-01'),
        status: 'planning',
        organizationId: 'org-123',
        createdBy: 'user-123',
      };
      
      const project = await projectService.createProject(projectData);

      // Mock user not having access
      (mockProjectRepository.isUserOnProject as any).mockResolvedValueOnce(false);

      await expect(
        projectService.restoreProjectVersion(project.id, 1, 'unauthorized-user')
      ).rejects.toThrow('Access denied to this project');
    });

    it('should create new version entry when restoring', async () => {
      // Create a project
      const projectData: ProjectCreate = {
        name: 'Original Name',
        location: {
          address: '123 Main St',
          city: 'Test City',
          region: 'Test Region',
          country: 'Test Country',
        },
        startDate: new Date('2024-01-01'),
        status: 'planning',
        organizationId: 'org-123',
        createdBy: 'user-123',
      };
      
      const project = await projectService.createProject(projectData);

      // Create version history
      await projectService.updateProject(project.id, { name: 'Updated' }, 'user-123');

      // Mock version to restore
      const versionToRestore: VersionHistory = {
        id: 'version-1',
        entityType: 'project',
        entityId: project.id,
        versionNumber: 1,
        data: project,
        changedBy: 'user-123',
        createdAt: new Date(),
      };

      (mockVersionHistoryRepository.findByEntityAndVersion as any).mockResolvedValueOnce(versionToRestore);
      (mockVersionHistoryRepository.getLatestVersion as any).mockResolvedValueOnce(1);

      // Restore
      await projectService.restoreProjectVersion(project.id, 1, 'user-123');

      // Verify new version was created
      const createCalls = (mockVersionHistoryRepository.create as any).mock.calls;
      expect(createCalls.length).toBeGreaterThan(0);
      
      const lastCall = createCalls[createCalls.length - 1][0];
      expect(lastCall.versionNumber).toBe(2);
      expect(lastCall.changeDescription).toBe('Restored to version 1');
    });
  });
});
