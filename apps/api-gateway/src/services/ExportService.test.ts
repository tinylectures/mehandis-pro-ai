import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ExportService } from './ExportService';
import { ReportService } from './ReportService';
import { PDFExportService } from './PDFExportService';
import { ExcelExportService } from './ExcelExportService';
import { CSVExportService } from './CSVExportService';

// Mock all the services
vi.mock('./ReportService');
vi.mock('./PDFExportService');
vi.mock('./ExcelExportService');
vi.mock('./CSVExportService');

describe('ExportService', () => {
  let exportService: ExportService;
  let mockDb: any;
  let mockReportService: any;
  let mockPDFService: any;
  let mockExcelService: any;
  let mockCSVService: any;

  beforeEach(() => {
    mockDb = {} as any;

    // Create mock service instances
    mockReportService = {
      generateQuantityReport: vi.fn(),
      generateCostEstimateReport: vi.fn(),
    };

    mockPDFService = {
      exportQuantityReportToPDF: vi.fn(),
      exportCostEstimateReportToPDF: vi.fn(),
    };

    mockExcelService = {
      exportQuantityReportToExcel: vi.fn(),
      exportCostEstimateReportToExcel: vi.fn(),
    };

    mockCSVService = {
      exportQuantityReportToCSV: vi.fn(),
      exportCostEstimateReportToCSV: vi.fn(),
    };

    // Mock the service constructors
    vi.mocked(ReportService).mockImplementation(() => mockReportService);
    vi.mocked(PDFExportService).mockImplementation(() => mockPDFService);
    vi.mocked(ExcelExportService).mockImplementation(() => mockExcelService);
    vi.mocked(CSVExportService).mockImplementation(() => mockCSVService);

    exportService = new ExportService(mockDb);
  });

  describe('exportReport', () => {
    const mockQuantityReport = {
      metadata: {
        projectName: 'Test Project',
        projectId: 'project-123',
        generatedAt: new Date(),
        reportType: 'quantity' as const,
      },
      quantitiesByCategory: [],
      summary: {
        totalCategories: 0,
        totalQuantities: 0,
      },
    };

    it('should export quantity report as PDF', async () => {
      const mockPDFBuffer = Buffer.from('PDF content');
      mockReportService.generateQuantityReport.mockResolvedValue(mockQuantityReport);
      mockPDFService.exportQuantityReportToPDF.mockResolvedValue(mockPDFBuffer);

      const result = await exportService.exportReport({
        format: 'pdf',
        reportType: 'quantity',
        projectId: 'project-123',
        generatedBy: 'user-123',
      });

      expect(result.mimeType).toBe('application/pdf');
      expect(result.filename).toMatch(/quantity-report-project-123-\d+\.pdf/);
      expect(result.data).toBe(mockPDFBuffer);
      expect(mockReportService.generateQuantityReport).toHaveBeenCalledWith(
        'project-123',
        'user-123'
      );
    });

    it('should export quantity report as Excel', async () => {
      const mockExcelBuffer = Buffer.from('Excel content');
      mockReportService.generateQuantityReport.mockResolvedValue(mockQuantityReport);
      mockExcelService.exportQuantityReportToExcel.mockResolvedValue(mockExcelBuffer);

      const result = await exportService.exportReport({
        format: 'excel',
        reportType: 'quantity',
        projectId: 'project-123',
        generatedBy: 'user-123',
      });

      expect(result.mimeType).toBe(
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      expect(result.filename).toMatch(/quantity-report-project-123-\d+\.xlsx/);
      expect(result.data).toBe(mockExcelBuffer);
    });

    it('should export quantity report as CSV', async () => {
      const mockCSVString = 'CSV,content';
      mockReportService.generateQuantityReport.mockResolvedValue(mockQuantityReport);
      mockCSVService.exportQuantityReportToCSV.mockResolvedValue(mockCSVString);

      const result = await exportService.exportReport({
        format: 'csv',
        reportType: 'quantity',
        projectId: 'project-123',
        generatedBy: 'user-123',
      });

      expect(result.mimeType).toBe('text/csv');
      expect(result.filename).toMatch(/quantity-report-project-123-\d+\.csv/);
      expect(result.data).toBe(mockCSVString);
    });

    it('should throw error for unsupported format', async () => {
      mockReportService.generateQuantityReport.mockResolvedValue(mockQuantityReport);

      await expect(
        exportService.exportReport({
          format: 'xml' as any,
          reportType: 'quantity',
          projectId: 'project-123',
        })
      ).rejects.toThrow('Unsupported export format: xml');
    });
  });

  describe('generateQuantityReport', () => {
    it('should delegate to ReportService', async () => {
      const mockReport = {
        metadata: {
          projectName: 'Test Project',
          projectId: 'project-123',
          generatedAt: new Date(),
          reportType: 'quantity' as const,
        },
        quantitiesByCategory: [],
        summary: {
          totalCategories: 0,
          totalQuantities: 0,
        },
      };

      mockReportService.generateQuantityReport.mockResolvedValue(mockReport);

      const result = await exportService.generateQuantityReport('project-123', 'user-123');

      expect(result).toBe(mockReport);
      expect(mockReportService.generateQuantityReport).toHaveBeenCalledWith(
        'project-123',
        'user-123'
      );
    });
  });

  describe('generateCostEstimateReport', () => {
    it('should delegate to ReportService', async () => {
      const mockReport = {
        metadata: {
          projectName: 'Test Project',
          projectId: 'project-123',
          generatedAt: new Date(),
          reportType: 'cost_estimate' as const,
        },
        estimate: {
          name: 'Test Estimate',
          status: 'draft',
          version: 1,
        },
        costBreakdown: {
          byCSICode: [],
          byCategory: [],
        },
        totals: {
          directCosts: 0,
          indirectCosts: 0,
          contingency: 0,
          overhead: 0,
          profit: 0,
          totalCost: 0,
        },
        assumptions: [],
        exclusions: [],
      };

      mockReportService.generateCostEstimateReport.mockResolvedValue(mockReport);

      const result = await exportService.generateCostEstimateReport(
        'project-123',
        'estimate-123',
        'user-123'
      );

      expect(result).toBe(mockReport);
      expect(mockReportService.generateCostEstimateReport).toHaveBeenCalledWith(
        'project-123',
        'estimate-123',
        'user-123'
      );
    });
  });
});
