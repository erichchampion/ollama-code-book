[**Ollama Code API Documentation v0.1.0**](../../../../README.md)

***

[Ollama Code API Documentation](../../../../modules.md) / [ai/vcs/universal-ci-api](../README.md) / UniversalCIAPI

# Class: UniversalCIAPI

Defined in: [ai/vcs/universal-ci-api.ts:216](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/vcs/universal-ci-api.ts#L216)

## Constructors

### Constructor

> **new UniversalCIAPI**(`config`): `UniversalCIAPI`

Defined in: [ai/vcs/universal-ci-api.ts:221](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/vcs/universal-ci-api.ts#L221)

#### Parameters

##### config

[`UniversalCIConfig`](../interfaces/UniversalCIConfig.md)

#### Returns

`UniversalCIAPI`

## Methods

### initialize()

> **initialize**(): `Promise`\<`void`\>

Defined in: [ai/vcs/universal-ci-api.ts:237](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/vcs/universal-ci-api.ts#L237)

Initialize the API and detect platform if enabled

#### Returns

`Promise`\<`void`\>

***

### detectPlatform()

> **detectPlatform**(): `Promise`\<[`CI_PLATFORM`](../type-aliases/CI_PLATFORM.md)\>

Defined in: [ai/vcs/universal-ci-api.ts:256](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/vcs/universal-ci-api.ts#L256)

Auto-detect the CI/CD platform based on environment and files

#### Returns

`Promise`\<[`CI_PLATFORM`](../type-aliases/CI_PLATFORM.md)\>

***

### getPlatformCapabilities()

> **getPlatformCapabilities**(): `undefined` \| [`PlatformCapabilities`](../interfaces/PlatformCapabilities.md)

Defined in: [ai/vcs/universal-ci-api.ts:356](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/vcs/universal-ci-api.ts#L356)

Get platform capabilities

#### Returns

`undefined` \| [`PlatformCapabilities`](../interfaces/PlatformCapabilities.md)

***

### getPlatform()

> **getPlatform**(): `undefined` \| [`CI_PLATFORM`](../type-aliases/CI_PLATFORM.md)

Defined in: [ai/vcs/universal-ci-api.ts:363](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/vcs/universal-ci-api.ts#L363)

Get detected or configured platform

#### Returns

`undefined` \| [`CI_PLATFORM`](../type-aliases/CI_PLATFORM.md)

***

### executeAnalysis()

> **executeAnalysis**(): `Promise`\<`any`\>

Defined in: [ai/vcs/universal-ci-api.ts:370](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/vcs/universal-ci-api.ts#L370)

Execute analysis using the appropriate CI pipeline integrator

#### Returns

`Promise`\<`any`\>

***

### generateConfigurationTemplate()

> **generateConfigurationTemplate**(): `Promise`\<[`ConfigurationTemplate`](../interfaces/ConfigurationTemplate.md)\>

Defined in: [ai/vcs/universal-ci-api.ts:401](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/vcs/universal-ci-api.ts#L401)

Generate platform-specific configuration template

#### Returns

`Promise`\<[`ConfigurationTemplate`](../interfaces/ConfigurationTemplate.md)\>

***

### optimizeForPlatform()

> **optimizeForPlatform**(): [`UniversalCIConfig`](../interfaces/UniversalCIConfig.md)

Defined in: [ai/vcs/universal-ci-api.ts:427](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/vcs/universal-ci-api.ts#L427)

Optimize configuration for the detected platform

#### Returns

[`UniversalCIConfig`](../interfaces/UniversalCIConfig.md)

***

### validateConfiguration()

> **validateConfiguration**(): `object`

Defined in: [ai/vcs/universal-ci-api.ts:455](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/vcs/universal-ci-api.ts#L455)

Validate configuration against platform capabilities

#### Returns

`object`

##### valid

> **valid**: `boolean`

##### warnings

> **warnings**: `string`[]

##### errors

> **errors**: `string`[]

***

### getPlatformDocumentation()

> **getPlatformDocumentation**(): `string`

Defined in: [ai/vcs/universal-ci-api.ts:771](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/vcs/universal-ci-api.ts#L771)

Get platform-specific documentation

#### Returns

`string`
