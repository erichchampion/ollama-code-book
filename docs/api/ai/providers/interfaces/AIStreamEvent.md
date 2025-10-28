[**Ollama Code API Documentation v0.1.0**](../../../README.md)

***

[Ollama Code API Documentation](../../../modules.md) / [ai/providers](../README.md) / AIStreamEvent

# Interface: AIStreamEvent

Defined in: [ai/providers/base-provider.ts:52](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/base-provider.ts#L52)

## Properties

### content

> **content**: `string`

Defined in: [ai/providers/base-provider.ts:53](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/base-provider.ts#L53)

***

### done

> **done**: `boolean`

Defined in: [ai/providers/base-provider.ts:54](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/base-provider.ts#L54)

***

### delta?

> `optional` **delta**: `string`

Defined in: [ai/providers/base-provider.ts:55](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/base-provider.ts#L55)

***

### toolCalls?

> `optional` **toolCalls**: `object`[]

Defined in: [ai/providers/base-provider.ts:56](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/base-provider.ts#L56)

#### id

> **id**: `string`

#### name

> **name**: `string`

#### input

> **input**: `any`

***

### usage?

> `optional` **usage**: `object`

Defined in: [ai/providers/base-provider.ts:57](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/base-provider.ts#L57)

#### promptTokens

> **promptTokens**: `number`

#### completionTokens

> **completionTokens**: `number`

#### totalTokens

> **totalTokens**: `number`

***

### metadata?

> `optional` **metadata**: `Record`\<`string`, `any`\>

Defined in: [ai/providers/base-provider.ts:62](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/base-provider.ts#L62)
