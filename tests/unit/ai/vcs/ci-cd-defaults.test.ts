/**
 * Tests for CI/CD Configuration Defaults
 *
 * Test suite for centralized configuration constants and security functions
 * to ensure consistency across all CI/CD platforms.
 */

import {
  CI_CONFIG,
  getAnalysisCommand,
  sanitizeShellVariable,
  validateQualityGate,
  generateQualitySummary,
  CI_QUALITY_GATES,
  CI_ANALYSIS_CONFIG,
  CI_BUILD_CONFIG,
  CI_PLATFORM_OVERRIDES
} from '../../../../src/ai/vcs/config/ci-cd-defaults.js';

describe('CI/CD Configuration Defaults', () => {

  describe('Quality Gates Configuration', () => {
    it('should have consistent quality gate thresholds', () => {
      expect(CI_QUALITY_GATES.minQualityScore).toBe(80);
      expect(CI_QUALITY_GATES.maxCriticalIssues).toBe(0);
      expect(CI_QUALITY_GATES.maxSecurityIssues).toBe(5);
      expect(CI_QUALITY_GATES.maxPerformanceIssues).toBe(3);
      expect(CI_QUALITY_GATES.minTestCoverage).toBe(80);
    });

    it('should have valid regression threshold options', () => {
      const validThresholds = ['low', 'medium', 'high'];
      expect(validThresholds).toContain(CI_QUALITY_GATES.regressionThreshold);
    });
  });

  describe('Analysis Configuration', () => {
    it('should have reasonable timeout settings', () => {
      expect(CI_ANALYSIS_CONFIG.analysisTimeoutSeconds).toBe(300);
      expect(CI_ANALYSIS_CONFIG.analysisTimeoutMs).toBe(300000);
      expect(CI_ANALYSIS_CONFIG.analysisTimeoutMs).toBe(CI_ANALYSIS_CONFIG.analysisTimeoutSeconds * 1000);
    });

    it('should enable security analysis by default', () => {
      expect(CI_ANALYSIS_CONFIG.enableSecurity).toBe(true);
      expect(CI_ANALYSIS_CONFIG.enablePerformance).toBe(true);
      expect(CI_ANALYSIS_CONFIG.enableArchitecture).toBe(true);
      expect(CI_ANALYSIS_CONFIG.enableRegression).toBe(true);
    });

    it('should have valid report format', () => {
      const validFormats = ['json', 'junit', 'sarif', 'markdown', 'html'];
      expect(validFormats).toContain(CI_ANALYSIS_CONFIG.reportFormat);
    });
  });

  describe('Build Configuration', () => {
    it('should use consistent Node.js version across platforms', () => {
      expect(CI_BUILD_CONFIG.nodeVersion).toBe('20');
      expect(CI_BUILD_CONFIG.nodeVersionSpec).toBe('20.x');
      expect(CI_BUILD_CONFIG.nodeImage).toContain('node:20');
      expect(CI_BUILD_CONFIG.nodeImageAlpine).toContain('node:20-alpine');
    });

    it('should use yarn as package manager', () => {
      expect(CI_BUILD_CONFIG.installCommand).toContain('yarn');
      expect(CI_BUILD_CONFIG.buildCommand).toContain('yarn');
      expect(CI_BUILD_CONFIG.testCommand).toContain('yarn');
      expect(CI_BUILD_CONFIG.yarnLockfile).toBe('yarn.lock');
    });
  });

  describe('Platform Overrides', () => {
    it('should have overrides for all supported platforms', () => {
      const platforms = ['gitlab', 'azure', 'circleci', 'bitbucket', 'github'];
      platforms.forEach(platform => {
        expect(CI_PLATFORM_OVERRIDES).toHaveProperty(platform);
      });
    });

    it('should maintain Node.js version consistency in overrides', () => {
      expect(CI_PLATFORM_OVERRIDES.gitlab.nodeImage).toContain('node:20');
      expect(CI_PLATFORM_OVERRIDES.azure.nodeVersionSpec).toBe('20.x');
      expect(CI_PLATFORM_OVERRIDES.circleci.nodeImage).toContain('node:20');
      expect(CI_PLATFORM_OVERRIDES.bitbucket.nodeImage).toContain('node:20');
    });
  });
});

