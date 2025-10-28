[**Ollama Code API Documentation v0.1.0**](../../../README.md)

***

[Ollama Code API Documentation](../../../modules.md) / [ai/providers](../README.md) / AICompletionResponse

# Interface: AICompletionResponse

Defined in: [ai/providers/base-provider.ts:33](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/base-provider.ts#L33)

## Properties

### content

> **content**: `string`

Defined in: [ai/providers/base-provider.ts:34](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/base-provider.ts#L34)

***

### toolCalls?

> `optional` **toolCalls**: `object`[]

Defined in: [ai/providers/base-provider.ts:35](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/base-provider.ts#L35)

#### id

> **id**: `string`

#### name

> **name**: `string`

#### input

> **input**: `any`

***

### model

> **model**: `string`

Defined in: [ai/providers/base-provider.ts:36](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/base-provider.ts#L36)

***

### finishReason

> **finishReason**: `"length"` \| `"error"` \| `"stop"` \| `"content_filter"` \| `"function_call"`

Defined in: [ai/providers/base-provider.ts:37](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/base-provider.ts#L37)

***

### usage

> **usage**: `object`

Defined in: [ai/providers/base-provider.ts:38](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/base-provider.ts#L38)

#### promptTokens

> **promptTokens**: `number`

#### completionTokens

> **completionTokens**: `number`

#### totalTokens

> **totalTokens**: `number`

***

### metadata

> **metadata**: `object`

Defined in: [ai/providers/base-provider.ts:43](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/base-provider.ts#L43)

#### requestId

> **requestId**: `string`

#### processingTime

> **processingTime**: `number`

#### provider

> **provider**: `string`

#### cached?

> `optional` **cached**: `boolean`

#### retryCount?

> `optional` **retryCount**: `number`
