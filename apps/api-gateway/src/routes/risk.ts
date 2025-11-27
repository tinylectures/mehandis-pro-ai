import { Router, Request, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { RiskService } from '../services/RiskService';
import db from '../database/db';

const router = Router();

// Initialize service
const riskService = new RiskService(db);

/**
 * POST /api/risk/monte-carlo
 * Run Monte Carlo simulation
 */
router.post(
  '/monte-carlo',
  [
    body('baseEstimate').isFloat({ min: 0 }).withMessage('Base estimate must be a positive number'),
    body('uncertainties').isArray().withMessage('Uncertainties must be an array'),
    body('uncertainties.*.itemId').isString().withMessage('Item ID required'),
    body('uncertainties.*.distributionType')
      .isIn(['normal', 'triangular', 'uniform'])
      .withMessage('Valid distribution type required'),
    body('uncertainties.*.parameters').isObject().withMessage('Parameters object required'),
    body('iterations').isInt({ min: 1 }).withMessage('Iterations must be at least 1'),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { baseEstimate, uncertainties, iterations } = req.body;

      const result = await riskService.runMonteCarloSimulation(
        baseEstimate,
        uncertainties,
        iterations
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error('Error running Monte Carlo simulation:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to run Monte Carlo simulation',
      });
    }
  }
);

/**
 * POST /api/risk/assess
 * Assess project risks
 */
router.post(
  '/assess',
  [
    body('projectId').isUUID().withMessage('Valid project ID required'),
    body('risks').isArray().withMessage('Risks must be an array'),
    body('risks.*.id').isString().withMessage('Risk ID required'),
    body('risks.*.type')
      .isIn(['cost_overrun', 'schedule_delay', 'quality_issues'])
      .withMessage('Valid risk type required'),
    body('risks.*.description').isString().withMessage('Risk description required'),
    body('risks.*.probability')
      .isFloat({ min: 0, max: 1 })
      .withMessage('Probability must be between 0 and 1'),
    body('risks.*.impact').isFloat({ min: 0 }).withMessage('Impact must be positive'),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { projectId, risks } = req.body;

      const assessment = await riskService.assessProjectRisks(projectId, risks);

      res.json({
        success: true,
        data: assessment,
      });
    } catch (error: any) {
      console.error('Error assessing project risks:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to assess project risks',
      });
    }
  }
);

/**
 * POST /api/risk/exposure
 * Calculate risk exposure
 */
router.post(
  '/exposure',
  [
    body('risks').isArray().withMessage('Risks must be an array'),
    body('risks.*.id').isString().withMessage('Risk ID required'),
    body('risks.*.type')
      .isIn(['cost_overrun', 'schedule_delay', 'quality_issues'])
      .withMessage('Valid risk type required'),
    body('risks.*.description').isString().withMessage('Risk description required'),
    body('risks.*.probability')
      .isFloat({ min: 0, max: 1 })
      .withMessage('Probability must be between 0 and 1'),
    body('risks.*.impact').isFloat({ min: 0 }).withMessage('Impact must be positive'),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { risks } = req.body;

      const exposure = await riskService.calculateRiskExposure(risks);

      res.json({
        success: true,
        data: exposure,
      });
    } catch (error: any) {
      console.error('Error calculating risk exposure:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to calculate risk exposure',
      });
    }
  }
);

/**
 * POST /api/risk/sensitivity
 * Perform sensitivity analysis
 */
router.post(
  '/sensitivity',
  [
    body('projectId').isUUID().withMessage('Valid project ID required'),
    body('variables').isArray().withMessage('Variables must be an array'),
    body('variables.*.name').isString().withMessage('Variable name required'),
    body('variables.*.baseValue').isFloat({ min: 0 }).withMessage('Base value must be positive'),
    body('variables.*.variationPercent')
      .isFloat({ min: 0, max: 1 })
      .withMessage('Variation percent must be between 0 and 1'),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { projectId, variables } = req.body;

      const result = await riskService.performSensitivityAnalysis(projectId, variables);

      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error('Error performing sensitivity analysis:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to perform sensitivity analysis',
      });
    }
  }
);

/**
 * POST /api/risk/contingency
 * Calculate risk-based contingency
 */
router.post(
  '/contingency',
  [
    body('riskExposure').isObject().withMessage('Risk exposure object required'),
    body('riskExposure.costOverrun').isFloat({ min: 0 }).withMessage('Cost overrun must be positive'),
    body('riskExposure.scheduleDelay').isFloat({ min: 0 }).withMessage('Schedule delay must be positive'),
    body('riskExposure.qualityIssues').isFloat({ min: 0 }).withMessage('Quality issues must be positive'),
    body('riskExposure.totalExposure').isFloat({ min: 0 }).withMessage('Total exposure must be positive'),
    body('confidenceLevel')
      .optional()
      .isFloat({ min: 0, max: 1 })
      .withMessage('Confidence level must be between 0 and 1'),
  ],
  async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { riskExposure, confidenceLevel } = req.body;

      const contingency = await riskService.calculateRiskBasedContingency(
        riskExposure,
        confidenceLevel
      );

      res.json({
        success: true,
        data: { contingency },
      });
    } catch (error: any) {
      console.error('Error calculating contingency:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to calculate contingency',
      });
    }
  }
);

export default router;
