[**Ollama Code API Documentation v0.1.0**](../../../README.md)

***

[Ollama Code API Documentation](../../../modules.md) / [ai/providers](../README.md) / ProviderHealth

# Interface: ProviderHealth

Defined in: [ai/providers/base-provider.ts:132](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/base-provider.ts#L132)

## Properties

### status

> **status**: `"healthy"` \| `"degraded"` \| `"unhealthy"`

Defined in: [ai/providers/base-provider.ts:133](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/base-provider.ts#L133)

***

### lastCheck

> **lastCheck**: `Date`

Defined in: [ai/providers/base-provider.ts:134](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/base-provider.ts#L134)

***

### responseTime

> **responseTime**: `number`

Defined in: [ai/providers/base-provider.ts:135](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/base-provider.ts#L135)

***

### errorRate

> **errorRate**: `number`

Defined in: [ai/providers/base-provider.ts:136](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/base-provider.ts#L136)

***

### availability

> **availability**: `number`

Defined in: [ai/providers/base-provider.ts:137](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/base-provider.ts#L137)

***

### details

> **details**: `object`

Defined in: [ai/providers/base-provider.ts:138](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/base-provider.ts#L138)

#### endpoint

> **endpoint**: `string`

#### lastError?

> `optional` **lastError**: `string`

#### consecutiveFailures

> **consecutiveFailures**: `number`

#### lastSuccessfulRequest?

> `optional` **lastSuccessfulRequest**: `Date`
