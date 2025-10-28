[**Ollama Code API Documentation v0.1.0**](../../../../README.md)

***

[Ollama Code API Documentation](../../../../modules.md) / [ai/providers/local-fine-tuning](../README.md) / FineTuningJob

# Interface: FineTuningJob

Defined in: [ai/providers/local-fine-tuning.ts:39](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/local-fine-tuning.ts#L39)

## Properties

### id

> **id**: `string`

Defined in: [ai/providers/local-fine-tuning.ts:40](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/local-fine-tuning.ts#L40)

***

### name

> **name**: `string`

Defined in: [ai/providers/local-fine-tuning.ts:41](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/local-fine-tuning.ts#L41)

***

### status

> **status**: `"pending"` \| `"running"` \| `"completed"` \| `"failed"` \| `"cancelled"`

Defined in: [ai/providers/local-fine-tuning.ts:42](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/local-fine-tuning.ts#L42)

***

### baseModel

> **baseModel**: `string`

Defined in: [ai/providers/local-fine-tuning.ts:43](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/local-fine-tuning.ts#L43)

***

### dataset

> **dataset**: [`FineTuningDataset`](FineTuningDataset.md)

Defined in: [ai/providers/local-fine-tuning.ts:44](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/local-fine-tuning.ts#L44)

***

### config

> **config**: [`FineTuningConfig`](FineTuningConfig.md)

Defined in: [ai/providers/local-fine-tuning.ts:45](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/local-fine-tuning.ts#L45)

***

### progress

> **progress**: `object`

Defined in: [ai/providers/local-fine-tuning.ts:46](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/local-fine-tuning.ts#L46)

#### currentEpoch

> **currentEpoch**: `number`

#### totalEpochs

> **totalEpochs**: `number`

#### loss

> **loss**: `number`

#### accuracy?

> `optional` **accuracy**: `number`

#### validationLoss?

> `optional` **validationLoss**: `number`

#### estimatedTimeRemaining?

> `optional` **estimatedTimeRemaining**: `number`

***

### results?

> `optional` **results**: `object`

Defined in: [ai/providers/local-fine-tuning.ts:54](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/local-fine-tuning.ts#L54)

#### finalLoss

> **finalLoss**: `number`

#### accuracy

> **accuracy**: `number`

#### perplexity?

> `optional` **perplexity**: `number`

#### bleuScore?

> `optional` **bleuScore**: `number`

#### customMetrics?

> `optional` **customMetrics**: `Record`\<`string`, `number`\>

***

### outputModel

> **outputModel**: `object`

Defined in: [ai/providers/local-fine-tuning.ts:61](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/local-fine-tuning.ts#L61)

#### path?

> `optional` **path**: `string`

#### size?

> `optional` **size**: `number`

#### quantization?

> `optional` **quantization**: `string`

***

### logs

> **logs**: `string`[]

Defined in: [ai/providers/local-fine-tuning.ts:66](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/local-fine-tuning.ts#L66)

***

### createdAt

> **createdAt**: `Date`

Defined in: [ai/providers/local-fine-tuning.ts:67](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/local-fine-tuning.ts#L67)

***

### startedAt?

> `optional` **startedAt**: `Date`

Defined in: [ai/providers/local-fine-tuning.ts:68](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/local-fine-tuning.ts#L68)

***

### completedAt?

> `optional` **completedAt**: `Date`

Defined in: [ai/providers/local-fine-tuning.ts:69](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/local-fine-tuning.ts#L69)

***

### error?

> `optional` **error**: `string`

Defined in: [ai/providers/local-fine-tuning.ts:70](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/local-fine-tuning.ts#L70)
