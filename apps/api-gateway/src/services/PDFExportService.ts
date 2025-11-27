import PDFDocument from 'pdfkit';
import { Readable } from 'stream';
import { QuantityReportData, CostEstimateReportData, ReportMetadata } from './ReportService';

/**
 * PDF Export Service
 * Property 38: Export supports multiple formats
 * Validates: Requirements 9.3
 */
export interface IPDFExportService {
  exportQuantityReportToPDF(reportData: QuantityReportData): Promise<Buffer>;
  exportCostEstimateReportToPDF(reportData: CostEstimateReportData): Promise<Buffer>;
}

export class PDFExportService implements IPDFExportService {
  /**
   * Export quantity report to PDF format
   */
  async exportQuantityReportToPDF(reportData: QuantityReportData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50, size: 'LETTER' });
        const chunks: Buffer[] = [];

        // Collect PDF data
        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Add header
        this.addReportHeader(doc, reportData.metadata, 'Quantity Takeoff Report');

        // Add project information
        this.addProjectInfo(doc, reportData.metadata);

        doc.moveDown(2);

        // Add summary section
        doc.fontSize(14).font('Helvetica-Bold').text('Summary', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(10).font('Helvetica');
        doc.text(`Total Categories: ${reportData.summary.totalCategories}`);
        doc.text(`Total Quantities: ${reportData.summary.totalQuantities}`);

        doc.moveDown(2);

        // Add quantities by category
        doc.fontSize(14).font('Helvetica-Bold').text('Quantities by Category', { underline: true });
        doc.moveDown(1);

        for (const categoryGroup of reportData.quantitiesByCategory) {
          // Category header
          doc.fontSize(12).font('Helvetica-Bold').text(categoryGroup.category);
          doc.moveDown(0.5);

          // Table header
          doc.fontSize(9).font('Helvetica-Bold');
          const tableTop = doc.y;
          doc.text('Type', 50, tableTop, { width: 80 });
          doc.text('Value', 130, tableTop, { width: 80 });
          doc.text('Unit', 210, tableTop, { width: 60 });
          doc.text('Waste %', 270, tableTop, { width: 60 });
          doc.text('Adjusted', 330, tableTop, { width: 80 });
          doc.text('Method', 410, tableTop, { width: 150 });

          doc.moveDown(0.8);
          doc.font('Helvetica');

          // Table rows
          for (const quantity of categoryGroup.quantities) {
            const rowTop = doc.y;

            // Check if we need a new page
            if (rowTop > 700) {
              doc.addPage();
              doc.fontSize(9).font('Helvetica');
            }

            doc.text(quantity.quantityType, 50, rowTop, { width: 80 });
            doc.text(quantity.value.toFixed(2), 130, rowTop, { width: 80 });
            doc.text(quantity.unit, 210, rowTop, { width: 60 });
            doc.text(`${(quantity.wasteFactor * 100).toFixed(1)}%`, 270, rowTop, { width: 60 });
            doc.text(quantity.adjustedValue.toFixed(2), 330, rowTop, { width: 80 });
            doc.text(quantity.calculationMethod || 'N/A', 410, rowTop, { width: 150 });

            doc.moveDown(0.6);
          }

          // Category total
          doc.fontSize(10).font('Helvetica-Bold');
          doc.text(`Category Total: ${categoryGroup.totalValue.toFixed(2)}`, 330);
          doc.moveDown(1.5);
          doc.font('Helvetica');
        }

        // Add footer
        this.addFooter(doc);

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Export cost estimate report to PDF format
   */
  async exportCostEstimateReportToPDF(reportData: CostEstimateReportData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50, size: 'LETTER' });
        const chunks: Buffer[] = [];

        // Collect PDF data
        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Add header
        this.addReportHeader(doc, reportData.metadata, 'Cost Estimate Report');

        // Add project information
        this.addProjectInfo(doc, reportData.metadata);

        doc.moveDown(1);

        // Add estimate information
        doc.fontSize(12).font('Helvetica-Bold').text('Estimate Information');
        doc.moveDown(0.5);
        doc.fontSize(10).font('Helvetica');
        doc.text(`Name: ${reportData.estimate.name}`);
        if (reportData.estimate.description) {
          doc.text(`Description: ${reportData.estimate.description}`);
        }
        doc.text(`Status: ${reportData.estimate.status.toUpperCase()}`);
        doc.text(`Version: ${reportData.estimate.version}`);

        doc.moveDown(2);

        // Add cost breakdown by CSI code
        doc.fontSize(14).font('Helvetica-Bold').text('Cost Breakdown by CSI Division', {
          underline: true,
        });
        doc.moveDown(1);

        for (const csiGroup of reportData.costBreakdown.byCSICode) {
          // CSI Division header
          doc.fontSize(11).font('Helvetica-Bold');
          doc.text(`${csiGroup.csiCode} - ${csiGroup.description}`);
          doc.moveDown(0.5);

          // Table header
          doc.fontSize(8).font('Helvetica-Bold');
          const tableTop = doc.y;
          doc.text('Description', 50, tableTop, { width: 150 });
          doc.text('Qty', 200, tableTop, { width: 40, align: 'right' });
          doc.text('Unit', 245, tableTop, { width: 40 });
          doc.text('Unit Cost', 290, tableTop, { width: 60, align: 'right' });
          doc.text('Adj. Cost', 355, tableTop, { width: 60, align: 'right' });
          doc.text('Total', 420, tableTop, { width: 80, align: 'right' });

          doc.moveDown(0.8);
          doc.font('Helvetica');

          // Table rows
          for (const item of csiGroup.items) {
            const rowTop = doc.y;

            // Check if we need a new page
            if (rowTop > 700) {
              doc.addPage();
              doc.fontSize(8).font('Helvetica');
            }

            doc.text(item.description, 50, rowTop, { width: 150 });
            doc.text(item.quantity.toFixed(2), 200, rowTop, { width: 40, align: 'right' });
            doc.text(item.unit, 245, rowTop, { width: 40 });
            doc.text(`$${item.unitCost.toFixed(2)}`, 290, rowTop, { width: 60, align: 'right' });
            doc.text(`$${item.adjustedUnitCost.toFixed(2)}`, 355, rowTop, {
              width: 60,
              align: 'right',
            });
            doc.text(`$${item.adjustedTotalCost.toFixed(2)}`, 420, rowTop, {
              width: 80,
              align: 'right',
            });

            doc.moveDown(0.6);
          }

          // Division subtotal
          doc.fontSize(9).font('Helvetica-Bold');
          doc.text(`Division Subtotal: $${csiGroup.subtotal.toFixed(2)}`, 420, doc.y, {
            width: 80,
            align: 'right',
          });
          doc.moveDown(1.5);
          doc.font('Helvetica');
        }

        // Add new page for totals and assumptions
        doc.addPage();

        // Add cost totals
        doc.fontSize(14).font('Helvetica-Bold').text('Cost Summary', { underline: true });
        doc.moveDown(1);

        doc.fontSize(10).font('Helvetica');
        const totals = reportData.totals;
        doc.text(`Direct Costs: $${totals.directCosts.toFixed(2)}`);
        doc.text(`Indirect Costs: $${totals.indirectCosts.toFixed(2)}`);
        doc.text(`Contingency: $${totals.contingency.toFixed(2)}`);
        doc.text(`Overhead: $${totals.overhead.toFixed(2)}`);
        doc.text(`Profit: $${totals.profit.toFixed(2)}`);
        doc.moveDown(0.5);
        doc.fontSize(12).font('Helvetica-Bold');
        doc.text(`TOTAL COST: $${totals.totalCost.toFixed(2)}`);

        doc.moveDown(2);

        // Add assumptions
        doc.fontSize(12).font('Helvetica-Bold').text('Assumptions');
        doc.moveDown(0.5);
        doc.fontSize(9).font('Helvetica');
        reportData.assumptions.forEach((assumption, index) => {
          doc.text(`${index + 1}. ${assumption}`);
        });

        doc.moveDown(1.5);

        // Add exclusions
        doc.fontSize(12).font('Helvetica-Bold').text('Exclusions');
        doc.moveDown(0.5);
        doc.fontSize(9).font('Helvetica');
        reportData.exclusions.forEach((exclusion, index) => {
          doc.text(`${index + 1}. ${exclusion}`);
        });

        // Add footer
        this.addFooter(doc);

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Add report header with title and logo placeholder
   */
  private addReportHeader(doc: PDFKit.PDFDocument, metadata: ReportMetadata, title: string) {
    // Company name/logo placeholder
    doc.fontSize(20).font('Helvetica-Bold').text('ConstructAI', { align: 'center' });
    doc.moveDown(0.5);

    // Report title
    doc.fontSize(16).font('Helvetica-Bold').text(title, { align: 'center' });
    doc.moveDown(0.5);

    // Horizontal line
    doc
      .moveTo(50, doc.y)
      .lineTo(550, doc.y)
      .stroke();

    doc.moveDown(1);
  }

  /**
   * Add project information section
   */
  private addProjectInfo(doc: PDFKit.PDFDocument, metadata: ReportMetadata) {
    doc.fontSize(10).font('Helvetica-Bold').text('Project Information');
    doc.moveDown(0.5);
    doc.fontSize(9).font('Helvetica');
    doc.text(`Project: ${metadata.projectName}`);
    doc.text(`Project ID: ${metadata.projectId}`);
    doc.text(`Generated: ${metadata.generatedAt.toLocaleString()}`);
    if (metadata.generatedBy) {
      doc.text(`Generated By: ${metadata.generatedBy}`);
    }
  }

  /**
   * Add footer with page numbers
   */
  private addFooter(doc: PDFKit.PDFDocument) {
    const pages = doc.bufferedPageRange();

    for (let i = 0; i < pages.count; i++) {
      doc.switchToPage(i);

      // Footer text
      doc.fontSize(8).font('Helvetica');
      doc.text(
        `Page ${i + 1} of ${pages.count}`,
        50,
        doc.page.height - 50,
        {
          align: 'center',
        }
      );

      // Footer line
      doc
        .moveTo(50, doc.page.height - 60)
        .lineTo(550, doc.page.height - 60)
        .stroke();
    }
  }
}
