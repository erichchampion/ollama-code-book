[**Ollama Code API Documentation v0.1.0**](../../../../README.md)

***

[Ollama Code API Documentation](../../../../modules.md) / [ai/providers/local-fine-tuning](../README.md) / FineTuningDataset

# Interface: FineTuningDataset

Defined in: [ai/providers/local-fine-tuning.ts:19](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/local-fine-tuning.ts#L19)

## Properties

### id

> **id**: `string`

Defined in: [ai/providers/local-fine-tuning.ts:20](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/local-fine-tuning.ts#L20)

***

### name

> **name**: `string`

Defined in: [ai/providers/local-fine-tuning.ts:21](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/local-fine-tuning.ts#L21)

***

### description

> **description**: `string`

Defined in: [ai/providers/local-fine-tuning.ts:22](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/local-fine-tuning.ts#L22)

***

### type

> **type**: `"documentation"` \| `"code_analysis"` \| `"general"` \| `"code_completion"`

Defined in: [ai/providers/local-fine-tuning.ts:23](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/local-fine-tuning.ts#L23)

***

### format

> **format**: `"csv"` \| `"jsonl"` \| `"parquet"`

Defined in: [ai/providers/local-fine-tuning.ts:24](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/local-fine-tuning.ts#L24)

***

### filePath

> **filePath**: `string`

Defined in: [ai/providers/local-fine-tuning.ts:25](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/local-fine-tuning.ts#L25)

***

### size

> **size**: `number`

Defined in: [ai/providers/local-fine-tuning.ts:26](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/local-fine-tuning.ts#L26)

***

### samples

> **samples**: `number`

Defined in: [ai/providers/local-fine-tuning.ts:27](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/local-fine-tuning.ts#L27)

***

### createdAt

> **createdAt**: `Date`

Defined in: [ai/providers/local-fine-tuning.ts:28](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/local-fine-tuning.ts#L28)

***

### lastModified

> **lastModified**: `Date`

Defined in: [ai/providers/local-fine-tuning.ts:29](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/local-fine-tuning.ts#L29)

***

### metadata

> **metadata**: `object`

Defined in: [ai/providers/local-fine-tuning.ts:30](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/local-fine-tuning.ts#L30)

#### language?

> `optional` **language**: `string`

#### framework?

> `optional` **framework**: `string`

#### domain?

> `optional` **domain**: `string`

#### quality?

> `optional` **quality**: `"low"` \| `"medium"` \| `"high"`

#### validated

> **validated**: `boolean`
