import { Router, Request, Response } from 'express';
import { QuantityService } from '../services/QuantityService';
import { authenticate, AuthRequest } from '../middleware/auth';
import { QuantityRepository } from '../repositories/QuantityRepository';
import { AuthService } from '../services/AuthService';
import db from '../database/db';

export const createQuantityRouter = (authService: AuthService) => {
  const router = Router();
  const quantityService = new QuantityService(db);
  const quantityRepo = new QuantityRepository(db);
  const authMiddleware = authenticate(authService);

/**
 * POST /api/quantities/calculate/:modelId
 * Calculate quantities for all elements in a BIM model
 */
router.post('/calculate/:modelId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { modelId } = req.params;
    const { projectId, wasteFactor, unit } = req.body;
    const userId = (req as any).user?.userId;

    if (!projectId) {
      return res.status(400).json({
        error: {
          code: 'MISSING_PROJECT_ID',
          message: 'Project ID is required',
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] as string,
          path: req.path,
        },
      });
    }

    const results = await quantityService.calculateQuantitiesForModel(modelId, projectId, {
      wasteFactor,
      unit,
      calculatedBy: userId,
    });

    res.status(200).json({
      success: true,
      data: results,
      metadata: {
        modelId,
        projectId,
        elementCount: results.length,
        totalQuantities: results.reduce((sum, r) => sum + r.quantities.length, 0),
      },
    });
  } catch (error: any) {
    console.error('Error calculating quantities:', error);
    res.status(500).json({
      error: {
        code: 'CALCULATION_ERROR',
        message: error.message || 'Failed to calculate quantities',
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string,
        path: req.path,
      },
    });
  }
});

/**
 * GET /api/quantities/project/:projectId
 * Get all quantities for a project
 */
router.get('/project/:projectId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { projectId } = req.params;
    const { category, quantityType, elementId } = req.query;

    const quantities = await quantityRepo.findByProject(projectId, {
      category: category as string,
      quantityType: quantityType as any,
      elementId: elementId as string,
    });

    res.status(200).json({
      success: true,
      data: quantities,
      metadata: {
        projectId,
        count: quantities.length,
      },
    });
  } catch (error: any) {
    console.error('Error fetching quantities:', error);
    res.status(500).json({
      error: {
        code: 'FETCH_ERROR',
        message: error.message || 'Failed to fetch quantities',
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string,
        path: req.path,
      },
    });
  }
});

/**
 * GET /api/quantities/:id
 * Get a specific quantity by ID
 */
router.get('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const quantity = await quantityRepo.findById(id);

    if (!quantity) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: `Quantity ${id} not found`,
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] as string,
          path: req.path,
        },
      });
    }

    res.status(200).json({
      success: true,
      data: quantity,
    });
  } catch (error: any) {
    console.error('Error fetching quantity:', error);
    res.status(500).json({
      error: {
        code: 'FETCH_ERROR',
        message: error.message || 'Failed to fetch quantity',
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string,
        path: req.path,
      },
    });
  }
});

/**
 * PATCH /api/quantities/:id/waste-factor
 * Update waste factor for a quantity
 */
router.patch('/:id/waste-factor', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { wasteFactor } = req.body;

    if (wasteFactor === undefined || wasteFactor < 0 || wasteFactor > 1) {
      return res.status(400).json({
        error: {
          code: 'INVALID_WASTE_FACTOR',
          message: 'Waste factor must be between 0 and 1',
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] as string,
          path: req.path,
        },
      });
    }

    const quantity = await quantityService.recalculateWithWasteFactor(id, wasteFactor);

    res.status(200).json({
      success: true,
      data: quantity,
    });
  } catch (error: any) {
    console.error('Error updating waste factor:', error);
    
    if (error.message.includes('not found')) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: error.message,
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] as string,
          path: req.path,
        },
      });
    }

    res.status(500).json({
      error: {
        code: 'UPDATE_ERROR',
        message: error.message || 'Failed to update waste factor',
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string,
        path: req.path,
      },
    });
  }
});

/**
 * PATCH /api/quantities/:id
 * Update a quantity
 */
router.patch('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { value, unit, wasteFactor, calculationMethod, metadata } = req.body;

    const quantity = await quantityRepo.update(id, {
      value,
      unit,
      wasteFactor,
      calculationMethod,
      metadata,
    });

    if (!quantity) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: `Quantity ${id} not found`,
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] as string,
          path: req.path,
        },
      });
    }

    res.status(200).json({
      success: true,
      data: quantity,
    });
  } catch (error: any) {
    console.error('Error updating quantity:', error);
    res.status(500).json({
      error: {
        code: 'UPDATE_ERROR',
        message: error.message || 'Failed to update quantity',
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string,
        path: req.path,
      },
    });
  }
});

/**
 * DELETE /api/quantities/:id
 * Delete a quantity
 */
router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const deleted = await quantityRepo.delete(id);

    if (!deleted) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: `Quantity ${id} not found`,
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] as string,
          path: req.path,
        },
      });
    }

    res.status(200).json({
      success: true,
      message: 'Quantity deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting quantity:', error);
    res.status(500).json({
      error: {
        code: 'DELETE_ERROR',
        message: error.message || 'Failed to delete quantity',
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string,
        path: req.path,
      },
    });
  }
});

  return router;
};

export default createQuantityRouter;
