import { Router, Request, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { CostService } from '../services/CostService';
import { CSIMasterFormatService } from '../services/CSIMasterFormatService';
import db from '../database/db';
import { Server as SocketIOServer } from 'socket.io';

const router = Router();

// Initialize services
const costService = new CostService(db);
const csiService = new CSIMasterFormatService(db);

// Socket.IO instance will be injected
let io: SocketIOServer | null = null;

export function setSocketIO(socketIO: SocketIOServer) {
  io = socketIO;
}

/**
 * Broadcast cost update to all connected clients in a project room
 */
function broadcastCostUpdate(projectId: string, event: string, data: any) {
  if (io) {
    io.to(`project:${projectId}`).emit(event, data);
  }
}

/**
 * POST /api/costs/apply
 * Apply cost to a quantity
 */
router.post(
  '/apply',
  [
    body('projectId').isUUID().withMessage('Valid project ID required'),
    body('quantityId').isUUID().withMessage('Valid quantity ID required'),
    body('costType').isIn(['material', 'labor', 'equipment', 'subcontractor']).withMessage('Valid cost type required'),
    body('materialType').optional().isString(),
    body('unitCost').optional().isFloat({ min: 0 }).withMessage('Unit cost must be positive'),
    body('csiCode').optional().isString(),
    body('vendor').optional().isString(),
    body('notes').optional().isString(),
    body('regionalAdjustment').optional().isFloat({ min: 0 }).withMessage('Regional adjustment must be positive'),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { projectId, regionalAdjustment, ...application } = req.body;

      const result = await costService.applyCostToQuantity(
        projectId,
        application,
        regionalAdjustment
      );

      // Broadcast update to connected clients
      broadcastCostUpdate(projectId, 'cost:created', {
        costItem: result.costItem,
        timestamp: new Date().toISOString(),
      });

      res.status(201).json(result);
    } catch (error: any) {
      console.error('Error applying cost:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * PATCH /api/costs/:id
 * Update a cost item (triggers recalculation)
 * Property 21: Unit cost updates trigger recalculation
 */
router.patch(
  '/:id',
  [
    param('id').isUUID().withMessage('Valid cost item ID required'),
    body('unitCost').optional().isFloat({ min: 0 }).withMessage('Unit cost must be positive'),
    body('quantity').optional().isFloat({ min: 0 }).withMessage('Quantity must be positive'),
    body('regionalAdjustment').optional().isFloat({ min: 0 }).withMessage('Regional adjustment must be positive'),
    body('description').optional().isString(),
    body('vendor').optional().isString(),
    body('notes').optional().isString(),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { id } = req.params;
      const updates = req.body;

      // Get the cost repository to update
      const { CostRepository } = await import('../repositories/CostRepository');
      const costRepo = new CostRepository(db);

      // Get current cost item to get project ID
      const currentItem = await costRepo.findItemById(id);
      if (!currentItem) {
        return res.status(404).json({ error: 'Cost item not found' });
      }

      // Update the cost item (repository handles recalculation)
      const updatedItem = await costRepo.updateItem(id, updates);

      if (!updatedItem) {
        return res.status(404).json({ error: 'Cost item not found' });
      }

      // Broadcast update to connected clients
      broadcastCostUpdate(currentItem.projectId, 'cost:updated', {
        costItem: updatedItem,
        changes: updates,
        timestamp: new Date().toISOString(),
      });

      res.json(updatedItem);
    } catch (error: any) {
      console.error('Error updating cost item:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * POST /api/costs/regional-adjustment
 * Apply regional adjustment to all costs in a project
 * Property 19: Regional adjustments are applied
 */
router.post(
  '/regional-adjustment',
  [
    body('projectId').isUUID().withMessage('Valid project ID required'),
    body('country').isString().withMessage('Country required'),
    body('state').optional().isString(),
    body('city').optional().isString(),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { projectId, country, state, city } = req.body;

      const updatedItems = await costService.applyRegionalAdjustment(
        projectId,
        country,
        state,
        city
      );

      // Broadcast bulk update to connected clients
      broadcastCostUpdate(projectId, 'costs:regional-adjustment-applied', {
        itemCount: updatedItems.length,
        location: { country, state, city },
        timestamp: new Date().toISOString(),
      });

      res.json({
        message: 'Regional adjustment applied successfully',
        updatedCount: updatedItems.length,
        items: updatedItems,
      });
    } catch (error: any) {
      console.error('Error applying regional adjustment:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * GET /api/costs/project/:projectId/total
 * Get total costs for a project
 * Property 22: Project totals include all components
 */
router.get(
  '/project/:projectId/total',
  [param('projectId').isUUID().withMessage('Valid project ID required')],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { projectId } = req.params;

      const total = await costService.calculateTotalCosts(projectId);

      res.json({
        projectId,
        totalCost: total,
        currency: 'USD',
      });
    } catch (error: any) {
      console.error('Error calculating total costs:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * GET /api/costs/project/:projectId/breakdown
 * Get cost breakdown by CSI divisions
 * Property 20: Costs are organized by CSI codes
 */
router.get(
  '/project/:projectId/breakdown',
  [param('projectId').isUUID().withMessage('Valid project ID required')],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { projectId } = req.params;

      const breakdown = await csiService.getCostBreakdownByCSI(projectId);

      res.json(breakdown);
    } catch (error: any) {
      console.error('Error getting cost breakdown:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * GET /api/costs/project/:projectId/division/:divisionCode
 * Get costs for a specific CSI division
 */
router.get(
  '/project/:projectId/division/:divisionCode',
  [
    param('projectId').isUUID().withMessage('Valid project ID required'),
    param('divisionCode').isString().withMessage('Division code required'),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { projectId, divisionCode } = req.params;

      const divisionCosts = await csiService.getDivisionCosts(projectId, divisionCode);

      res.json(divisionCosts);
    } catch (error: any) {
      console.error('Error getting division costs:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * GET /api/costs/csi/divisions
 * Get all CSI divisions
 */
router.get('/csi/divisions', async (req: Request, res: Response) => {
  try {
    const divisions = csiService.getAllDivisions();
    res.json(divisions);
  } catch (error: any) {
    console.error('Error getting CSI divisions:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/costs/:id/recalculate
 * Recalculate a cost item based on updated quantity
 */
router.post(
  '/:id/recalculate',
  [param('id').isUUID().withMessage('Valid cost item ID required')],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { id } = req.params;

      // Get current item to get project ID
      const { CostRepository } = await import('../repositories/CostRepository');
      const costRepo = new CostRepository(db);
      const currentItem = await costRepo.findItemById(id);

      if (!currentItem) {
        return res.status(404).json({ error: 'Cost item not found' });
      }

      const recalculatedItem = await costService.recalculateCostItem(id);

      // Broadcast update to connected clients
      broadcastCostUpdate(currentItem.projectId, 'cost:recalculated', {
        costItem: recalculatedItem,
        timestamp: new Date().toISOString(),
      });

      res.json(recalculatedItem);
    } catch (error: any) {
      console.error('Error recalculating cost item:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * POST /api/costs/estimates
 * Create a cost estimate with totals
 * Property 22: Project totals include all components
 */
router.post(
  '/estimates',
  [
    body('projectId').isUUID().withMessage('Valid project ID required'),
    body('name').isString().notEmpty().withMessage('Estimate name required'),
    body('contingencyPercent').optional().isFloat({ min: 0, max: 1 }).withMessage('Contingency must be between 0 and 1'),
    body('overheadPercent').optional().isFloat({ min: 0, max: 1 }).withMessage('Overhead must be between 0 and 1'),
    body('profitPercent').optional().isFloat({ min: 0, max: 1 }).withMessage('Profit must be between 0 and 1'),
    body('indirectCosts').optional().isFloat({ min: 0 }).withMessage('Indirect costs must be positive'),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { projectId, name, contingencyPercent, overheadPercent, profitPercent, indirectCosts } = req.body;

      const options = {
        contingencyPercent,
        overheadPercent,
        profitPercent,
        indirectCosts,
      };

      const estimate = await costService.createCostEstimate(
        projectId,
        name,
        options,
        req.body.createdBy // This would come from auth middleware in production
      );

      // Broadcast estimate creation to connected clients
      broadcastCostUpdate(projectId, 'estimate:created', {
        estimate,
        timestamp: new Date().toISOString(),
      });

      res.status(201).json(estimate);
    } catch (error: any) {
      console.error('Error creating cost estimate:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * GET /api/costs/estimates/:projectId/totals
 * Calculate estimate totals without creating an estimate
 * Property 22: Project totals include all components
 */
router.get(
  '/estimates/:projectId/totals',
  [
    param('projectId').isUUID().withMessage('Valid project ID required'),
    query('contingencyPercent').optional().isFloat({ min: 0, max: 1 }),
    query('overheadPercent').optional().isFloat({ min: 0, max: 1 }),
    query('profitPercent').optional().isFloat({ min: 0, max: 1 }),
    query('indirectCosts').optional().isFloat({ min: 0 }),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { projectId } = req.params;
      const { contingencyPercent, overheadPercent, profitPercent, indirectCosts } = req.query;

      const options = {
        contingencyPercent: contingencyPercent ? parseFloat(contingencyPercent as string) : undefined,
        overheadPercent: overheadPercent ? parseFloat(overheadPercent as string) : undefined,
        profitPercent: profitPercent ? parseFloat(profitPercent as string) : undefined,
        indirectCosts: indirectCosts ? parseFloat(indirectCosts as string) : undefined,
      };

      const totals = await costService.calculateEstimateTotals(projectId, options);

      res.json({
        projectId,
        ...totals,
        currency: 'USD',
      });
    } catch (error: any) {
      console.error('Error calculating estimate totals:', error);
      res.status(500).json({ error: error.message });
    }
  }
);

export default router;
