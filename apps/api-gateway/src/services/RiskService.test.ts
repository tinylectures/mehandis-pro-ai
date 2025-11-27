import { describe, it, expect, beforeEach, vi } from 'vitest';
import fc from 'fast-check';
import { RiskService, Uncertainty, Risk, Variable } from './RiskService';
import { CostRepository } from '../repositories/CostRepository';
import { CostItem } from '../models/Cost';

// Mock CostRepository
const createMockCostRepository = (): CostRepository => {
  const mockCostItems: CostItem[] = [
    {
      id: 'cost-1',
      projectId: 'project-1',
      quantityId: 'qty-1',
      csiCode: '03 30 00',
      description: 'Concrete',
      quantity: 100,
      unit: 'm3',
      unitCost: 150,
      totalCost: 15000,
      regionalAdjustment: 1.0,
      adjustedUnitCost: 150,
      adjustedTotalCost: 15000,
      costType: 'material',
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1,
    },
    {
      id: 'cost-2',
      projectId: 'project-1',
      quantityId: 'qty-2',
      csiCode: '05 12 00',
      description: 'Structural Steel',
      quantity: 50,
      unit: 'ton',
      unitCost: 2000,
      totalCost: 100000,
      regionalAdjustment: 1.0,
      adjustedUnitCost: 2000,
      adjustedTotalCost: 100000,
      costType: 'material',
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1,
    },
  ];

  return {
    findItemsByProject: vi.fn(async (_projectId: string): Promise<CostItem[]> => {
      return mockCostItems;
    }),
  } as any;
};