describe('getAnalysisCommand', () => {
  it('should generate complete analysis command with all parameters', () => {
    const command = getAnalysisCommand('github');

    expect(command).toContain('node dist/src/ai/vcs/ci-pipeline-integrator.js');
    expect(command).toContain('--platform github');
    expect(command).toContain('--repository-path .');
    expect(command).toContain('--min-quality-score 80');
    expect(command).toContain('--max-critical-issues 0');
    expect(command).toContain('--max-security-issues 5');
    expect(command).toContain('--report-format json');
  });

  it('should accept custom configuration overrides', () => {
    const customConfig = {
      reportFormat: 'sarif' as const,
      outputPath: './custom-reports'
    };

    const command = getAnalysisCommand('gitlab', customConfig);
    expect(command).toContain('--report-format sarif');
    expect(command).toContain('--output-path ./custom-reports');
  });

  it('should include all quality gate parameters', () => {
    const command = getAnalysisCommand('azure');

    expect(command).toContain('--enable-security true');
    expect(command).toContain('--enable-performance true');
    expect(command).toContain('--enable-architecture true');
    expect(command).toContain('--enable-regression true');
    expect(command).toContain('--regression-threshold medium');
  });
});

describe('sanitizeShellVariable', () => {
  it('should remove dangerous shell metacharacters', () => {
    const dangerous = 'value; rm -rf /';
    const sanitized = sanitizeShellVariable(dangerous, 'fallback');
    expect(sanitized).toBe('valuerm-rf');  // Hyphens in filenames are safe
    expect(sanitized).not.toContain(';');
    expect(sanitized).not.toContain(' ');
  });

  it('should preserve safe characters', () => {
    const safe = 'my-project_v1.2.3/path';
    const sanitized = sanitizeShellVariable(safe, 'fallback');
    expect(sanitized).toBe('my-project_v1.2.3/path');
  });

  it('should return fallback for empty or undefined values', () => {
    expect(sanitizeShellVariable('', 'fallback')).toBe('fallback');
    expect(sanitizeShellVariable(undefined, 'fallback')).toBe('fallback');
  });

  it('should return fallback when sanitization removes everything', () => {
    const onlyDangerous = '; | && ||';
    const sanitized = sanitizeShellVariable(onlyDangerous, 'fallback');
    expect(sanitized).toBe('fallback');
  });

  it('should handle injection attempts', () => {
    const injectionAttempts = [
      '$(malicious command)',
      '`evil command`',
      '${DANGEROUS_VAR}',
      'value && rm -rf /',
      'value || echo "hacked"',
      'value; cat /etc/passwd'
    ];

    injectionAttempts.forEach(attempt => {
      const sanitized = sanitizeShellVariable(attempt, 'safe');
      expect(sanitized).not.toContain('$(');
      expect(sanitized).not.toContain('`');
      expect(sanitized).not.toContain('&&');
      expect(sanitized).not.toContain('||');
      expect(sanitized).not.toContain(';');
    });
  });
});

describe('validateQualityGate', () => {
  it('should validate successful quality gate results', () => {
    const goodResult = {
      overallScore: 85,
      qualityGatePassed: true
    };

    const validation = validateQualityGate(goodResult);
    expect(validation.passed).toBe(true);
    expect(validation.score).toBe(85);
    expect(validation.message).toContain('Quality gates passed');
  });

  it('should handle failed quality gate results', () => {
    const badResult = {
      overallScore: 60,
      qualityGatePassed: false
    };

    const validation = validateQualityGate(badResult);
    expect(validation.passed).toBe(false);
    expect(validation.score).toBe(60);
    expect(validation.message).toContain('Quality gates failed');
  });

  it('should handle string boolean values', () => {
    const stringResult = {
      overallScore: '90',
      qualityGatePassed: 'true'
    };

    const validation = validateQualityGate(stringResult);
    expect(validation.passed).toBe(true);
    expect(validation.score).toBe(90);
  });

  it('should handle invalid or missing results', () => {
    const invalidResults = [null, undefined, {}, { invalidFormat: true }];

    invalidResults.forEach(result => {
      const validation = validateQualityGate(result);
      expect(validation.passed).toBe(false);
      expect(validation.score).toBe(0);
      expect(validation.message).toContain('Invalid analysis result');
    });
  });
});

