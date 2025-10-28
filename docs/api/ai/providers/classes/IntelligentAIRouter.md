[**Ollama Code API Documentation v0.1.0**](../../../README.md)

***

[Ollama Code API Documentation](../../../modules.md) / [ai/providers](../README.md) / IntelligentAIRouter

# Class: IntelligentAIRouter

Defined in: [ai/providers/intelligent-router.ts:84](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/intelligent-router.ts#L84)

Intelligent AI Router

## Extends

- `EventEmitter`

## Constructors

### Constructor

> **new IntelligentAIRouter**(`config`): `IntelligentAIRouter`

Defined in: [ai/providers/intelligent-router.ts:94](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/intelligent-router.ts#L94)

#### Parameters

##### config

`Partial`\<[`RouterConfig`](../interfaces/RouterConfig.md)\> = `{}`

#### Returns

`IntelligentAIRouter`

#### Overrides

`EventEmitter.constructor`

## Methods

### registerProvider()

> **registerProvider**(`provider`): `Promise`\<`void`\>

Defined in: [ai/providers/intelligent-router.ts:116](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/intelligent-router.ts#L116)

Register a provider with the router

#### Parameters

##### provider

[`BaseAIProvider`](BaseAIProvider.md)

#### Returns

`Promise`\<`void`\>

***

### unregisterProvider()

> **unregisterProvider**(`providerName`): `Promise`\<`void`\>

Defined in: [ai/providers/intelligent-router.ts:147](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/intelligent-router.ts#L147)

Unregister a provider

#### Parameters

##### providerName

`string`

#### Returns

`Promise`\<`void`\>

***

### route()

> **route**(`prompt`, `options`, `context`): `Promise`\<[`AICompletionResponse`](../interfaces/AICompletionResponse.md)\>

Defined in: [ai/providers/intelligent-router.ts:166](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/intelligent-router.ts#L166)

Route a completion request to the optimal provider

#### Parameters

##### prompt

`string` | [`AIMessage`](../interfaces/AIMessage.md)[]

##### options

[`AICompletionOptions`](../interfaces/AICompletionOptions.md) = `{}`

##### context

`Partial`\<[`RoutingContext`](../interfaces/RoutingContext.md)\> = `{}`

#### Returns

`Promise`\<[`AICompletionResponse`](../interfaces/AICompletionResponse.md)\>

***

### routeStream()

> **routeStream**(`prompt`, `options`, `onEvent`, `context`, `abortSignal?`): `Promise`\<`void`\>

Defined in: [ai/providers/intelligent-router.ts:214](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/intelligent-router.ts#L214)

Route a streaming completion request

#### Parameters

##### prompt

`string` | [`AIMessage`](../interfaces/AIMessage.md)[]

##### options

[`AICompletionOptions`](../interfaces/AICompletionOptions.md)

##### onEvent

(`event`) => `void`

##### context

`Partial`\<[`RoutingContext`](../interfaces/RoutingContext.md)\> = `{}`

##### abortSignal?

`AbortSignal`

#### Returns

`Promise`\<`void`\>

***

### getBestProvider()

> **getBestProvider**(`context`): `Promise`\<`null` \| [`BaseAIProvider`](BaseAIProvider.md)\>

Defined in: [ai/providers/intelligent-router.ts:258](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/intelligent-router.ts#L258)

Get the best provider for specific capabilities

#### Parameters

##### context

`Partial`\<[`RoutingContext`](../interfaces/RoutingContext.md)\> = `{}`

#### Returns

`Promise`\<`null` \| [`BaseAIProvider`](BaseAIProvider.md)\>

***

### getAllModels()

> **getAllModels**(): `Promise`\<[`AIModel`](../interfaces/AIModel.md)[]\>

Defined in: [ai/providers/intelligent-router.ts:270](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/intelligent-router.ts#L270)

List all available models across all providers

#### Returns

`Promise`\<[`AIModel`](../interfaces/AIModel.md)[]\>

***

### getMetrics()

> **getMetrics**(): [`RouterMetrics`](../interfaces/RouterMetrics.md)

Defined in: [ai/providers/intelligent-router.ts:288](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/intelligent-router.ts#L288)

Get router metrics

#### Returns

[`RouterMetrics`](../interfaces/RouterMetrics.md)

***

### getProviderStatus()

> **getProviderStatus**(): `Record`\<`string`, `any`\>

Defined in: [ai/providers/intelligent-router.ts:295](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/intelligent-router.ts#L295)

Get provider status summary

#### Returns

`Record`\<`string`, `any`\>

***

### cleanup()

> **cleanup**(): `Promise`\<`void`\>

Defined in: [ai/providers/intelligent-router.ts:322](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/intelligent-router.ts#L322)

Cleanup router resources

#### Returns

`Promise`\<`void`\>
