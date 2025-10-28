[**Ollama Code API Documentation v0.1.0**](../../../../README.md)

***

[Ollama Code API Documentation](../../../../modules.md) / [ai/providers/local-fine-tuning](../README.md) / CustomLocalProvider

# Class: CustomLocalProvider

Defined in: [ai/providers/local-fine-tuning.ts:877](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/local-fine-tuning.ts#L877)

Custom Local Provider for fine-tuned models

## Extends

- [`BaseAIProvider`](../../classes/BaseAIProvider.md)

## Constructors

### Constructor

> **new CustomLocalProvider**(`config`): `CustomLocalProvider`

Defined in: [ai/providers/local-fine-tuning.ts:881](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/local-fine-tuning.ts#L881)

#### Parameters

##### config

[`ProviderConfig`](../../interfaces/ProviderConfig.md) & `object`

#### Returns

`CustomLocalProvider`

#### Overrides

[`BaseAIProvider`](../../classes/BaseAIProvider.md).[`constructor`](../../classes/BaseAIProvider.md#constructor)

## Methods

### getHealth()

> **getHealth**(): [`ProviderHealth`](../../interfaces/ProviderHealth.md)

Defined in: [ai/providers/base-provider.ts:237](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/base-provider.ts#L237)

Get provider health status

#### Returns

[`ProviderHealth`](../../interfaces/ProviderHealth.md)

#### Inherited from

[`BaseAIProvider`](../../classes/BaseAIProvider.md).[`getHealth`](../../classes/BaseAIProvider.md#gethealth)

***

### getMetrics()

> **getMetrics**(): [`ProviderMetrics`](../../interfaces/ProviderMetrics.md)

Defined in: [ai/providers/base-provider.ts:244](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/base-provider.ts#L244)

Get provider metrics

#### Returns

[`ProviderMetrics`](../../interfaces/ProviderMetrics.md)

#### Inherited from

[`BaseAIProvider`](../../classes/BaseAIProvider.md).[`getMetrics`](../../classes/BaseAIProvider.md#getmetrics)

***

### supportsCapability()

> **supportsCapability**(`capability`): `boolean`

Defined in: [ai/providers/base-provider.ts:251](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/base-provider.ts#L251)

Check if provider supports a capability

#### Parameters

##### capability

[`AICapability`](../../enumerations/AICapability.md)

#### Returns

`boolean`

#### Inherited from

[`BaseAIProvider`](../../classes/BaseAIProvider.md).[`supportsCapability`](../../classes/BaseAIProvider.md#supportscapability)

***

### getConfig()

> **getConfig**(): [`ProviderConfig`](../../interfaces/ProviderConfig.md)

Defined in: [ai/providers/base-provider.ts:258](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/base-provider.ts#L258)

Get provider configuration

#### Returns

[`ProviderConfig`](../../interfaces/ProviderConfig.md)

#### Inherited from

[`BaseAIProvider`](../../classes/BaseAIProvider.md).[`getConfig`](../../classes/BaseAIProvider.md#getconfig)

***

### updateConfig()

> **updateConfig**(`config`): `void`

Defined in: [ai/providers/base-provider.ts:265](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/base-provider.ts#L265)

Update provider configuration

#### Parameters

##### config

`Partial`\<[`ProviderConfig`](../../interfaces/ProviderConfig.md)\>

#### Returns

`void`

#### Inherited from

[`BaseAIProvider`](../../classes/BaseAIProvider.md).[`updateConfig`](../../classes/BaseAIProvider.md#updateconfig)

***

### cleanup()

> **cleanup**(): `Promise`\<`void`\>

Defined in: [ai/providers/base-provider.ts:273](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/base-provider.ts#L273)

Cleanup provider resources

#### Returns

`Promise`\<`void`\>

#### Inherited from

[`BaseAIProvider`](../../classes/BaseAIProvider.md).[`cleanup`](../../classes/BaseAIProvider.md#cleanup)

***

### isReady()

> **isReady**(): `boolean`

Defined in: [ai/providers/base-provider.ts:281](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/base-provider.ts#L281)

Check if provider is initialized

#### Returns

`boolean`

#### Inherited from

[`BaseAIProvider`](../../classes/BaseAIProvider.md).[`isReady`](../../classes/BaseAIProvider.md#isready)

***

### performHealthCheck()

> **performHealthCheck**(): `Promise`\<`void`\>

Defined in: [ai/providers/base-provider.ts:288](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/base-provider.ts#L288)

Perform health check

#### Returns

`Promise`\<`void`\>

#### Inherited from

[`BaseAIProvider`](../../classes/BaseAIProvider.md).[`performHealthCheck`](../../classes/BaseAIProvider.md#performhealthcheck)

***

### updateMetrics()

> `protected` **updateMetrics**(`success`, `responseTime`, `tokensUsed`, `cost`): `void`

Defined in: [ai/providers/base-provider.ts:318](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/base-provider.ts#L318)

Update metrics after a request

#### Parameters

##### success

`boolean`

##### responseTime

`number`

##### tokensUsed

`number` = `0`

##### cost

`number` = `0`

#### Returns

`void`

#### Inherited from

[`BaseAIProvider`](../../classes/BaseAIProvider.md).[`updateMetrics`](../../classes/BaseAIProvider.md#updatemetrics)

***

### getName()

> **getName**(): `string`

Defined in: [ai/providers/local-fine-tuning.ts:886](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/local-fine-tuning.ts#L886)

Get provider name

#### Returns

`string`

#### Overrides

[`BaseAIProvider`](../../classes/BaseAIProvider.md).[`getName`](../../classes/BaseAIProvider.md#getname)

***

### getDisplayName()

> **getDisplayName**(): `string`

Defined in: [ai/providers/local-fine-tuning.ts:890](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/local-fine-tuning.ts#L890)

Get provider display name

#### Returns

`string`

#### Overrides

[`BaseAIProvider`](../../classes/BaseAIProvider.md).[`getDisplayName`](../../classes/BaseAIProvider.md#getdisplayname)

***

### getCapabilities()

> **getCapabilities**(): `object`

Defined in: [ai/providers/local-fine-tuning.ts:894](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/local-fine-tuning.ts#L894)

Get provider capabilities

#### Returns

`object`

##### maxContextWindow

> **maxContextWindow**: `number` = `config.contextWindow`

##### supportedCapabilities

> **supportedCapabilities**: [`AICapability`](../../enumerations/AICapability.md)[]

##### rateLimits

> **rateLimits**: `object` = `config.rateLimits`

###### rateLimits.requestsPerMinute

> **requestsPerMinute**: `number`

###### rateLimits.tokensPerMinute

> **tokensPerMinute**: `number`

##### features

> **features**: `object`

###### features.streaming

> **streaming**: `boolean` = `true`

###### features.functionCalling

> **functionCalling**: `boolean` = `false`

###### features.imageInput

> **imageInput**: `boolean` = `false`

###### features.documentInput

> **documentInput**: `boolean` = `false`

###### features.customInstructions

> **customInstructions**: `boolean` = `true`

#### Overrides

[`BaseAIProvider`](../../classes/BaseAIProvider.md).[`getCapabilities`](../../classes/BaseAIProvider.md#getcapabilities)

***

### initialize()

> **initialize**(): `Promise`\<`void`\>

Defined in: [ai/providers/local-fine-tuning.ts:914](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/local-fine-tuning.ts#L914)

Initialize the provider

#### Returns

`Promise`\<`void`\>

#### Overrides

[`BaseAIProvider`](../../classes/BaseAIProvider.md).[`initialize`](../../classes/BaseAIProvider.md#initialize)

***

### testConnection()

> **testConnection**(): `Promise`\<`boolean`\>

Defined in: [ai/providers/local-fine-tuning.ts:919](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/local-fine-tuning.ts#L919)

Test connection to the provider

#### Returns

`Promise`\<`boolean`\>

#### Overrides

[`BaseAIProvider`](../../classes/BaseAIProvider.md).[`testConnection`](../../classes/BaseAIProvider.md#testconnection)

***

### complete()

> **complete**(`prompt`, `options`): `Promise`\<`any`\>

Defined in: [ai/providers/local-fine-tuning.ts:923](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/local-fine-tuning.ts#L923)

Complete text/chat request

#### Parameters

##### prompt

`string` | `any`[]

##### options

`any` = `{}`

#### Returns

`Promise`\<`any`\>

#### Overrides

[`BaseAIProvider`](../../classes/BaseAIProvider.md).[`complete`](../../classes/BaseAIProvider.md#complete)

***

### completeStream()

> **completeStream**(`prompt`, `options`, `onEvent`, `abortSignal?`): `Promise`\<`void`\>

Defined in: [ai/providers/local-fine-tuning.ts:947](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/local-fine-tuning.ts#L947)

Stream completion request

#### Parameters

##### prompt

`string` | `any`[]

##### options

`any`

##### onEvent

`any`

##### abortSignal?

`AbortSignal`

#### Returns

`Promise`\<`void`\>

#### Overrides

[`BaseAIProvider`](../../classes/BaseAIProvider.md).[`completeStream`](../../classes/BaseAIProvider.md#completestream)

***

### listModels()

> **listModels**(): `Promise`\<[`AIModel`](../../interfaces/AIModel.md)[]\>

Defined in: [ai/providers/local-fine-tuning.ts:1026](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/local-fine-tuning.ts#L1026)

List available models

#### Returns

`Promise`\<[`AIModel`](../../interfaces/AIModel.md)[]\>

#### Overrides

[`BaseAIProvider`](../../classes/BaseAIProvider.md).[`listModels`](../../classes/BaseAIProvider.md#listmodels)

***

### getModel()

> **getModel**(`modelId`): `Promise`\<`null` \| [`AIModel`](../../interfaces/AIModel.md)\>

Defined in: [ai/providers/local-fine-tuning.ts:1044](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/local-fine-tuning.ts#L1044)

Get specific model information

#### Parameters

##### modelId

`string`

#### Returns

`Promise`\<`null` \| [`AIModel`](../../interfaces/AIModel.md)\>

#### Overrides

[`BaseAIProvider`](../../classes/BaseAIProvider.md).[`getModel`](../../classes/BaseAIProvider.md#getmodel)

***

### calculateCost()

> **calculateCost**(`promptTokens`, `completionTokens`, `model?`): `number`

Defined in: [ai/providers/local-fine-tuning.ts:1049](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/local-fine-tuning.ts#L1049)

Calculate cost for a request

#### Parameters

##### promptTokens

`number`

##### completionTokens

`number`

##### model?

`string`

#### Returns

`number`

#### Overrides

[`BaseAIProvider`](../../classes/BaseAIProvider.md).[`calculateCost`](../../classes/BaseAIProvider.md#calculatecost)

***

### getFineTuningManager()

> **getFineTuningManager**(): [`LocalFineTuningManager`](LocalFineTuningManager.md)

Defined in: [ai/providers/local-fine-tuning.ts:1056](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/local-fine-tuning.ts#L1056)

Get fine-tuning manager for advanced operations

#### Returns

[`LocalFineTuningManager`](LocalFineTuningManager.md)

***

### setActiveDeployment()

> **setActiveDeployment**(`deploymentId`): `void`

Defined in: [ai/providers/local-fine-tuning.ts:1063](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/local-fine-tuning.ts#L1063)

Set active deployment

#### Parameters

##### deploymentId

`string`

#### Returns

`void`

## Properties

### config

> `protected` **config**: [`ProviderConfig`](../../interfaces/ProviderConfig.md)

Defined in: [ai/providers/base-provider.ts:162](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/base-provider.ts#L162)

#### Inherited from

[`BaseAIProvider`](../../classes/BaseAIProvider.md).[`config`](../../classes/BaseAIProvider.md#config)

***

### health

> `protected` **health**: [`ProviderHealth`](../../interfaces/ProviderHealth.md)

Defined in: [ai/providers/base-provider.ts:163](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/base-provider.ts#L163)

#### Inherited from

[`BaseAIProvider`](../../classes/BaseAIProvider.md).[`health`](../../classes/BaseAIProvider.md#health)

***

### metrics

> `protected` **metrics**: [`ProviderMetrics`](../../interfaces/ProviderMetrics.md)

Defined in: [ai/providers/base-provider.ts:164](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/base-provider.ts#L164)

#### Inherited from

[`BaseAIProvider`](../../classes/BaseAIProvider.md).[`metrics`](../../classes/BaseAIProvider.md#metrics)

***

### isInitialized

> `protected` **isInitialized**: `boolean` = `false`

Defined in: [ai/providers/base-provider.ts:165](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/base-provider.ts#L165)

#### Inherited from

[`BaseAIProvider`](../../classes/BaseAIProvider.md).[`isInitialized`](../../classes/BaseAIProvider.md#isinitialized)
