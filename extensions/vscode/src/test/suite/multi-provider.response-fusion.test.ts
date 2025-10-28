/**
 * Multi-Provider AI Integration - Response Fusion Tests
 * Tests combining and validating responses from multiple AI providers
 */

import * as assert from 'assert';
import { createTestWorkspace, cleanupTestWorkspace } from '../helpers/extensionTestHelper';
import {
	PROVIDER_TEST_TIMEOUTS,
	RESPONSE_FUSION_THRESHOLDS,
	RESPONSE_FUSION_WEIGHTS,
	RESPONSE_FUSION_PARAMS,
	RESPONSE_FUSION_TEST_DATA,
	CONTRADICTION_KEYWORDS,
} from '../helpers/test-constants';

suite('Multi-Provider AI Integration - Response Fusion Tests', () => {
	let testWorkspacePath: string;

	setup(async function () {
		this.timeout(PROVIDER_TEST_TIMEOUTS.SETUP);
		testWorkspacePath = await createTestWorkspace('response-fusion-tests');
	});

	teardown(async function () {
		this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);
		await cleanupTestWorkspace(testWorkspacePath);
	});

	// ====================================================================
	// Response Fusion System
	// ====================================================================

	interface ProviderResponse {
		provider: string;
		response: string;
		confidence: number; // 0-1
		responseTimeMs: number;
		tokenCount: number;
	}

	interface FusedResponse {
		primaryResponse: string;
		confidence: number;
		consensusLevel: number; // 0-1: How much providers agree
		contributingProviders: string[];
		conflicts: ResponseConflict[];
		fusionStrategy: 'highest_confidence' | 'consensus' | 'weighted_average' | 'majority_vote';
		qualityScore: number; // 0-1
	}

	interface ResponseConflict {
		aspect: string; // e.g., "implementation approach", "syntax preference"
		providerA: string;
		responseA: string;
		providerB: string;
		responseB: string;
		resolution: 'prefer_a' | 'prefer_b' | 'merge' | 'manual_review';
		rationale: string;
	}

	class ResponseFusion {
		/**
		 * Combine responses from multiple providers into a single fused response
		 */
		fuseResponses(responses: ProviderResponse[]): FusedResponse {
			if (responses.length === 0) {
				throw new Error('No responses to fuse');
			}

			if (responses.length === 1) {
				return {
					primaryResponse: responses[0].response,
					confidence: responses[0].confidence,
					consensusLevel: 1.0,
					contributingProviders: [responses[0].provider],
					conflicts: [],
					fusionStrategy: 'highest_confidence',
					qualityScore: responses[0].confidence,
				};
			}

			// Detect conflicts between responses
			const conflicts = this.detectConflicts(responses);

			// Choose fusion strategy based on response characteristics
			const strategy = this.chooseFusionStrategy(responses, conflicts);

			// Fuse responses using chosen strategy
			const fusedResponse = this.applyFusionStrategy(responses, strategy, conflicts);

			// Calculate consensus level
			const consensusLevel = this.calculateConsensus(responses);

			// Calculate quality score
			const qualityScore = this.calculateQualityScore(fusedResponse, consensusLevel, conflicts.length);

			return {
				primaryResponse: fusedResponse,
				confidence: this.calculateFusedConfidence(responses, strategy),
				consensusLevel,
				contributingProviders: responses.map(r => r.provider),
				conflicts,
				fusionStrategy: strategy,
				qualityScore,
			};
		}

		/**
		 * Detect conflicts between provider responses
		 */
		private detectConflicts(responses: ProviderResponse[]): ResponseConflict[] {
			const conflicts: ResponseConflict[] = [];

			// Compare each pair of responses
			for (let i = 0; i < responses.length; i++) {
				for (let j = i + 1; j < responses.length; j++) {
					const responseA = responses[i];
					const responseB = responses[j];

					// Calculate similarity (simple word overlap for demo)
					const similarity = this.calculateSimilarity(responseA.response, responseB.response);

					// If similarity is low, we have a conflict
					if (similarity < RESPONSE_FUSION_THRESHOLDS.SIMILARITY.CONFLICT_DETECTION) {
						const conflict = this.analyzeConflict(responseA, responseB);
						conflicts.push(conflict);
					}
				}
			}

			return conflicts;
		}

		/**
		 * Calculate similarity between two responses (0-1)
		 */
		private calculateSimilarity(responseA: string, responseB: string): number {
			const wordsA = new Set(responseA.toLowerCase().split(/\s+/));
			const wordsB = new Set(responseB.toLowerCase().split(/\s+/));

			const intersection = new Set([...wordsA].filter(x => wordsB.has(x)));
			const union = new Set([...wordsA, ...wordsB]);

			return intersection.size / union.size;
		}

		/**
		 * Analyze a specific conflict between two providers
		 */
		private analyzeConflict(responseA: ProviderResponse, responseB: ProviderResponse): ResponseConflict {
			// Determine resolution strategy
			let resolution: ResponseConflict['resolution'];
			let rationale: string;

			const confidenceDiff = RESPONSE_FUSION_THRESHOLDS.CONFIDENCE.SIGNIFICANT_DIFFERENCE;
			if (responseA.confidence > responseB.confidence + confidenceDiff) {
				resolution = 'prefer_a';
				rationale = `${responseA.provider} has significantly higher confidence (${responseA.confidence.toFixed(2)} vs ${responseB.confidence.toFixed(2)})`;
			} else if (responseB.confidence > responseA.confidence + confidenceDiff) {
				resolution = 'prefer_b';
				rationale = `${responseB.provider} has significantly higher confidence (${responseB.confidence.toFixed(2)} vs ${responseA.confidence.toFixed(2)})`;
			} else if (this.canMerge(responseA.response, responseB.response)) {
				resolution = 'merge';
				rationale = 'Responses are complementary and can be merged';
			} else {
				resolution = 'manual_review';
				rationale = 'Significant disagreement with similar confidence levels - manual review recommended';
			}

			return {
				aspect: 'implementation approach',
				providerA: responseA.provider,
				responseA: responseA.response,
				providerB: responseB.provider,
				responseB: responseB.response,
				resolution,
				rationale,
			};
		}

		/**
		 * Check if two responses can be merged
		 */
		private canMerge(responseA: string, responseB: string): boolean {
			// Simple heuristic: can merge if responses don't contradict
			const hasContradiction = CONTRADICTION_KEYWORDS.some(keyword =>
				responseA.toLowerCase().includes(keyword) || responseB.toLowerCase().includes(keyword)
			);
			return !hasContradiction;
		}

		/**
		 * Choose fusion strategy based on response characteristics
		 */
		private chooseFusionStrategy(
			responses: ProviderResponse[],
			conflicts: ResponseConflict[]
		): FusedResponse['fusionStrategy'] {
			// If high consensus, use consensus strategy
			const avgSimilarity = this.calculateAverageSimilarity(responses);
			if (avgSimilarity > RESPONSE_FUSION_THRESHOLDS.SIMILARITY.HIGH_CONSENSUS) {
				return 'consensus';
			}

			// If one provider has much higher confidence, use that
			const confidences = responses.map(r => r.confidence);
			const maxConfidence = Math.max(...confidences);
			const avgConfidence = confidences.reduce((a, b) => a + b, 0) / confidences.length;
			if (maxConfidence > avgConfidence + RESPONSE_FUSION_THRESHOLDS.CONFIDENCE.HIGH_CONFIDENCE_DIFF) {
				return 'highest_confidence';
			}

			// If multiple conflicts, use majority vote
			if (conflicts.length > responses.length / 2) {
				return 'majority_vote';
			}

			// Default to weighted average
			return 'weighted_average';
		}

		/**
		 * Apply chosen fusion strategy to combine responses
		 */
		private applyFusionStrategy(
			responses: ProviderResponse[],
			strategy: FusedResponse['fusionStrategy'],
			conflicts: ResponseConflict[]
		): string {
			switch (strategy) {
				case 'highest_confidence':
					return responses.reduce((best, current) =>
						current.confidence > best.confidence ? current : best
					).response;

				case 'consensus':
					// Return the most common response
					const responseCounts = new Map<string, number>();
					responses.forEach(r => {
						responseCounts.set(r.response, (responseCounts.get(r.response) || 0) + 1);
					});
					let maxCount = 0;
					let consensusResponse = responses[0].response;
					responseCounts.forEach((count, response) => {
						if (count > maxCount) {
							maxCount = count;
							consensusResponse = response;
						}
					});
					return consensusResponse;

				case 'weighted_average':
					// Merge responses weighted by confidence
					// For text, we'll take the highest confidence response but note it's weighted
					const sortedByConfidence = [...responses].sort((a, b) => b.confidence - a.confidence);
					return `${sortedByConfidence[0].response} (weighted fusion of ${responses.length} providers)`;

				case 'majority_vote':
					// Count similar responses and pick majority
					const clusters = this.clusterSimilarResponses(responses);
					const largestCluster = clusters.reduce((largest, current) =>
						current.length > largest.length ? current : largest
					);
					return largestCluster[0].response;

				default:
					return responses[0].response;
			}
		}

		/**
		 * Cluster similar responses together
		 */
		private clusterSimilarResponses(responses: ProviderResponse[]): ProviderResponse[][] {
			const clusters: ProviderResponse[][] = [];

			responses.forEach(response => {
				// Find a cluster this response belongs to
				let foundCluster = false;
				for (const cluster of clusters) {
					const similarity = this.calculateSimilarity(response.response, cluster[0].response);
					if (similarity > RESPONSE_FUSION_THRESHOLDS.SIMILARITY.CLUSTERING) {
						cluster.push(response);
						foundCluster = true;
						break;
					}
				}

				// Create new cluster if no match found
				if (!foundCluster) {
					clusters.push([response]);
				}
			});

			return clusters;
		}

		/**
		 * Calculate average similarity across all response pairs
		 */
		private calculateAverageSimilarity(responses: ProviderResponse[]): number {
			if (responses.length < 2) return 1.0;

			let totalSimilarity = 0;
			let pairCount = 0;

			for (let i = 0; i < responses.length; i++) {
				for (let j = i + 1; j < responses.length; j++) {
					totalSimilarity += this.calculateSimilarity(responses[i].response, responses[j].response);
					pairCount++;
				}
			}

			return pairCount > 0 ? totalSimilarity / pairCount : 1.0;
		}

		/**
		 * Calculate consensus level (0-1)
		 */
		private calculateConsensus(responses: ProviderResponse[]): number {
			return this.calculateAverageSimilarity(responses);
		}

		/**
		 * Calculate fused confidence based on strategy
		 */
		private calculateFusedConfidence(
			responses: ProviderResponse[],
			strategy: FusedResponse['fusionStrategy']
		): number {
			switch (strategy) {
				case 'highest_confidence':
					return Math.max(...responses.map(r => r.confidence));

				case 'consensus':
					// Higher consensus = higher confidence
					const avgConfidence = responses.reduce((sum, r) => sum + r.confidence, 0) / responses.length;
					const consensusBoost = this.calculateConsensus(responses) * RESPONSE_FUSION_PARAMS.CONSENSUS_CONFIDENCE_BOOST;
					return Math.min(1.0, avgConfidence + consensusBoost);

				case 'weighted_average':
					// Weighted average of confidences
					const totalConfidence = responses.reduce((sum, r) => sum + r.confidence, 0);
					const weights = responses.map(r => r.confidence / totalConfidence);
					return responses.reduce((sum, r, i) => sum + r.confidence * weights[i], 0);

				case 'majority_vote':
					// Confidence of majority cluster
					const clusters = this.clusterSimilarResponses(responses);
					const largestCluster = clusters.reduce((largest, current) =>
						current.length > largest.length ? current : largest
					);
					return largestCluster.reduce((sum, r) => sum + r.confidence, 0) / largestCluster.length;

				default:
					return responses[0].confidence;
			}
		}

		/**
		 * Calculate quality score for fused response
		 */
		private calculateQualityScore(response: string, consensusLevel: number, conflictCount: number): number {
			// Quality factors:
			// 1. Response length (not too short, not too long)
			const lengthScore = Math.min(1.0, response.length / RESPONSE_FUSION_PARAMS.OPTIMAL_RESPONSE_LENGTH);

			// 2. Consensus level (higher is better)
			const consensusScore = consensusLevel;

			// 3. Conflict count (fewer is better)
			const conflictPenalty = conflictCount * RESPONSE_FUSION_WEIGHTS.PENALTIES.CONFLICT_PER_COUNT;

			const rawScore =
				(lengthScore * RESPONSE_FUSION_WEIGHTS.QUALITY_SCORE.LENGTH +
				 consensusScore * RESPONSE_FUSION_WEIGHTS.QUALITY_SCORE.CONSENSUS) -
				conflictPenalty;
			return Math.max(0, Math.min(1.0, rawScore));
		}

		/**
		 * Validate quality of fused response
		 */
		validateQuality(fusedResponse: FusedResponse, minQualityThreshold: number = RESPONSE_FUSION_THRESHOLDS.QUALITY.DEFAULT_THRESHOLD): boolean {
			return fusedResponse.qualityScore >= minQualityThreshold;
		}

		/**
		 * Resolve conflicts between providers
		 */
		resolveConflict(conflict: ResponseConflict): string {
			switch (conflict.resolution) {
				case 'prefer_a':
					return conflict.responseA;
				case 'prefer_b':
					return conflict.responseB;
				case 'merge':
					return `${conflict.responseA}\n\nAdditionally: ${conflict.responseB}`;
				case 'manual_review':
					return `CONFLICT REQUIRES MANUAL REVIEW:\nProvider ${conflict.providerA}: ${conflict.responseA}\nProvider ${conflict.providerB}: ${conflict.responseB}`;
				default:
					return conflict.responseA;
			}
		}
	}

	// ====================================================================
	// Test Suite 1: Response Combination
	// ====================================================================

	suite('Response Combination', () => {
		test('Should combine responses from multiple providers', async function () {
			this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

			const fusion = new ResponseFusion();
			const responses: ProviderResponse[] = [
				{
					provider: 'ollama',
					response: 'Use a for loop to iterate over the array',
					confidence: RESPONSE_FUSION_TEST_DATA.CONFIDENCE_VALUES.MEDIUM_STANDARD,
					responseTimeMs: RESPONSE_FUSION_TEST_DATA.RESPONSE_TIMES.SLOW,
					tokenCount: RESPONSE_FUSION_TEST_DATA.TOKEN_COUNTS.LARGE,
				},
				{
					provider: 'openai',
					response: 'Use a for loop to iterate over the array elements',
					confidence: RESPONSE_FUSION_TEST_DATA.CONFIDENCE_VALUES.MEDIUM_HIGH,
					responseTimeMs: RESPONSE_FUSION_TEST_DATA.RESPONSE_TIMES.FAST,
					tokenCount: RESPONSE_FUSION_TEST_DATA.TOKEN_COUNTS.XLARGE,
				},
				{
					provider: 'anthropic',
					response: 'Use a for loop to iterate over array items',
					confidence: RESPONSE_FUSION_TEST_DATA.CONFIDENCE_VALUES.MEDIUM,
					responseTimeMs: RESPONSE_FUSION_TEST_DATA.RESPONSE_TIMES.MEDIUM,
					tokenCount: RESPONSE_FUSION_TEST_DATA.TOKEN_COUNTS.MEDIUM_LARGE,
				},
			];

			const fused = fusion.fuseResponses(responses);

			assert.ok(fused.primaryResponse.includes('for loop'), 'Fused response should mention for loop');
			assert.ok(fused.contributingProviders.length === 3, 'Should include all 3 providers');
			assert.ok(fused.consensusLevel > RESPONSE_FUSION_THRESHOLDS.SIMILARITY.HIGH_CONSENSUS, 'Should have high consensus level');
			assert.ok(fused.confidence >= RESPONSE_FUSION_TEST_DATA.CONFIDENCE_VALUES.MEDIUM_STANDARD, 'Confidence should be at least as high as individual responses');
		});

		test('Should handle single provider response', async function () {
			this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

			const fusion = new ResponseFusion();
			const responses: ProviderResponse[] = [
				{
					provider: 'ollama',
					response: 'Use array.map() for transformation',
					confidence: RESPONSE_FUSION_TEST_DATA.CONFIDENCE_VALUES.MEDIUM_STANDARD,
					responseTimeMs: RESPONSE_FUSION_TEST_DATA.RESPONSE_TIMES.SLOW,
					tokenCount: RESPONSE_FUSION_TEST_DATA.TOKEN_COUNTS.SMALL_MEDIUM,
				},
			];

			const fused = fusion.fuseResponses(responses);

			assert.strictEqual(fused.primaryResponse, responses[0].response);
			assert.strictEqual(fused.confidence, RESPONSE_FUSION_TEST_DATA.CONFIDENCE_VALUES.MEDIUM_STANDARD);
			assert.strictEqual(fused.consensusLevel, 1.0, 'Single response should have perfect consensus');
			assert.strictEqual(fused.conflicts.length, 0, 'Single response should have no conflicts');
		});

		test('Should throw error with no responses', async function () {
			this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

			const fusion = new ResponseFusion();
			const responses: ProviderResponse[] = [];

			assert.throws(() => {
				fusion.fuseResponses(responses);
			}, /No responses to fuse/);
		});
	});

	// ====================================================================
	// Test Suite 2: Conflict Resolution
	// ====================================================================

	suite('Conflict Resolution', () => {
		test('Should detect conflicts between different responses', async function () {
			this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

			const fusion = new ResponseFusion();
			const responses: ProviderResponse[] = [
				{
					provider: 'ollama',
					response: 'Use imperative for loop for best performance',
					confidence: RESPONSE_FUSION_TEST_DATA.CONFIDENCE_VALUES.MEDIUM_STANDARD,
					responseTimeMs: RESPONSE_FUSION_TEST_DATA.RESPONSE_TIMES.SLOW,
					tokenCount: RESPONSE_FUSION_TEST_DATA.TOKEN_COUNTS.MEDIUM,
				},
				{
					provider: 'openai',
					response: 'Use functional array.map() for better readability',
					confidence: RESPONSE_FUSION_TEST_DATA.CONFIDENCE_VALUES.MEDIUM,
					responseTimeMs: RESPONSE_FUSION_TEST_DATA.RESPONSE_TIMES.FAST,
					tokenCount: RESPONSE_FUSION_TEST_DATA.TOKEN_COUNTS.MEDIUM_SMALL,
				},
			];

			const fused = fusion.fuseResponses(responses);

			assert.ok(fused.conflicts.length > 0, 'Should detect conflict between imperative and functional approach');
			assert.ok(fused.consensusLevel < RESPONSE_FUSION_THRESHOLDS.SIMILARITY.CONFLICT_DETECTION, 'Should have low consensus due to conflict');
		});

		test('Should resolve conflicts using confidence levels', async function () {
			this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

			const fusion = new ResponseFusion();
			const responses: ProviderResponse[] = [
				{
					provider: 'ollama',
					response: 'Use approach A',
					confidence: RESPONSE_FUSION_TEST_DATA.CONFIDENCE_VALUES.VERY_HIGH,
					responseTimeMs: RESPONSE_FUSION_TEST_DATA.RESPONSE_TIMES.SLOW,
					tokenCount: RESPONSE_FUSION_TEST_DATA.TOKEN_COUNTS.SMALL,
				},
				{
					provider: 'openai',
					response: 'Use approach B',
					confidence: RESPONSE_FUSION_TEST_DATA.CONFIDENCE_VALUES.MEDIUM_LOW,
					responseTimeMs: RESPONSE_FUSION_TEST_DATA.RESPONSE_TIMES.FAST,
					tokenCount: RESPONSE_FUSION_TEST_DATA.TOKEN_COUNTS.SMALL,
				},
			];

			const fused = fusion.fuseResponses(responses);
			const conflict = fused.conflicts[0];

			assert.ok(conflict, 'Should have detected conflict');
			assert.strictEqual(conflict.resolution, 'prefer_a', 'Should prefer higher confidence provider');
			assert.ok(conflict.rationale.includes('higher confidence'), 'Rationale should mention confidence');
		});

		test('Should merge complementary responses', async function () {
			this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

			const fusion = new ResponseFusion();
			const conflict: ResponseConflict = {
				aspect: 'implementation details',
				providerA: 'ollama',
				responseA: 'Add error handling',
				providerB: 'openai',
				responseB: 'Add input validation',
				resolution: 'merge',
				rationale: 'Complementary suggestions',
			};

			const resolved = fusion.resolveConflict(conflict);

			assert.ok(resolved.includes('error handling'), 'Should include first suggestion');
			assert.ok(resolved.includes('input validation'), 'Should include second suggestion');
		});
	});

	// ====================================================================
	// Test Suite 3: Quality Validation
	// ====================================================================

	suite('Quality Validation', () => {
		test('Should validate fused response quality', async function () {
			this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

			const fusion = new ResponseFusion();
			const highQualityResponses: ProviderResponse[] = [
				{
					provider: 'ollama',
					response: 'Use array.filter() to remove elements matching the condition',
					confidence: RESPONSE_FUSION_TEST_DATA.CONFIDENCE_VALUES.MEDIUM_HIGH,
					responseTimeMs: RESPONSE_FUSION_TEST_DATA.RESPONSE_TIMES.SLOW,
					tokenCount: RESPONSE_FUSION_TEST_DATA.TOKEN_COUNTS.LARGE,
				},
				{
					provider: 'openai',
					response: 'Use array.filter() to remove elements matching the condition',
					confidence: RESPONSE_FUSION_TEST_DATA.CONFIDENCE_VALUES.HIGH,
					responseTimeMs: RESPONSE_FUSION_TEST_DATA.RESPONSE_TIMES.FAST,
					tokenCount: RESPONSE_FUSION_TEST_DATA.TOKEN_COUNTS.LARGE,
				},
				{
					provider: 'anthropic',
					response: 'Use array.filter() to remove matching elements',
					confidence: RESPONSE_FUSION_TEST_DATA.CONFIDENCE_VALUES.MEDIUM,
					responseTimeMs: RESPONSE_FUSION_TEST_DATA.RESPONSE_TIMES.MEDIUM,
					tokenCount: RESPONSE_FUSION_TEST_DATA.TOKEN_COUNTS.MEDIUM,
				},
			];

			const fused = fusion.fuseResponses(highQualityResponses);
			const isValid = fusion.validateQuality(fused, RESPONSE_FUSION_THRESHOLDS.QUALITY.STRICT_THRESHOLD);

			assert.ok(isValid, 'High consensus responses should pass quality validation');
			assert.ok(fused.qualityScore > RESPONSE_FUSION_THRESHOLDS.QUALITY.STRICT_THRESHOLD, `Quality score should be > ${RESPONSE_FUSION_THRESHOLDS.QUALITY.STRICT_THRESHOLD}, got ${fused.qualityScore}`);
		});

		test('Should fail quality validation for low consensus', async function () {
			this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

			const fusion = new ResponseFusion();
			const lowQualityResponses: ProviderResponse[] = [
				{
					provider: 'ollama',
					response: 'Use for loop',
					confidence: RESPONSE_FUSION_TEST_DATA.CONFIDENCE_VALUES.VERY_LOW,
					responseTimeMs: RESPONSE_FUSION_TEST_DATA.RESPONSE_TIMES.SLOW,
					tokenCount: RESPONSE_FUSION_TEST_DATA.TOKEN_COUNTS.SMALL,
				},
				{
					provider: 'openai',
					response: 'Use while loop',
					confidence: RESPONSE_FUSION_TEST_DATA.CONFIDENCE_VALUES.LOW,
					responseTimeMs: RESPONSE_FUSION_TEST_DATA.RESPONSE_TIMES.FAST,
					tokenCount: RESPONSE_FUSION_TEST_DATA.TOKEN_COUNTS.SMALL,
				},
				{
					provider: 'anthropic',
					response: 'Use recursion',
					confidence: RESPONSE_FUSION_TEST_DATA.CONFIDENCE_VALUES.EXTREMELY_LOW,
					responseTimeMs: RESPONSE_FUSION_TEST_DATA.RESPONSE_TIMES.MEDIUM,
					tokenCount: RESPONSE_FUSION_TEST_DATA.TOKEN_COUNTS.TINY,
				},
			];

			const fused = fusion.fuseResponses(lowQualityResponses);
			const isValid = fusion.validateQuality(fused, RESPONSE_FUSION_THRESHOLDS.QUALITY.HIGH_THRESHOLD);

			assert.ok(!isValid, 'Low consensus responses should fail strict quality validation');
			assert.ok(fused.qualityScore < RESPONSE_FUSION_THRESHOLDS.QUALITY.HIGH_THRESHOLD, 'Quality score should be low for conflicting responses');
		});

		test('Should calculate quality scores based on multiple factors', async function () {
			this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

			const fusion = new ResponseFusion();
			const responses: ProviderResponse[] = [
				{
					provider: 'ollama',
					response: 'Implement proper error handling with try-catch blocks and validate all user inputs',
					confidence: RESPONSE_FUSION_TEST_DATA.CONFIDENCE_VALUES.MEDIUM_HIGH,
					responseTimeMs: RESPONSE_FUSION_TEST_DATA.RESPONSE_TIMES.SLOW,
					tokenCount: RESPONSE_FUSION_TEST_DATA.TOKEN_COUNTS.XXXLARGE,
				},
				{
					provider: 'openai',
					response: 'Implement proper error handling with try-catch and validate user inputs',
					confidence: RESPONSE_FUSION_TEST_DATA.CONFIDENCE_VALUES.HIGH,
					responseTimeMs: RESPONSE_FUSION_TEST_DATA.RESPONSE_TIMES.FAST,
					tokenCount: RESPONSE_FUSION_TEST_DATA.TOKEN_COUNTS.XXLARGE,
				},
			];

			const fused = fusion.fuseResponses(responses);

			// Quality should be high due to:
			// 1. Good response length
			// 2. High consensus
			// 3. Few conflicts
			assert.ok(fused.qualityScore > RESPONSE_FUSION_THRESHOLDS.QUALITY.STRICT_THRESHOLD, 'Quality score should reflect high consensus and good content');
			assert.ok(fused.consensusLevel > RESPONSE_FUSION_THRESHOLDS.SIMILARITY.HIGH_CONSENSUS, 'Consensus level should be high');
		});
	});

	// ====================================================================
	// Test Suite 4: Fusion Confidence Scoring
	// ====================================================================

	suite('Fusion Confidence Scoring', () => {
		test('Should calculate fusion confidence for consensus strategy', async function () {
			this.timeout(PROVIDER_TEST_TIMEOUTS.STANDARD_TEST);

			const fusion = new ResponseFusion();
			const responses: ProviderResponse[] = [
				{
					provider: 'ollama',
					response: 'Use const for immutable values',
					confidence: RESPONSE_FUSION_TEST_DATA.CONFIDENCE_VALUES.MEDIUM_STANDARD,
					responseTimeMs: RESPONSE_FUSION_TEST_DATA.RESPONSE_TIMES.SLOW,
					tokenCount: RESPONSE_FUSION_TEST_DATA.TOKEN_COUNTS.SMALL_MEDIUM,
				},
				{
					provider: 'openai',
					response: 'Use const for immutable values',
					confidence: RESPONSE_FUSION_TEST_DATA.CONFIDENCE_VALUES.MEDIUM,
					responseTimeMs: RESPONSE_FUSION_TEST_DATA.RESPONSE_TIMES.FAST,
					tokenCount: RESPONSE_FUSION_TEST_DATA.TOKEN_COUNTS.SMALL_MEDIUM,
				},
				{
					provider: 'anthropic',
					response: 'Use const for immutable values',
					confidence: RESPONSE_FUSION_TEST_DATA.CONFIDENCE_VALUES.MEDIUM_HIGH,
					responseTimeMs: RESPONSE_FUSION_TEST_DATA.RESPONSE_TIMES.MEDIUM,
					tokenCount: RESPONSE_FUSION_TEST_DATA.TOKEN_COUNTS.SMALL_MEDIUM,
				},
			];

			const fused = fusion.fuseResponses(responses);

			// Consensus strategy should boost confidence
			assert.strictEqual(fused.fusionStrategy, 'consensus', 'Should use consensus strategy');
			// Confidence should be boosted by consensus (0.85 + 0.2 * high_consensus = ~1.05, capped at 1.0)
			assert.ok(fused.confidence >= RESPONSE_FUSION_TEST_DATA.CONFIDENCE_VALUES.MEDIUM_STANDARD, 'Consensus should maintain or boost confidence');
		});
	});
});
