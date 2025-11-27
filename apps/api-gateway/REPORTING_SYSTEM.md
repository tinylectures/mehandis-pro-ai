# Reporting and Export System

This document describes the reporting and export functionality implemented for the ConstructAI platform.

## Overview

The reporting system provides comprehensive report generation and export capabilities for quantity takeoffs and cost estimates. Reports can be exported in multiple formats (PDF, Excel, CSV) with proper formatting and metadata.

## Architecture

The system is composed of several services that work together:

### Core Services

1. **ReportService** - Generates report data structures
   - `generateQuantityReport()` - Creates quantity takeoff reports
   - `generateCostEstimateReport()` - Creates cost estimate reports

2. **PDFExportService** - Exports reports to PDF format
   - Professional formatting with headers, footers, and page numbers
   - Tables with proper alignment and styling
   - Company branding placeholder

3. **ExcelExportService** - Exports reports to Excel format
   - Multiple worksheets for different views
   - Formulas for calculations (totals, subtotals)
   - Formatting and styling
   - Filters and frozen headers

4. **CSVExportService** - Exports reports to CSV format
   - Simple text-based format
   - Proper escaping of special characters
   - Hierarchical data representation

5. **ExportService** - Unified interface for all export operations
   - Single entry point for report generation and export
   - Handles format selection and routing

## Features

### Report Metadata (Property 39)
All reports include:
- Project name and ID
- Generation timestamp
- User who generated the report
- Report type (quantity or cost_estimate)

### Quantity Reports (Property 36)
Organized by category with:
- Quantity type (volume, area, length, count)
- Base value and unit
- Waste factor
- Adjusted value
- Calculation method
- Category totals
- Overall summary statistics

### Cost Estimate Reports (Property 37)
Complete reports including:
- Estimate information (name, status, version)
- Cost breakdown by CSI division
- Cost breakdown by category
- Cost totals (direct, indirect, contingency, overhead, profit)
- Assumptions section
- Exclusions section

### Export Formats (Property 38)
Supports three formats:
- **PDF** - Professional documents for client presentation
- **Excel** - Editable spreadsheets with formulas for analysis
- **CSV** - Simple format for data import/export

## API Endpoints

### Get Quantity Report (JSON)
```
GET /api/reports/quantity/:projectId
```

Returns quantity report data as JSON.

### Get Cost Estimate Report (JSON)
```
GET /api/reports/cost-estimate/:projectId?estimateId=<id>
```

Returns cost estimate report data as JSON. If `estimateId` is not provided, returns the most recent estimate.

### Export Report
```
GET /api/reports/export/:projectId?format=<format>&reportType=<type>&estimateId=<id>
POST /api/reports/export
```

Exports a report in the specified format. Returns the file with appropriate MIME type and filename.

**Query Parameters:**
- `format` - pdf, excel, or csv (required)
- `reportType` - quantity or cost_estimate (required)
- `estimateId` - UUID of specific estimate (optional, for cost estimates)

## Usage Examples

### Generate Quantity Report
```typescript
import { ExportService } from './services/ExportService';
import db from './database/db';

const exportService = new ExportService(db);

// Get report data
const reportData = await exportService.generateQuantityReport(
  'project-123',
  'user-123'
);

// Export as PDF
const pdfResult = await exportService.exportReport({
  format: 'pdf',
  reportType: 'quantity',
  projectId: 'project-123',
  generatedBy: 'user-123',
});

// pdfResult contains:
// - data: Buffer with PDF content
// - mimeType: 'application/pdf'
// - filename: 'quantity-report-project-123-1234567890.pdf'
```

### Generate Cost Estimate Report
```typescript
// Get report data
const reportData = await exportService.generateCostEstimateReport(
  'project-123',
  'estimate-456', // optional
  'user-123'
);

// Export as Excel
const excelResult = await exportService.exportReport({
  format: 'excel',
  reportType: 'cost_estimate',
  projectId: 'project-123',
  estimateId: 'estimate-456',
  generatedBy: 'user-123',
});
```

### Export as CSV
```typescript
const csvResult = await exportService.exportReport({
  format: 'csv',
  reportType: 'quantity',
  projectId: 'project-123',
  generatedBy: 'user-123',
});

// csvResult.data is a string with CSV content
```

## Data Structures

### QuantityReportData
```typescript
interface QuantityReportData {
  metadata: ReportMetadata;
  quantitiesByCategory: Array<{
    category: string;
    quantities: Array<{
      id: string;
      quantityType: string;
      value: number;
      unit: string;
      wasteFactor: number;
      adjustedValue: number;
      calculationMethod?: string;
    }>;
    totalValue: number;
  }>;
  summary: {
    totalCategories: number;
    totalQuantities: number;
  };
}
```

### CostEstimateReportData
```typescript
interface CostEstimateReportData {
  metadata: ReportMetadata;
  estimate: {
    name: string;
    description?: string;
    status: string;
    version: number;
  };
  costBreakdown: {
    byCSICode: Array<{
      csiCode: string;
      description: string;
      items: CostItem[];
      subtotal: number;
    }>;
    byCategory: Array<{
      category: string;
      items: CostItem[];
      subtotal: number;
    }>;
  };
  totals: {
    directCosts: number;
    indirectCosts: number;
    contingency: number;
    overhead: number;
    profit: number;
    totalCost: number;
  };
  assumptions: string[];
  exclusions: string[];
}
```

## Testing

The reporting system includes comprehensive unit tests:

- `ReportService.test.ts` - Tests report generation logic
- `ExportService.test.ts` - Tests export format routing

Run tests with:
```bash
npm test -- src/services/ReportService.test.ts --run
npm test -- src/services/ExportService.test.ts --run
```

## Dependencies

- **pdfkit** - PDF generation
- **exceljs** - Excel file generation
- Built-in CSV generation (no external dependencies)

## Future Enhancements

Potential improvements:
1. Custom report templates
2. Report scheduling and email delivery
3. Additional export formats (Word, HTML)
4. Chart and graph generation
5. Comparison reports (multiple estimates)
6. Custom branding and logos
7. Digital signatures for approved estimates

## Requirements Validation

This implementation validates the following requirements:

- **Requirement 9.1** - Quantity reports organized by category ✓
- **Requirement 9.2** - Cost reports include breakdowns, assumptions, exclusions ✓
- **Requirement 9.3** - Export supports PDF, Excel, CSV formats ✓
- **Requirement 9.4** - Reports include metadata (project, timestamp, user) ✓
- **Requirement 9.5** - Excel exports preserve formulas and formatting ✓

## Correctness Properties

The implementation satisfies these correctness properties:

- **Property 36** - Quantity reports are organized by category ✓
- **Property 37** - Cost reports are complete with all required sections ✓
- **Property 38** - Export supports multiple formats (PDF, Excel, CSV) ✓
- **Property 39** - Reports include metadata (project name, timestamp, user) ✓
