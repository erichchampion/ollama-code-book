[**Ollama Code API Documentation v0.1.0**](../../../README.md)

***

[Ollama Code API Documentation](../../../modules.md) / [ai/providers](../README.md) / RoutingContext

# Interface: RoutingContext

Defined in: [ai/providers/intelligent-router.ts:41](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/intelligent-router.ts#L41)

## Properties

### requiredCapabilities

> **requiredCapabilities**: [`AICapability`](../enumerations/AICapability.md)[]

Defined in: [ai/providers/intelligent-router.ts:42](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/intelligent-router.ts#L42)

***

### preferredResponseTime

> **preferredResponseTime**: `number`

Defined in: [ai/providers/intelligent-router.ts:43](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/intelligent-router.ts#L43)

***

### maxCostPerToken

> **maxCostPerToken**: `number`

Defined in: [ai/providers/intelligent-router.ts:44](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/intelligent-router.ts#L44)

***

### prioritizeQuality

> **prioritizeQuality**: `boolean`

Defined in: [ai/providers/intelligent-router.ts:45](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/intelligent-router.ts#L45)

***

### sessionId?

> `optional` **sessionId**: `string`

Defined in: [ai/providers/intelligent-router.ts:46](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/intelligent-router.ts#L46)

***

### userId?

> `optional` **userId**: `string`

Defined in: [ai/providers/intelligent-router.ts:47](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/intelligent-router.ts#L47)

***

### requestType

> **requestType**: `"analysis"` \| `"streaming"` \| `"completion"` \| `"generation"`

Defined in: [ai/providers/intelligent-router.ts:48](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/intelligent-router.ts#L48)