describe('generateQualitySummary', () => {
  it('should generate comprehensive quality summary', () => {
    const result = {
      overallScore: 85,
      qualityGatePassed: true,
      results: {
        security: { totalVulnerabilities: 2 },
        performance: { totalIssues: 1 },
        regression: { overallRisk: 'low' }
      },
      recommendations: [
        'Fix SQL injection vulnerability',
        'Optimize database queries',
        'Add unit tests for new features'
      ]
    };

    const summary = generateQualitySummary(result);

    expect(summary).toContain('Overall Quality Score: 85/100');
    expect(summary).toContain('Security Issues: 2');
    expect(summary).toContain('Performance Issues: 1');
    expect(summary).toContain('Regression Risk: low');
    expect(summary).toContain('Fix SQL injection vulnerability');
    expect(summary).toContain('✅ All quality gates passed');
  });

  it('should handle failed quality gates', () => {
    const result = {
      overallScore: 60,
      qualityGatePassed: false,
      results: {
        security: { totalVulnerabilities: 5 },
        performance: { totalIssues: 3 },
        regression: { overallRisk: 'high' }
      }
    };

    const summary = generateQualitySummary(result);
    expect(summary).toContain('❌ Quality gates failed');
    expect(summary).toContain('Security Issues: 5');
    expect(summary).toContain('Regression Risk: high');
  });

  it('should handle missing or undefined metrics gracefully', () => {
    const incompleteResult = {
      overallScore: 75
    };

    const summary = generateQualitySummary(incompleteResult);
    expect(summary).toContain('Overall Quality Score: 75/100');
    expect(summary).toContain('Security Issues: 0');
    expect(summary).toContain('Performance Issues: 0');
    expect(summary).toContain('Regression Risk: unknown');
  });

  it('should limit recommendations to top 5', () => {
    const result = {
      overallScore: 80,
      recommendations: [
        'Recommendation 1', 'Recommendation 2', 'Recommendation 3',
        'Recommendation 4', 'Recommendation 5', 'Recommendation 6',
        'Recommendation 7', 'Recommendation 8'
      ]
    };

    const summary = generateQualitySummary(result);
    const recommendationLines = summary.split('\n').filter(line => line.startsWith('- '));
    expect(recommendationLines.length).toBeLessThanOrEqual(5);
  });
});

describe('CI_CONFIG consolidated object', () => {
  it('should export all configuration sections', () => {
    expect(CI_CONFIG.qualityGates).toBeDefined();
    expect(CI_CONFIG.analysis).toBeDefined();
    expect(CI_CONFIG.build).toBeDefined();
    expect(CI_CONFIG.artifacts).toBeDefined();
    expect(CI_CONFIG.security).toBeDefined();
    expect(CI_CONFIG.performance).toBeDefined();
    expect(CI_CONFIG.regression).toBeDefined();
    expect(CI_CONFIG.branches).toBeDefined();
    expect(CI_CONFIG.messages).toBeDefined();
    expect(CI_CONFIG.platformOverrides).toBeDefined();
  });

  it('should export utility functions', () => {
    expect(typeof CI_CONFIG.getAnalysisCommand).toBe('function');
    expect(typeof CI_CONFIG.sanitizeShellVariable).toBe('function');
    expect(typeof CI_CONFIG.validateQualityGate).toBe('function');
    expect(typeof CI_CONFIG.generateQualitySummary).toBe('function');
  });
});