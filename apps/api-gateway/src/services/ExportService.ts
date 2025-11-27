import { Knex } from 'knex';
import { ReportService, QuantityReportData, CostEstimateReportData } from './ReportService';
import { PDFExportService } from './PDFExportService';
import { ExcelExportService } from './ExcelExportService';
import { CSVExportService } from './CSVExportService';

export type ExportFormat = 'pdf' | 'excel' | 'csv';
export type ReportType = 'quantity' | 'cost_estimate';

export interface ExportOptions {
  format: ExportFormat;
  reportType: ReportType;
  projectId: string;
  estimateId?: string; // For cost estimate reports
  generatedBy?: string;
}

export interface ExportResult {
  data: Buffer | string;
  mimeType: string;
  filename: string;
}

/**
 * Unified Export Service
 * Property 38: Export supports multiple formats
 * Validates: Requirements 9.3
 */
export interface IExportService {
  exportReport(options: ExportOptions): Promise<ExportResult>;
  generateQuantityReport(projectId: string, generatedBy?: string): Promise<QuantityReportData>;
  generateCostEstimateReport(
    projectId: string,
    estimateId?: string,
    generatedBy?: string
  ): Promise<CostEstimateReportData>;
}

export class ExportService implements IExportService {
  private reportService: ReportService;
  private pdfExportService: PDFExportService;
  private excelExportService: ExcelExportService;
  private csvExportService: CSVExportService;

  constructor(db: Knex) {
    this.reportService = new ReportService(db);
    this.pdfExportService = new PDFExportService();
    this.excelExportService = new ExcelExportService();
    this.csvExportService = new CSVExportService();
  }

  /**
   * Export a report in the specified format
   * Property 38: Export supports multiple formats
   */
  async exportReport(options: ExportOptions): Promise<ExportResult> {
    // Generate report data
    let reportData: QuantityReportData | CostEstimateReportData;

    if (options.reportType === 'quantity') {
      reportData = await this.reportService.generateQuantityReport(
        options.projectId,
        options.generatedBy
      );
    } else {
      reportData = await this.reportService.generateCostEstimateReport(
        options.projectId,
        options.estimateId,
        options.generatedBy
      );
    }

    // Export to requested format
    switch (options.format) {
      case 'pdf':
        return this.exportToPDF(reportData, options.reportType);
      case 'excel':
        return this.exportToExcel(reportData, options.reportType);
      case 'csv':
        return this.exportToCSV(reportData, options.reportType);
      default:
        throw new Error(`Unsupported export format: ${options.format}`);
    }
  }

  /**
   * Generate quantity report data
   */
  async generateQuantityReport(
    projectId: string,
    generatedBy?: string
  ): Promise<QuantityReportData> {
    return this.reportService.generateQuantityReport(projectId, generatedBy);
  }

  /**
   * Generate cost estimate report data
   */
  async generateCostEstimateReport(
    projectId: string,
    estimateId?: string,
    generatedBy?: string
  ): Promise<CostEstimateReportData> {
    return this.reportService.generateCostEstimateReport(projectId, estimateId, generatedBy);
  }

  /**
   * Export to PDF format
   */
  private async exportToPDF(
    reportData: QuantityReportData | CostEstimateReportData,
    reportType: ReportType
  ): Promise<ExportResult> {
    let data: Buffer;
    let filename: string;

    if (reportType === 'quantity') {
      data = await this.pdfExportService.exportQuantityReportToPDF(
        reportData as QuantityReportData
      );
      filename = `quantity-report-${reportData.metadata.projectId}-${Date.now()}.pdf`;
    } else {
      data = await this.pdfExportService.exportCostEstimateReportToPDF(
        reportData as CostEstimateReportData
      );
      filename = `cost-estimate-${reportData.metadata.projectId}-${Date.now()}.pdf`;
    }

    return {
      data,
      mimeType: 'application/pdf',
      filename,
    };
  }

  /**
   * Export to Excel format
   */
  private async exportToExcel(
    reportData: QuantityReportData | CostEstimateReportData,
    reportType: ReportType
  ): Promise<ExportResult> {
    let data: Buffer;
    let filename: string;

    if (reportType === 'quantity') {
      data = await this.excelExportService.exportQuantityReportToExcel(
        reportData as QuantityReportData
      );
      filename = `quantity-report-${reportData.metadata.projectId}-${Date.now()}.xlsx`;
    } else {
      data = await this.excelExportService.exportCostEstimateReportToExcel(
        reportData as CostEstimateReportData
      );
      filename = `cost-estimate-${reportData.metadata.projectId}-${Date.now()}.xlsx`;
    }

    return {
      data,
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      filename,
    };
  }

  /**
   * Export to CSV format
   */
  private async exportToCSV(
    reportData: QuantityReportData | CostEstimateReportData,
    reportType: ReportType
  ): Promise<ExportResult> {
    let data: string;
    let filename: string;

    if (reportType === 'quantity') {
      data = await this.csvExportService.exportQuantityReportToCSV(
        reportData as QuantityReportData
      );
      filename = `quantity-report-${reportData.metadata.projectId}-${Date.now()}.csv`;
    } else {
      data = await this.csvExportService.exportCostEstimateReportToCSV(
        reportData as CostEstimateReportData
      );
      filename = `cost-estimate-${reportData.metadata.projectId}-${Date.now()}.csv`;
    }

    return {
      data,
      mimeType: 'text/csv',
      filename,
    };
  }
}
