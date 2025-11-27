import { Knex } from 'knex';
import { CostRepository } from '../repositories/CostRepository';

/**
 * Represents an uncertainty in cost estimation
 */
export interface Uncertainty {
  itemId: string;
  distributionType: 'normal' | 'triangular' | 'uniform';
  parameters: {
    min?: number;
    max?: number;
    mean?: number;
    stdDev?: number;
    mode?: number; // For triangular distribution
  };
}

/**
 * Results from Monte Carlo simulation
 */
export interface SimulationResult {
  mean: number;
  stdDev: number;
  p10: number;
  p50: number; // median
  p90: number;
  distribution: number[];
  iterations: number;
}

/**
 * Risk types for assessment
 */
export type RiskType = 'cost_overrun' | 'schedule_delay' | 'quality_issues';

/**
 * Individual risk item
 */
export interface Risk {
  id: string;
  type: RiskType;
  description: string;
  probability: number; // 0-1
  impact: number; // monetary value
}

/**
 * Risk exposure calculation
 */
export interface RiskExposure {
  costOverrun: number;
  scheduleDelay: number;
  qualityIssues: number;
  totalExposure: number;
}

/**
 * Risk assessment results
 */
export interface RiskAssessment {
  projectId: string;
  riskExposure: RiskExposure;
  probabilityDistributions: {
    [key in RiskType]: number[];
  };
  sensitivityAnalysis: SensitivityResult;
}

/**
 * Variable for sensitivity analysis
 */
export interface Variable {
  name: string;
  baseValue: number;
  variationPercent: number; // e.g., 0.1 for ±10%
}

/**
 * Sensitivity analysis results
 */
export interface SensitivityResult {
  factors: Array<{
    factor: string;
    impact: number; // Change in total cost
    sensitivity: number; // Normalized sensitivity coefficient
  }>;
}

export interface IRiskService {
  runMonteCarloSimulation(
    baseEstimate: number,
    uncertainties: Uncertainty[],
    iterations: number
  ): Promise<SimulationResult>;
  assessProjectRisks(projectId: string, risks: Risk[]): Promise<RiskAssessment>;
  calculateRiskExposure(risks: Risk[]): Promise<RiskExposure>;
  performSensitivityAnalysis(projectId: string, variables: Variable[]): Promise<SensitivityResult>;
  calculateRiskBasedContingency(riskExposure: RiskExposure, confidenceLevel: number): Promise<number>;
}

export class RiskService implements IRiskService {
  private costRepo: CostRepository;

  constructor(db: Knex) {
    this.costRepo = new CostRepository(db);
  }

  /**
   * Run Monte Carlo simulation to estimate cost distribution
   * Property 27: Monte Carlo runs specified iterations
   * Property 28: Simulation reports all percentiles
   */
  async runMonteCarloSimulation(
    baseEstimate: number,
    uncertainties: Uncertainty[],
    iterations: number
  ): Promise<SimulationResult> {
    if (iterations < 1) {
      throw new Error('Iterations must be at least 1');
    }

    const samples: number[] = [];

    // Run simulation for specified number of iterations
    for (let i = 0; i < iterations; i++) {
      let totalCost = baseEstimate;

      // Apply uncertainties to each item
      for (const uncertainty of uncertainties) {
        const sample = this.sampleFromDistribution(uncertainty);
        totalCost += sample;
      }

      samples.push(totalCost);
    }

    // Sort samples for percentile calculations
    const sortedSamples = [...samples].sort((a, b) => a - b);

    // Calculate statistics
    const mean = this.calculateMean(samples);
    const stdDev = this.calculateStdDev(samples, mean);
    const p10 = this.calculatePercentile(sortedSamples, 0.10);
    const p50 = this.calculatePercentile(sortedSamples, 0.50);
    const p90 = this.calculatePercentile(sortedSamples, 0.90);

    return {
      mean,
      stdDev,
      p10,
      p50,
      p90,
      distribution: sortedSamples,
      iterations,
    };
  }

  /**
   * Assess project risks and calculate exposure
   * Property 29: Risk assessment covers all risk types
   * Property 30: Risk results include distributions
   */
  async assessProjectRisks(projectId: string, risks: Risk[]): Promise<RiskAssessment> {
    // Calculate risk exposure
    const riskExposure = await this.calculateRiskExposure(risks);

    // Generate probability distributions for each risk type
    const probabilityDistributions: { [key in RiskType]: number[] } = {
      cost_overrun: [],
      schedule_delay: [],
      quality_issues: [],
    };

    // Run Monte Carlo for each risk type
    const iterations = 1000;
    for (const riskType of Object.keys(probabilityDistributions) as RiskType[]) {
      const typeRisks = risks.filter((r) => r.type === riskType);
      const samples: number[] = [];

      for (let i = 0; i < iterations; i++) {
        let totalImpact = 0;
        for (const risk of typeRisks) {
          // Sample: risk occurs if random value < probability
          if (Math.random() < risk.probability) {
            totalImpact += risk.impact;
          }
        }
        samples.push(totalImpact);
      }

      probabilityDistributions[riskType] = samples.sort((a, b) => a - b);
    }

    // Get cost items for sensitivity analysis
    const costItems = await this.costRepo.findItemsByProject(projectId);
    
    // Create variables for top cost drivers
    const variables: Variable[] = costItems
      .sort((a, b) => b.adjustedTotalCost - a.adjustedTotalCost)
      .slice(0, 5) // Top 5 cost items
      .map((item) => ({
        name: item.description,
        baseValue: item.adjustedTotalCost,
        variationPercent: 0.2, // ±20% variation
      }));

    const sensitivityAnalysis = await this.performSensitivityAnalysis(projectId, variables);

    return {
      projectId,
      riskExposure,
      probabilityDistributions,
      sensitivityAnalysis,
    };
  }

