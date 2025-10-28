[**Ollama Code API Documentation v0.1.0**](../../../../README.md)

***

[Ollama Code API Documentation](../../../../modules.md) / [ai/vcs/universal-ci-api](../README.md) / UniversalCIConfig

# Interface: UniversalCIConfig

Defined in: [ai/vcs/universal-ci-api.ts:14](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/vcs/universal-ci-api.ts#L14)

## Properties

### repositoryPath

> **repositoryPath**: `string`

Defined in: [ai/vcs/universal-ci-api.ts:15](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/vcs/universal-ci-api.ts#L15)

***

### platform?

> `optional` **platform**: [`CI_PLATFORM`](../type-aliases/CI_PLATFORM.md)

Defined in: [ai/vcs/universal-ci-api.ts:16](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/vcs/universal-ci-api.ts#L16)

***

### autoDetect?

> `optional` **autoDetect**: `boolean`

Defined in: [ai/vcs/universal-ci-api.ts:17](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/vcs/universal-ci-api.ts#L17)

***

### enableSecurityAnalysis?

> `optional` **enableSecurityAnalysis**: `boolean`

Defined in: [ai/vcs/universal-ci-api.ts:18](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/vcs/universal-ci-api.ts#L18)

***

### enablePerformanceAnalysis?

> `optional` **enablePerformanceAnalysis**: `boolean`

Defined in: [ai/vcs/universal-ci-api.ts:19](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/vcs/universal-ci-api.ts#L19)

***

### enableArchitecturalAnalysis?

> `optional` **enableArchitecturalAnalysis**: `boolean`

Defined in: [ai/vcs/universal-ci-api.ts:20](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/vcs/universal-ci-api.ts#L20)

***

### enableRegressionAnalysis?

> `optional` **enableRegressionAnalysis**: `boolean`

Defined in: [ai/vcs/universal-ci-api.ts:21](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/vcs/universal-ci-api.ts#L21)

***

### qualityGates?

> `optional` **qualityGates**: `object`

Defined in: [ai/vcs/universal-ci-api.ts:22](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/vcs/universal-ci-api.ts#L22)

#### minQualityScore?

> `optional` **minQualityScore**: `number`

#### maxCriticalIssues?

> `optional` **maxCriticalIssues**: `number`

#### maxSecurityIssues?

> `optional` **maxSecurityIssues**: `number`

#### maxPerformanceIssues?

> `optional` **maxPerformanceIssues**: `number`

#### minTestCoverage?

> `optional` **minTestCoverage**: `number`

#### regressionThreshold?

> `optional` **regressionThreshold**: `"low"` \| `"medium"` \| `"high"`

***

### reportFormat?

> `optional` **reportFormat**: `"json"` \| `"html"` \| `"markdown"` \| `"junit"` \| `"sarif"`

Defined in: [ai/vcs/universal-ci-api.ts:30](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/vcs/universal-ci-api.ts#L30)

***

### outputPath?

> `optional` **outputPath**: `string`

Defined in: [ai/vcs/universal-ci-api.ts:31](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/vcs/universal-ci-api.ts#L31)

***

### notifications?

> `optional` **notifications**: `object`

Defined in: [ai/vcs/universal-ci-api.ts:32](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/vcs/universal-ci-api.ts#L32)

#### enableComments?

> `optional` **enableComments**: `boolean`

#### enableSlack?

> `optional` **enableSlack**: `boolean`

#### enableEmail?

> `optional` **enableEmail**: `boolean`

#### webhookUrls?

> `optional` **webhookUrls**: `string`[]
