[**Ollama Code API Documentation v0.1.0**](../../../README.md)

***

[Ollama Code API Documentation](../../../modules.md) / [ai/providers](../README.md) / AnthropicProvider

# Class: AnthropicProvider

Defined in: [ai/providers/anthropic-provider.ts:95](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/anthropic-provider.ts#L95)

Anthropic Provider

## Extends

- [`BaseAIProvider`](BaseAIProvider.md)

## Constructors

### Constructor

> **new AnthropicProvider**(`config`): `AnthropicProvider`

Defined in: [ai/providers/anthropic-provider.ts:100](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/anthropic-provider.ts#L100)

#### Parameters

##### config

[`ProviderConfig`](../interfaces/ProviderConfig.md)

#### Returns

`AnthropicProvider`

#### Overrides

[`BaseAIProvider`](BaseAIProvider.md).[`constructor`](BaseAIProvider.md#constructor)

## Methods

### getName()

> **getName**(): `string`

Defined in: [ai/providers/anthropic-provider.ts:132](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/anthropic-provider.ts#L132)

Get provider name

#### Returns

`string`

#### Overrides

[`BaseAIProvider`](BaseAIProvider.md).[`getName`](BaseAIProvider.md#getname)

***

### getCapabilities()

> **getCapabilities**(): [`ProviderCapabilities`](../interfaces/ProviderCapabilities.md)

Defined in: [ai/providers/anthropic-provider.ts:136](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/anthropic-provider.ts#L136)

Get provider capabilities

#### Returns

[`ProviderCapabilities`](../interfaces/ProviderCapabilities.md)

#### Overrides

[`BaseAIProvider`](BaseAIProvider.md).[`getCapabilities`](BaseAIProvider.md#getcapabilities)

***

### initialize()

> **initialize**(): `Promise`\<`void`\>

Defined in: [ai/providers/anthropic-provider.ts:164](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/anthropic-provider.ts#L164)

Initialize the provider

#### Returns

`Promise`\<`void`\>

#### Overrides

[`BaseAIProvider`](BaseAIProvider.md).[`initialize`](BaseAIProvider.md#initialize)

***

### testConnection()

> **testConnection**(): `Promise`\<`boolean`\>

Defined in: [ai/providers/anthropic-provider.ts:188](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/anthropic-provider.ts#L188)

Test connection to the provider

#### Returns

`Promise`\<`boolean`\>

#### Overrides

[`BaseAIProvider`](BaseAIProvider.md).[`testConnection`](BaseAIProvider.md#testconnection)

***

### complete()

> **complete**(`prompt`, `options`): `Promise`\<[`AICompletionResponse`](../interfaces/AICompletionResponse.md)\>

Defined in: [ai/providers/anthropic-provider.ts:203](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/anthropic-provider.ts#L203)

Complete text/chat request

#### Parameters

##### prompt

`string` | [`AIMessage`](../interfaces/AIMessage.md)[]

##### options

[`AICompletionOptions`](../interfaces/AICompletionOptions.md) = `{}`

#### Returns

`Promise`\<[`AICompletionResponse`](../interfaces/AICompletionResponse.md)\>

#### Overrides

[`BaseAIProvider`](BaseAIProvider.md).[`complete`](BaseAIProvider.md#complete)

***

### completeStream()

> **completeStream**(`prompt`, `options`, `onEvent`, `abortSignal?`): `Promise`\<`void`\>

Defined in: [ai/providers/anthropic-provider.ts:338](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/anthropic-provider.ts#L338)

Stream completion request

#### Parameters

##### prompt

`string` | [`AIMessage`](../interfaces/AIMessage.md)[]

##### options

[`AICompletionOptions`](../interfaces/AICompletionOptions.md)

##### onEvent

(`event`) => `void`

##### abortSignal?

`AbortSignal`

#### Returns

`Promise`\<`void`\>

#### Overrides

[`BaseAIProvider`](BaseAIProvider.md).[`completeStream`](BaseAIProvider.md#completestream)

***

### listModels()

> **listModels**(): `Promise`\<[`AIModel`](../interfaces/AIModel.md)[]\>

Defined in: [ai/providers/anthropic-provider.ts:540](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/anthropic-provider.ts#L540)

List available models

#### Returns

`Promise`\<[`AIModel`](../interfaces/AIModel.md)[]\>

#### Overrides

[`BaseAIProvider`](BaseAIProvider.md).[`listModels`](BaseAIProvider.md#listmodels)

***

### getModel()

> **getModel**(`modelId`): `Promise`\<`null` \| [`AIModel`](../interfaces/AIModel.md)\>

Defined in: [ai/providers/anthropic-provider.ts:605](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/anthropic-provider.ts#L605)

Get specific model information

#### Parameters

##### modelId

`string`

#### Returns

`Promise`\<`null` \| [`AIModel`](../interfaces/AIModel.md)\>

#### Overrides

[`BaseAIProvider`](BaseAIProvider.md).[`getModel`](BaseAIProvider.md#getmodel)

***

### calculateCost()

> **calculateCost**(`promptTokens`, `completionTokens`, `model?`): `number`

Defined in: [ai/providers/anthropic-provider.ts:610](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/anthropic-provider.ts#L610)

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

[`BaseAIProvider`](BaseAIProvider.md).[`calculateCost`](BaseAIProvider.md#calculatecost)

***

### getDisplayName()

> **getDisplayName**(): `string`

Defined in: [ai/providers/base-provider.ts:182](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/base-provider.ts#L182)

Get provider display name

#### Returns

`string`

#### Inherited from

[`BaseAIProvider`](BaseAIProvider.md).[`getDisplayName`](BaseAIProvider.md#getdisplayname)

***

### getHealth()

> **getHealth**(): [`ProviderHealth`](../interfaces/ProviderHealth.md)

Defined in: [ai/providers/base-provider.ts:237](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/base-provider.ts#L237)

Get provider health status

#### Returns

[`ProviderHealth`](../interfaces/ProviderHealth.md)

#### Inherited from

[`BaseAIProvider`](BaseAIProvider.md).[`getHealth`](BaseAIProvider.md#gethealth)

***

### getMetrics()

> **getMetrics**(): [`ProviderMetrics`](../interfaces/ProviderMetrics.md)

Defined in: [ai/providers/base-provider.ts:244](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/base-provider.ts#L244)

Get provider metrics

#### Returns

[`ProviderMetrics`](../interfaces/ProviderMetrics.md)

#### Inherited from

[`BaseAIProvider`](BaseAIProvider.md).[`getMetrics`](BaseAIProvider.md#getmetrics)

***

### supportsCapability()

> **supportsCapability**(`capability`): `boolean`

Defined in: [ai/providers/base-provider.ts:251](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/base-provider.ts#L251)

Check if provider supports a capability

#### Parameters

##### capability

[`AICapability`](../enumerations/AICapability.md)

#### Returns

`boolean`

#### Inherited from

[`BaseAIProvider`](BaseAIProvider.md).[`supportsCapability`](BaseAIProvider.md#supportscapability)

***

### getConfig()

> **getConfig**(): [`ProviderConfig`](../interfaces/ProviderConfig.md)

Defined in: [ai/providers/base-provider.ts:258](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/base-provider.ts#L258)

Get provider configuration

#### Returns

[`ProviderConfig`](../interfaces/ProviderConfig.md)

#### Inherited from

[`BaseAIProvider`](BaseAIProvider.md).[`getConfig`](BaseAIProvider.md#getconfig)

***

### updateConfig()

> **updateConfig**(`config`): `void`

Defined in: [ai/providers/base-provider.ts:265](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/base-provider.ts#L265)

Update provider configuration

#### Parameters

##### config

`Partial`\<[`ProviderConfig`](../interfaces/ProviderConfig.md)\>

#### Returns

`void`

#### Inherited from

[`BaseAIProvider`](BaseAIProvider.md).[`updateConfig`](BaseAIProvider.md#updateconfig)

***

### cleanup()

> **cleanup**(): `Promise`\<`void`\>

Defined in: [ai/providers/base-provider.ts:273](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/base-provider.ts#L273)

Cleanup provider resources

#### Returns

`Promise`\<`void`\>

#### Inherited from

[`BaseAIProvider`](BaseAIProvider.md).[`cleanup`](BaseAIProvider.md#cleanup)

***

### isReady()

> **isReady**(): `boolean`

Defined in: [ai/providers/base-provider.ts:281](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/base-provider.ts#L281)

Check if provider is initialized

#### Returns

`boolean`

#### Inherited from

[`BaseAIProvider`](BaseAIProvider.md).[`isReady`](BaseAIProvider.md#isready)

***

### performHealthCheck()

> **performHealthCheck**(): `Promise`\<`void`\>

Defined in: [ai/providers/base-provider.ts:288](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/base-provider.ts#L288)

Perform health check

#### Returns

`Promise`\<`void`\>

#### Inherited from

[`BaseAIProvider`](BaseAIProvider.md).[`performHealthCheck`](BaseAIProvider.md#performhealthcheck)

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

[`BaseAIProvider`](BaseAIProvider.md).[`updateMetrics`](BaseAIProvider.md#updatemetrics)

## Properties

### config

> `protected` **config**: [`ProviderConfig`](../interfaces/ProviderConfig.md)

Defined in: [ai/providers/base-provider.ts:162](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/base-provider.ts#L162)

#### Inherited from

[`BaseAIProvider`](BaseAIProvider.md).[`config`](BaseAIProvider.md#config)

***

### health

> `protected` **health**: [`ProviderHealth`](../interfaces/ProviderHealth.md)

Defined in: [ai/providers/base-provider.ts:163](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/base-provider.ts#L163)

#### Inherited from

[`BaseAIProvider`](BaseAIProvider.md).[`health`](BaseAIProvider.md#health)

***

### metrics

> `protected` **metrics**: [`ProviderMetrics`](../interfaces/ProviderMetrics.md)

Defined in: [ai/providers/base-provider.ts:164](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/base-provider.ts#L164)

#### Inherited from

[`BaseAIProvider`](BaseAIProvider.md).[`metrics`](BaseAIProvider.md#metrics)

***

### isInitialized

> `protected` **isInitialized**: `boolean` = `false`

Defined in: [ai/providers/base-provider.ts:165](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/base-provider.ts#L165)

#### Inherited from

[`BaseAIProvider`](BaseAIProvider.md).[`isInitialized`](BaseAIProvider.md#isinitialized)
