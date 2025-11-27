import { Router, Request, Response } from 'express';
import { param, query, validationResult } from 'express-validator';
import { ExportService, ExportFormat, ReportType } from '../services/ExportService';
import db from '../database/db';

const router = Router();

// Initialize export service
const exportService = new ExportService(db);

/**
 * GET /api/reports/quantity/:projectId
 * Generate quantity report data (JSON)
 * Property 36: Quantity reports are organized
 * Property 39: Reports include metadata
 */
router.get(
  '/quantity/:projectId',
  [param('projectId').isUUID().withMessage('Valid project ID required')],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { projectId } = req.params;
      const generatedBy = req.body.userId; // Would come from auth middleware

      const reportData = await exportService.generateQuantityReport(projectId, generatedBy);

      res.json(reportData);
    } catch (error: any) {
      console.error('Error generating quantity report:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * GET /api/reports/cost-estimate/:projectId
 * Generate cost estimate report data (JSON)
 * Property 37: Cost reports are complete
 * Property 39: Reports include metadata
 */
router.get(
  '/cost-estimate/:projectId',
  [
    param('projectId').isUUID().withMessage('Valid project ID required'),
    query('estimateId').optional().isUUID().withMessage('Valid estimate ID required'),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { projectId } = req.params;
      const { estimateId } = req.query;
      const generatedBy = req.body.userId; // Would come from auth middleware

      const reportData = await exportService.generateCostEstimateReport(
        projectId,
        estimateId as string | undefined,
        generatedBy
      );

      res.json(reportData);
    } catch (error: any) {
      console.error('Error generating cost estimate report:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * GET /api/reports/export/:projectId
 * Export report in specified format (PDF, Excel, CSV)
 * Property 38: Export supports multiple formats
 */
router.get(
  '/export/:projectId',
  [
    param('projectId').isUUID().withMessage('Valid project ID required'),
    query('format')
      .isIn(['pdf', 'excel', 'csv'])
      .withMessage('Format must be pdf, excel, or csv'),
    query('reportType')
      .isIn(['quantity', 'cost_estimate'])
      .withMessage('Report type must be quantity or cost_estimate'),
    query('estimateId').optional().isUUID().withMessage('Valid estimate ID required'),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { projectId } = req.params;
      const { format, reportType, estimateId } = req.query;
      const generatedBy = req.body.userId; // Would come from auth middleware

      const exportResult = await exportService.exportReport({
        format: format as ExportFormat,
        reportType: reportType as ReportType,
        projectId,
        estimateId: estimateId as string | undefined,
        generatedBy,
      });

      // Set response headers
      res.setHeader('Content-Type', exportResult.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${exportResult.filename}"`);

      // Send the file
      if (typeof exportResult.data === 'string') {
        res.send(exportResult.data);
      } else {
        res.send(exportResult.data);
      }
    } catch (error: any) {
      console.error('Error exporting report:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * POST /api/reports/export
 * Export report with POST (for larger payloads or when query params are insufficient)
 * Property 38: Export supports multiple formats
 */
router.post(
  '/export',
  async (req: Request, res: Response) => {
    try {
      const { projectId, format, reportType, estimateId, generatedBy } = req.body;

      // Validate required fields
      if (!projectId || !format || !reportType) {
        return res.status(400).json({
          error: 'Missing required fields: projectId, format, reportType',
        });
      }

      // Validate format
      if (!['pdf', 'excel', 'csv'].includes(format)) {
        return res.status(400).json({
          error: 'Format must be pdf, excel, or csv',
        });
      }

      // Validate report type
      if (!['quantity', 'cost_estimate'].includes(reportType)) {
        return res.status(400).json({
          error: 'Report type must be quantity or cost_estimate',
        });
      }

      const exportResult = await exportService.exportReport({
        format: format as ExportFormat,
        reportType: reportType as ReportType,
        projectId,
        estimateId,
        generatedBy,
      });

      // Set response headers
      res.setHeader('Content-Type', exportResult.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${exportResult.filename}"`);

      // Send the file
      if (typeof exportResult.data === 'string') {
        res.send(exportResult.data);
      } else {
        res.send(exportResult.data);
      }
    } catch (error: any) {
      console.error('Error exporting report:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

export default router;
