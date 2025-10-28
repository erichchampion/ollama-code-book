/**
 * Regression testing for AI outputs
 */
export class RegressionTestSuite {
  private baseline: Map<string, BaselineResponse> = new Map();

  constructor(private baselinePath: string) {}

  /**
   * Load baseline responses
   */
  async loadBaseline(): Promise<void> {
    const data = await fs.readFile(this.baselinePath, 'utf-8');
    const baseline = JSON.parse(data);

    for (const [key, value] of Object.entries(baseline)) {
      this.baseline.set(key, value as BaselineResponse);
    }
  }

  /**
   * Save baseline responses
   */
  async saveBaseline(): Promise<void> {
    const baseline = Object.fromEntries(this.baseline);
    await fs.writeFile(
      this.baselinePath,
      JSON.stringify(baseline, null, 2)
    );
  }

  /**
   * Test against baseline
   */
  async testAgainstBaseline(
    key: string,
    currentResponse: string,
    qualityCriteria: QualityCriteria
  ): Promise<RegressionResult> {
    const baseline = this.baseline.get(key);

    if (!baseline) {
      // No baseline - create one
      this.baseline.set(key, {
        response: currentResponse,
        qualityScore: await AIAssertions['calculateQualityScore'](
          currentResponse,
          qualityCriteria
        ),
        timestamp: new Date().toISOString()
      });

      return {
        status: 'new',
        message: 'New baseline created'
      };
    }

    // Calculate current quality score
    const currentScore = await AIAssertions['calculateQualityScore'](
      currentResponse,
      qualityCriteria
    );

    // Compare with baseline
    const scoreDiff = currentScore - baseline.qualityScore;

    if (scoreDiff < -10) {
      // Significant regression
      return {
        status: 'regression',
        message: `Quality dropped by ${Math.abs(scoreDiff).toFixed(2)} points`,
        baselineScore: baseline.qualityScore,
        currentScore,
        diff: scoreDiff
      };
    } else if (scoreDiff > 10) {
      // Significant improvement - update baseline
      this.baseline.set(key, {
        response: currentResponse,
        qualityScore: currentScore,
        timestamp: new Date().toISOString()
      });

      return {
        status: 'improvement',
        message: `Quality improved by ${scoreDiff.toFixed(2)} points`,
        baselineScore: baseline.qualityScore,
        currentScore,
        diff: scoreDiff
      };
    } else {
      // No significant change
      return {
        status: 'passed',
        message: 'Quality within acceptable range',
        baselineScore: baseline.qualityScore,
        currentScore,
        diff: scoreDiff
      };
    }
  }
}

interface BaselineResponse {
  response: string;
  qualityScore: number;
  timestamp: string;
}

interface RegressionResult {
  status: 'new' | 'passed' | 'regression' | 'improvement';
  message: string;
  baselineScore?: number;
  currentScore?: number;
  diff?: number;
}