  /**
   * Calculate risk exposure for different risk types
   * Property 29: Risk assessment covers all risk types
   */
  async calculateRiskExposure(risks: Risk[]): Promise<RiskExposure> {
    const exposure: RiskExposure = {
      costOverrun: 0,
      scheduleDelay: 0,
      qualityIssues: 0,
      totalExposure: 0,
    };

    for (const risk of risks) {
      // Risk exposure = probability × impact
      const riskExposure = risk.probability * risk.impact;

      switch (risk.type) {
        case 'cost_overrun':
          exposure.costOverrun += riskExposure;
          break;
        case 'schedule_delay':
          exposure.scheduleDelay += riskExposure;
          break;
        case 'quality_issues':
          exposure.qualityIssues += riskExposure;
          break;
      }

      exposure.totalExposure += riskExposure;
    }

    return exposure;
  }

  /**
   * Perform sensitivity analysis on project variables
   * Property 30: Risk results include distributions
   */
  async performSensitivityAnalysis(
    projectId: string,
    variables: Variable[]
  ): Promise<SensitivityResult> {
    // Get baseline total cost
    const costItems = await this.costRepo.findItemsByProject(projectId);
    const baselineCost = costItems.reduce((sum, item) => sum + item.adjustedTotalCost, 0);

    const factors: Array<{
      factor: string;
      impact: number;
      sensitivity: number;
    }> = [];

    // Calculate impact of each variable
    for (const variable of variables) {
      // Calculate impact of positive variation
      const positiveVariation = variable.baseValue * variable.variationPercent;
      const positiveImpact = positiveVariation;

      // Calculate impact of negative variation
      const negativeVariation = variable.baseValue * variable.variationPercent;
      const negativeImpact = negativeVariation;

      // Average absolute impact
      const avgImpact = (Math.abs(positiveImpact) + Math.abs(negativeImpact)) / 2;

      // Normalized sensitivity (impact as % of baseline)
      const sensitivity = baselineCost > 0 ? (avgImpact / baselineCost) * 100 : 0;

      factors.push({
        factor: variable.name,
        impact: avgImpact,
        sensitivity,
      });
    }

    // Sort by sensitivity (highest impact first)
    factors.sort((a, b) => b.sensitivity - a.sensitivity);

    return { factors };
  }

  /**
   * Calculate risk-based contingency
   * Property 31: Contingency is risk-based
   */
  async calculateRiskBasedContingency(
    riskExposure: RiskExposure,
    confidenceLevel: number = 0.8
  ): Promise<number> {
    // Base contingency on total risk exposure
    // Apply confidence level multiplier (higher confidence = higher contingency)
    const baseContingency = riskExposure.totalExposure;
    
    // Confidence level adjustment:
    // 50% confidence = 1.0x
    // 80% confidence = 1.5x
    // 90% confidence = 2.0x
    const confidenceMultiplier = 1 + (confidenceLevel - 0.5) * 2;
    
    const contingency = baseContingency * confidenceMultiplier;

    return contingency;
  }

  /**
   * Sample from a probability distribution
   */
  private sampleFromDistribution(uncertainty: Uncertainty): number {
    const { distributionType, parameters } = uncertainty;

    switch (distributionType) {
      case 'normal':
        return this.sampleNormal(parameters.mean || 0, parameters.stdDev || 1);
      
      case 'triangular':
        return this.sampleTriangular(
          parameters.min || 0,
          parameters.mode || 0,
          parameters.max || 0
        );
      
      case 'uniform':
        return this.sampleUniform(parameters.min || 0, parameters.max || 0);
      
      default:
        throw new Error(`Unknown distribution type: ${distributionType}`);
    }
  }

  /**
   * Sample from normal distribution using Box-Muller transform
   */
  private sampleNormal(mean: number, stdDev: number): number {
    const u1 = Math.random();
    const u2 = Math.random();
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return mean + z0 * stdDev;
  }

  /**
   * Sample from triangular distribution
   */
  private sampleTriangular(min: number, mode: number, max: number): number {
    const u = Math.random();
    const f = (mode - min) / (max - min);

    if (u < f) {
      return min + Math.sqrt(u * (max - min) * (mode - min));
    } else {
      return max - Math.sqrt((1 - u) * (max - min) * (max - mode));
    }
  }

  /**
   * Sample from uniform distribution
   */
  private sampleUniform(min: number, max: number): number {
    return min + Math.random() * (max - min);
  }

  /**
   * Calculate mean of samples
   */
  private calculateMean(samples: number[]): number {
    const sum = samples.reduce((acc, val) => acc + val, 0);
    return sum / samples.length;
  }

  /**
   * Calculate standard deviation
   */
  private calculateStdDev(samples: number[], mean: number): number {
    const squaredDiffs = samples.map((val) => Math.pow(val - mean, 2));
    const variance = squaredDiffs.reduce((acc, val) => acc + val, 0) / samples.length;
    return Math.sqrt(variance);
  }

  /**
   * Calculate percentile from sorted samples
   */
  private calculatePercentile(sortedSamples: number[], percentile: number): number {
    const index = Math.ceil(sortedSamples.length * percentile) - 1;
    return sortedSamples[Math.max(0, index)];
  }
}
