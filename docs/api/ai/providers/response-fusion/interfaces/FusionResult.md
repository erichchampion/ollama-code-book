[**Ollama Code API Documentation v0.1.0**](../../../../README.md)

***

[Ollama Code API Documentation](../../../../modules.md) / [ai/providers/response-fusion](../README.md) / FusionResult

# Interface: FusionResult

Defined in: [ai/providers/response-fusion.ts:46](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/response-fusion.ts#L46)

## Properties

### requestId

> **requestId**: `string`

Defined in: [ai/providers/response-fusion.ts:47](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/response-fusion.ts#L47)

***

### prompt

> **prompt**: `string` \| [`AIMessage`](../../interfaces/AIMessage.md)[]

Defined in: [ai/providers/response-fusion.ts:48](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/response-fusion.ts#L48)

***

### strategy

> **strategy**: [`FusionStrategy`](FusionStrategy.md)

Defined in: [ai/providers/response-fusion.ts:49](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/response-fusion.ts#L49)

***

### providerResponses

> **providerResponses**: [`ProviderResponse`](ProviderResponse.md)[]

Defined in: [ai/providers/response-fusion.ts:50](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/response-fusion.ts#L50)

***

### fusedResponse

> **fusedResponse**: `object`

Defined in: [ai/providers/response-fusion.ts:51](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/response-fusion.ts#L51)

#### content

> **content**: `string`

#### confidence

> **confidence**: `number`

#### qualityScore

> **qualityScore**: `number`

#### consensus

> **consensus**: `number`

#### diversity

> **diversity**: `number`

#### reliability

> **reliability**: `number`

***

### metadata

> **metadata**: `object`

Defined in: [ai/providers/response-fusion.ts:59](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/response-fusion.ts#L59)

#### totalProviders

> **totalProviders**: `number`

#### successfulProviders

> **successfulProviders**: `number`

#### failedProviders

> **failedProviders**: `number`

#### averageLatency

> **averageLatency**: `number`

#### fusionTime

> **fusionTime**: `number`

#### cacheable

> **cacheable**: `boolean`

***

### analysis

> **analysis**: `object`

Defined in: [ai/providers/response-fusion.ts:67](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/response-fusion.ts#L67)

#### agreementLevel

> **agreementLevel**: `number`

#### conflictPoints

> **conflictPoints**: `string`[]

#### strengthsByProvider

> **strengthsByProvider**: `Record`\<`string`, `string`[]\>

#### recommendedFollowups

> **recommendedFollowups**: `string`[]

***

### completedAt

> **completedAt**: `Date`

Defined in: [ai/providers/response-fusion.ts:73](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/response-fusion.ts#L73)
