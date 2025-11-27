import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ReportService } from './ReportService';
import { ProjectRepository } from '../repositories/ProjectRepository';
import { QuantityRepository } from '../repositories/QuantityRepository';
import { CostRepository } from '../repositories/CostRepository';

// Mock the repositories
vi.mock('../repositories/ProjectRepository');
vi.mock('../repositories/QuantityRepository');
vi.mock('../repositories/CostRepository');

describe('ReportService', () => {
  let reportService: ReportService;
  let mockDb: any;
  let mockProjectRepo: any;
  let mockQuantityRepo: any;
  let mockCostRepo: any;

  beforeEach(() => {
    mockDb = {} as any;
    
    // Create mock repository instances
    mockProjectRepo = {
      findById: vi.fn(),
    };
    mockQuantityRepo = {
      findByProject: vi.fn(),
      findById: vi.fn(),
    };
    mockCostRepo = {
      findEstimateById: vi.fn(),
      findEstimatesByProject: vi.fn(),
      findItemsByProject: vi.fn(),
    };

    // Mock the repository constructors to return our mocks
    vi.mocked(ProjectRepository).mockImplementation(() => mockProjectRepo);
    vi.mocked(QuantityRepository).mockImplementation(() => mockQuantityRepo);
    vi.mocked(CostRepository).mockImplementation(() => mockCostRepo);

    reportService = new ReportService(mockDb);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('generateQuantityReport', () => {
    it('should generate a quantity report with metadata', async () => {
      // Mock project data
      const mockProject = {
        id: 'project-123',
        name: 'Test Project',
        description: 'Test Description',
        location: {
          address: '123 Main St',
          city: 'Test City',
          region: 'Test Region',
          country: 'Test Country',
        },
        clientName: 'Test Client',
        startDate: new Date('2024-01-01'),
        status: 'active' as const,
        organizationId: 'org-123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Mock quantities data
      const mockQuantities = [
        {
          id: 'qty-1',
          projectId: 'project-123',
          elementId: 'elem-1',
          category: 'Wall',
          quantityType: 'volume' as const,
          value: 100,
          unit: 'm3',
          wasteFactor: 0.1,
          adjustedValue: 110,
          calculationMethod: 'bounding_box',
          calculatedAt: new Date(),
          version: 1,
        },
        {
          id: 'qty-2',
          projectId: 'project-123',
          elementId: 'elem-2',
          category: 'Floor',
          quantityType: 'area' as const,
          value: 200,
          unit: 'm2',
          wasteFactor: 0.05,
          adjustedValue: 210,
          calculationMethod: 'bounding_box',
          calculatedAt: new Date(),
          version: 1,
        },
      ];

      // Setup mocks
      mockProjectRepo.findById.mockResolvedValue(mockProject);
      mockQuantityRepo.findByProject.mockResolvedValue(mockQuantities);

      // Generate report
      const report = await reportService.generateQuantityReport('project-123', 'user-123');

      // Verify metadata
      expect(report.metadata).toBeDefined();
      expect(report.metadata.projectName).toBe('Test Project');
      expect(report.metadata.projectId).toBe('project-123');
      expect(report.metadata.generatedBy).toBe('user-123');
      expect(report.metadata.reportType).toBe('quantity');
      expect(report.metadata.generatedAt).toBeInstanceOf(Date);

      // Verify quantities are organized by category
      expect(report.quantitiesByCategory).toHaveLength(2);
      expect(report.quantitiesByCategory[0].category).toBe('Wall');
      expect(report.quantitiesByCategory[1].category).toBe('Floor');

      // Verify summary
      expect(report.summary.totalCategories).toBe(2);
      expect(report.summary.totalQuantities).toBe(2);
    });

    it('should throw error if project not found', async () => {
      mockProjectRepo.findById.mockResolvedValue(null);

      await expect(
        reportService.generateQuantityReport('invalid-project', 'user-123')
      ).rejects.toThrow('Project invalid-project not found');
    });

    it('should throw error if no quantities found', async () => {
      const mockProject = {
        id: 'project-123',
        name: 'Test Project',
        description: 'Test Description',
        location: {
          address: '123 Main St',
          city: 'Test City',
          region: 'Test Region',
          country: 'Test Country',
        },
        clientName: 'Test Client',
        startDate: new Date('2024-01-01'),
        status: 'active' as const,
        organizationId: 'org-123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockProjectRepo.findById.mockResolvedValue(mockProject);
      mockQuantityRepo.findByProject.mockResolvedValue([]);

      await expect(
        reportService.generateQuantityReport('project-123', 'user-123')
      ).rejects.toThrow('No quantities found for project project-123');
    });
  });

  describe('generateCostEstimateReport', () => {
    it('should generate a cost estimate report with complete data', async () => {
      // Mock project data
      const mockProject = {
        id: 'project-123',
        name: 'Test Project',
        description: 'Test Description',
        location: {
          address: '123 Main St',
          city: 'Test City',
          region: 'Test Region',
          country: 'Test Country',
        },
        clientName: 'Test Client',
        startDate: new Date('2024-01-01'),
        status: 'active' as const,
        organizationId: 'org-123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Mock estimate data
      const mockEstimate = {
        id: 'estimate-123',
        projectId: 'project-123',
        name: 'Test Estimate',
        description: 'Test estimate description',
        directCosts: 100000,
        indirectCosts: 10000,
        contingency: 11000,
        overhead: 16500,
        profit: 12650,
        totalCost: 150150,
        status: 'draft' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      };

      // Mock cost items
      const mockCostItems = [
        {
          id: 'cost-1',
          projectId: 'project-123',
          quantityId: 'qty-1',
          csiCode: '03',
          description: 'Concrete',
          quantity: 100,
          unit: 'm3',
          unitCost: 500,
          totalCost: 50000,
          regionalAdjustment: 1.0,
          adjustedUnitCost: 500,
          adjustedTotalCost: 50000,
          costType: 'material' as const,
          createdAt: new Date(),
          updatedAt: new Date(),
          version: 1,
        },
      ];

      // Setup mocks
      mockProjectRepo.findById.mockResolvedValue(mockProject);
      mockCostRepo.findEstimatesByProject.mockResolvedValue([mockEstimate]);
      mockCostRepo.findItemsByProject.mockResolvedValue(mockCostItems);
      mockQuantityRepo.findById.mockResolvedValue({
        id: 'qty-1',
        projectId: 'project-123',
        elementId: 'elem-1',
        category: 'Concrete',
        quantityType: 'volume' as const,
        value: 100,
        unit: 'm3',
        wasteFactor: 0,
        adjustedValue: 100,
        calculatedAt: new Date(),
        version: 1,
      });

      // Generate report
      const report = await reportService.generateCostEstimateReport('project-123', undefined, 'user-123');

      // Verify metadata
      expect(report.metadata).toBeDefined();
      expect(report.metadata.projectName).toBe('Test Project');
      expect(report.metadata.projectId).toBe('project-123');
      expect(report.metadata.generatedBy).toBe('user-123');
      expect(report.metadata.reportType).toBe('cost_estimate');

      // Verify estimate information
      expect(report.estimate.name).toBe('Test Estimate');
      expect(report.estimate.status).toBe('draft');

      // Verify cost breakdown exists
      expect(report.costBreakdown).toBeDefined();
      expect(report.costBreakdown.byCSICode).toBeDefined();
      expect(report.costBreakdown.byCategory).toBeDefined();

      // Verify totals
      expect(report.totals.directCosts).toBe(100000);
      expect(report.totals.totalCost).toBe(150150);

      // Verify assumptions and exclusions are included
      expect(report.assumptions).toBeDefined();
      expect(report.assumptions.length).toBeGreaterThan(0);
      expect(report.exclusions).toBeDefined();
      expect(report.exclusions.length).toBeGreaterThan(0);
    });

    it('should throw error if project not found', async () => {
      mockProjectRepo.findById.mockResolvedValue(null);

      await expect(
        reportService.generateCostEstimateReport('invalid-project', undefined, 'user-123')
      ).rejects.toThrow('Project invalid-project not found');
    });

    it('should throw error if no estimate found', async () => {
      const mockProject = {
        id: 'project-123',
        name: 'Test Project',
        description: 'Test Description',
        location: {
          address: '123 Main St',
          city: 'Test City',
          region: 'Test Region',
          country: 'Test Country',
        },
        clientName: 'Test Client',
        startDate: new Date('2024-01-01'),
        status: 'active' as const,
        organizationId: 'org-123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockProjectRepo.findById.mockResolvedValue(mockProject);
      mockCostRepo.findEstimatesByProject.mockResolvedValue([]);

      await expect(
        reportService.generateCostEstimateReport('project-123', undefined, 'user-123')
      ).rejects.toThrow('No cost estimate found for project project-123');
    });
  });
});