describe('RiskService', () => {
  let riskService: RiskService;
  let mockCostRepo: CostRepository;

  beforeEach(() => {
    mockCostRepo = createMockCostRepository();
    riskService = new RiskService(null as any);
    (riskService as any).costRepo = mockCostRepo;
  });

  describe('Monte Carlo Simulation', () => {
    // Feature: construct-ai-platform, Property 27: Monte Carlo runs specified iterations
    it('should run exactly the specified number of iterations', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 1000 }), // iterations
          fc.float({ min: 1000, max: 100000 }), // base estimate
          async (iterations, baseEstimate) => {
            const uncertainties: Uncertainty[] = [
              {
                itemId: 'item-1',
                distributionType: 'normal',
                parameters: { mean: 0, stdDev: 100 },
              },
            ];

            const result = await riskService.runMonteCarloSimulation(
              baseEstimate,
              uncertainties,
              iterations
            );

            expect(result.iterations).toBe(iterations);
            expect(result.distribution.length).toBe(iterations);
          }
        ),
        { numRuns: 100 }
      );
    });

    // Feature: construct-ai-platform, Property 28: Simulation reports all percentiles
    it('should report P10, P50, and P90 percentiles', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.float({ min: 1000, max: 100000 }), // base estimate
          async (baseEstimate) => {
            const uncertainties: Uncertainty[] = [
              {
                itemId: 'item-1',
                distributionType: 'uniform',
                parameters: { min: -1000, max: 1000 },
              },
            ];

            const result = await riskService.runMonteCarloSimulation(
              baseEstimate,
              uncertainties,
              1000
            );

            // All percentiles should be defined
            expect(result.p10).toBeDefined();
            expect(result.p50).toBeDefined();
            expect(result.p90).toBeDefined();

            // Percentiles should be in order: P10 <= P50 <= P90
            expect(result.p10).toBeLessThanOrEqual(result.p50);
            expect(result.p50).toBeLessThanOrEqual(result.p90);

            // Mean and stdDev should be defined
            expect(result.mean).toBeDefined();
            expect(result.stdDev).toBeDefined();
            expect(result.stdDev).toBeGreaterThanOrEqual(0);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should handle normal distribution uncertainties', async () => {
      const baseEstimate = 50000;
      const uncertainties: Uncertainty[] = [
        {
          itemId: 'item-1',
          distributionType: 'normal',
          parameters: { mean: 0, stdDev: 5000 },
        },
      ];

      const result = await riskService.runMonteCarloSimulation(
        baseEstimate,
        uncertainties,
        1000
      );

      expect(result.mean).toBeGreaterThan(0);
      expect(result.stdDev).toBeGreaterThan(0);
      expect(result.distribution.length).toBe(1000);
    });

    it('should handle triangular distribution uncertainties', async () => {
      const baseEstimate = 50000;
      const uncertainties: Uncertainty[] = [
        {
          itemId: 'item-1',
          distributionType: 'triangular',
          parameters: { min: -5000, mode: 0, max: 10000 },
        },
      ];

      const result = await riskService.runMonteCarloSimulation(
        baseEstimate,
        uncertainties,
        1000
      );

      expect(result.mean).toBeGreaterThan(0);
      expect(result.distribution.length).toBe(1000);
    });

    it('should handle uniform distribution uncertainties', async () => {
      const baseEstimate = 50000;
      const uncertainties: Uncertainty[] = [
        {
          itemId: 'item-1',
          distributionType: 'uniform',
          parameters: { min: -2000, max: 8000 },
        },
      ];

      const result = await riskService.runMonteCarloSimulation(
        baseEstimate,
        uncertainties,
        1000
      );

      expect(result.mean).toBeGreaterThan(0);
      expect(result.distribution.length).toBe(1000);
    });

    it('should handle multiple uncertainties', async () => {
      const baseEstimate = 50000;
      const uncertainties: Uncertainty[] = [
        {
          itemId: 'item-1',
          distributionType: 'normal',
          parameters: { mean: 0, stdDev: 1000 },
        },
        {
          itemId: 'item-2',
          distributionType: 'uniform',
          parameters: { min: -500, max: 1500 },
        },
        {
          itemId: 'item-3',
          distributionType: 'triangular',
          parameters: { min: -1000, mode: 0, max: 2000 },
        },
      ];

      const result = await riskService.runMonteCarloSimulation(
        baseEstimate,
        uncertainties,
        1000
      );

      expect(result.mean).toBeGreaterThan(0);
      expect(result.distribution.length).toBe(1000);
    });

    it('should throw error for invalid iterations', async () => {
      const baseEstimate = 50000;
      const uncertainties: Uncertainty[] = [];

      await expect(
        riskService.runMonteCarloSimulation(baseEstimate, uncertainties, 0)
      ).rejects.toThrow('Iterations must be at least 1');
    });
  });

  describe('Risk Assessment', () => {
    // Feature: construct-ai-platform, Property 29: Risk assessment covers all risk types
    it('should calculate risk exposure for all risk types', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              id: fc.string(),
              type: fc.constantFrom('cost_overrun', 'schedule_delay', 'quality_issues'),
              description: fc.string(),
              probability: fc.float({ min: 0, max: 1, noNaN: true }),
              impact: fc.float({ min: 0, max: 100000, noNaN: true }),
            }),
            { minLength: 1, maxLength: 20 }
          ),
          async (risks) => {
            const exposure = await riskService.calculateRiskExposure(risks);

            // All risk types should be present in exposure
            expect(exposure.costOverrun).toBeDefined();
            expect(exposure.scheduleDelay).toBeDefined();
            expect(exposure.qualityIssues).toBeDefined();
            expect(exposure.totalExposure).toBeDefined();

            // All values should be non-negative
            expect(exposure.costOverrun).toBeGreaterThanOrEqual(0);
            expect(exposure.scheduleDelay).toBeGreaterThanOrEqual(0);
            expect(exposure.qualityIssues).toBeGreaterThanOrEqual(0);
            expect(exposure.totalExposure).toBeGreaterThanOrEqual(0);

            // Total exposure should equal sum of individual exposures
            const sum = exposure.costOverrun + exposure.scheduleDelay + exposure.qualityIssues;
            expect(Math.abs(exposure.totalExposure - sum)).toBeLessThan(0.01);
          }
        ),
        { numRuns: 100 }
      );
    });

    // Feature: construct-ai-platform, Property 30: Risk results include distributions
    it('should include probability distributions in assessment', async () => {
      const projectId = 'project-1';
      const risks: Risk[] = [
        {
          id: 'risk-1',
          type: 'cost_overrun',
          description: 'Material price increase',
          probability: 0.3,
          impact: 10000,
        },
        {
          id: 'risk-2',
          type: 'schedule_delay',
          description: 'Weather delays',
          probability: 0.5,
          impact: 5000,
        },
        {
          id: 'risk-3',
          type: 'quality_issues',
          description: 'Rework required',
          probability: 0.2,
          impact: 8000,
        },
      ];

      const assessment = await riskService.assessProjectRisks(projectId, risks);

      // Should include distributions for all risk types
      expect(assessment.probabilityDistributions.cost_overrun).toBeDefined();
      expect(assessment.probabilityDistributions.schedule_delay).toBeDefined();
      expect(assessment.probabilityDistributions.quality_issues).toBeDefined();

      // Each distribution should have samples
      expect(assessment.probabilityDistributions.cost_overrun.length).toBeGreaterThan(0);
      expect(assessment.probabilityDistributions.schedule_delay.length).toBeGreaterThan(0);
      expect(assessment.probabilityDistributions.quality_issues.length).toBeGreaterThan(0);

      // Should include sensitivity analysis
      expect(assessment.sensitivityAnalysis).toBeDefined();
      expect(assessment.sensitivityAnalysis.factors).toBeDefined();
      expect(Array.isArray(assessment.sensitivityAnalysis.factors)).toBe(true);
    });

    it('should calculate risk exposure correctly', async () => {
      const risks: Risk[] = [
        {
          id: 'risk-1',
          type: 'cost_overrun',
          description: 'Risk 1',
          probability: 0.5,
          impact: 10000,
        },
        {
          id: 'risk-2',
          type: 'cost_overrun',
          description: 'Risk 2',
          probability: 0.3,
          impact: 5000,
        },
      ];

      const exposure = await riskService.calculateRiskExposure(risks);

      // Expected: (0.5 * 10000) + (0.3 * 5000) = 5000 + 1500 = 6500
      expect(exposure.costOverrun).toBeCloseTo(6500, 2);
      expect(exposure.totalExposure).toBeCloseTo(6500, 2);
    });
  });

  describe('Sensitivity Analysis', () => {
    it('should perform sensitivity analysis on variables', async () => {
      const projectId = 'project-1';
      const variables: Variable[] = [
        { name: 'Concrete', baseValue: 15000, variationPercent: 0.2 },
        { name: 'Steel', baseValue: 100000, variationPercent: 0.15 },
      ];

      const result = await riskService.performSensitivityAnalysis(projectId, variables);

      expect(result.factors).toBeDefined();
      expect(result.factors.length).toBe(2);

      // Factors should be sorted by sensitivity (highest first)
      for (let i = 0; i < result.factors.length - 1; i++) {
        expect(result.factors[i].sensitivity).toBeGreaterThanOrEqual(
          result.factors[i + 1].sensitivity
        );
      }

      // Each factor should have required properties
      result.factors.forEach((factor) => {
        expect(factor.factor).toBeDefined();
        expect(factor.impact).toBeGreaterThanOrEqual(0);
        expect(factor.sensitivity).toBeGreaterThanOrEqual(0);
      });
    });

    it('should handle empty variables list', async () => {
      const projectId = 'project-1';
      const variables: Variable[] = [];

      const result = await riskService.performSensitivityAnalysis(projectId, variables);

      expect(result.factors).toBeDefined();
      expect(result.factors.length).toBe(0);
    });
  });

  describe('Contingency Calculation', () => {
    // Feature: construct-ai-platform, Property 31: Contingency is risk-based
    it('should calculate contingency based on risk exposure', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.float({ min: 0, max: 100000, noNaN: true }), // cost overrun
          fc.float({ min: 0, max: 100000, noNaN: true }), // schedule delay
          fc.float({ min: 0, max: 100000, noNaN: true }), // quality issues
          fc.float({ min: Math.fround(0.5), max: Math.fround(0.95), noNaN: true }), // confidence level
          async (costOverrun, scheduleDelay, qualityIssues, confidenceLevel) => {
            const riskExposure = {
              costOverrun,
              scheduleDelay,
              qualityIssues,
              totalExposure: costOverrun + scheduleDelay + qualityIssues,
            };

            const contingency = await riskService.calculateRiskBasedContingency(
              riskExposure,
              confidenceLevel
            );

            // Contingency should be non-negative
            expect(contingency).toBeGreaterThanOrEqual(0);

            // Contingency should be proportional to total risk exposure
            // Higher risk exposure should result in higher contingency
            if (riskExposure.totalExposure > 0) {
              expect(contingency).toBeGreaterThan(0);
            }

            // Higher confidence level should result in higher contingency
            const lowerConfidenceContingency = await riskService.calculateRiskBasedContingency(
              riskExposure,
              0.5
            );
            const higherConfidenceContingency = await riskService.calculateRiskBasedContingency(
              riskExposure,
              0.9
            );

            if (riskExposure.totalExposure > 0) {
              expect(higherConfidenceContingency).toBeGreaterThan(lowerConfidenceContingency);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should calculate contingency with default confidence level', async () => {
      const riskExposure = {
        costOverrun: 10000,
        scheduleDelay: 5000,
        qualityIssues: 3000,
        totalExposure: 18000,
      };

      const contingency = await riskService.calculateRiskBasedContingency(riskExposure);

      expect(contingency).toBeGreaterThan(0);
      // With default 0.8 confidence: 18000 * (1 + (0.8 - 0.5) * 2) = 18000 * 1.6 = 28800
      expect(contingency).toBeCloseTo(28800, 2);
    });

    it('should handle zero risk exposure', async () => {
      const riskExposure = {
        costOverrun: 0,
        scheduleDelay: 0,
        qualityIssues: 0,
        totalExposure: 0,
      };

      const contingency = await riskService.calculateRiskBasedContingency(riskExposure, 0.8);

      expect(contingency).toBe(0);
    });
  });
});
