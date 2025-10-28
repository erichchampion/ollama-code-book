[**Ollama Code API Documentation v0.1.0**](../../../README.md)

***

[Ollama Code API Documentation](../../../modules.md) / [ai/providers](../README.md) / ProviderConfig

# Interface: ProviderConfig

Defined in: [ai/providers/base-provider.ts:111](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/base-provider.ts#L111)

## Properties

### name

> **name**: `string`

Defined in: [ai/providers/base-provider.ts:112](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/base-provider.ts#L112)

***

### apiKey?

> `optional` **apiKey**: `string`

Defined in: [ai/providers/base-provider.ts:113](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/base-provider.ts#L113)

***

### baseUrl?

> `optional` **baseUrl**: `string`

Defined in: [ai/providers/base-provider.ts:114](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/base-provider.ts#L114)

***

### timeout?

> `optional` **timeout**: `number`

Defined in: [ai/providers/base-provider.ts:115](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/base-provider.ts#L115)

***

### retryOptions?

> `optional` **retryOptions**: `object`

Defined in: [ai/providers/base-provider.ts:116](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/base-provider.ts#L116)

#### maxRetries

> **maxRetries**: `number`

#### initialDelayMs

> **initialDelayMs**: `number`

#### maxDelayMs

> **maxDelayMs**: `number`

***

### rateLimiting?

> `optional` **rateLimiting**: `object`

Defined in: [ai/providers/base-provider.ts:121](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/base-provider.ts#L121)

#### enabled

> **enabled**: `boolean`

#### requestsPerMinute

> **requestsPerMinute**: `number`

#### tokensPerMinute

> **tokensPerMinute**: `number`

***

### caching?

> `optional` **caching**: `object`

Defined in: [ai/providers/base-provider.ts:126](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/base-provider.ts#L126)

#### enabled

> **enabled**: `boolean`

#### ttlMs

> **ttlMs**: `number`
