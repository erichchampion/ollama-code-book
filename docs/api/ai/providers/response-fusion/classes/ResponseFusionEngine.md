[**Ollama Code API Documentation v0.1.0**](../../../../README.md)

***

[Ollama Code API Documentation](../../../../modules.md) / [ai/providers/response-fusion](../README.md) / ResponseFusionEngine

# Class: ResponseFusionEngine

Defined in: [ai/providers/response-fusion.ts:97](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/response-fusion.ts#L97)

## Extends

- `EventEmitter`

## Constructors

### Constructor

> **new ResponseFusionEngine**(): `ResponseFusionEngine`

Defined in: [ai/providers/response-fusion.ts:105](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/response-fusion.ts#L105)

#### Returns

`ResponseFusionEngine`

#### Overrides

`EventEmitter.constructor`

## Methods

### registerProvider()

> **registerProvider**(`provider`): `void`

Defined in: [ai/providers/response-fusion.ts:115](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/response-fusion.ts#L115)

Register an AI provider for fusion

#### Parameters

##### provider

[`BaseAIProvider`](../../classes/BaseAIProvider.md)

#### Returns

`void`

***

### unregisterProvider()

> **unregisterProvider**(`providerId`): `void`

Defined in: [ai/providers/response-fusion.ts:123](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/response-fusion.ts#L123)

Unregister a provider

#### Parameters

##### providerId

`string`

#### Returns

`void`

***

### fusedComplete()

> **fusedComplete**(`prompt`, `options`, `fusionOptions`): `Promise`\<[`FusionResult`](../interfaces/FusionResult.md)\>

Defined in: [ai/providers/response-fusion.ts:131](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/response-fusion.ts#L131)

Execute fusion request with multiple providers

#### Parameters

##### prompt

`string` | [`AIMessage`](../../interfaces/AIMessage.md)[]

##### options

[`AICompletionOptions`](../../interfaces/AICompletionOptions.md) = `{}`

##### fusionOptions

###### strategy?

`string`

###### providers?

`string`[]

###### timeout?

`number`

###### requireMinimum?

`number`

###### synthesisConfig?

`Partial`\<[`SynthesisConfig`](../interfaces/SynthesisConfig.md)\>

#### Returns

`Promise`\<[`FusionResult`](../interfaces/FusionResult.md)\>

***

### getStrategies()

> **getStrategies**(): [`FusionStrategy`](../interfaces/FusionStrategy.md)[]

Defined in: [ai/providers/response-fusion.ts:239](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/response-fusion.ts#L239)

Get available fusion strategies

#### Returns

[`FusionStrategy`](../interfaces/FusionStrategy.md)[]

***

### getProviders()

> **getProviders**(): `string`[]

Defined in: [ai/providers/response-fusion.ts:246](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/response-fusion.ts#L246)

Get registered providers

#### Returns

`string`[]

***

### getActiveRequests()

> **getActiveRequests**(): [`FusionRequest`](../interfaces/FusionRequest.md)[]

Defined in: [ai/providers/response-fusion.ts:253](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/response-fusion.ts#L253)

Get active requests

#### Returns

[`FusionRequest`](../interfaces/FusionRequest.md)[]

***

### cancelRequest()

> **cancelRequest**(`requestId`): `boolean`

Defined in: [ai/providers/response-fusion.ts:260](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/response-fusion.ts#L260)

Cancel an active request

#### Parameters

##### requestId

`string`

#### Returns

`boolean`

***

### clearCache()

> **clearCache**(): `void`

Defined in: [ai/providers/response-fusion.ts:271](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/response-fusion.ts#L271)

Clear response cache

#### Returns

`void`
