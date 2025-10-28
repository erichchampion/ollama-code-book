[**Ollama Code API Documentation v0.1.0**](../../../../README.md)

***

[Ollama Code API Documentation](../../../../modules.md) / [ai/providers/local-fine-tuning](../README.md) / FineTuningConfig

# Interface: FineTuningConfig

Defined in: [ai/providers/local-fine-tuning.ts:73](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/local-fine-tuning.ts#L73)

## Properties

### epochs

> **epochs**: `number`

Defined in: [ai/providers/local-fine-tuning.ts:74](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/local-fine-tuning.ts#L74)

***

### learningRate

> **learningRate**: `number`

Defined in: [ai/providers/local-fine-tuning.ts:75](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/local-fine-tuning.ts#L75)

***

### batchSize

> **batchSize**: `number`

Defined in: [ai/providers/local-fine-tuning.ts:76](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/local-fine-tuning.ts#L76)

***

### validationSplit

> **validationSplit**: `number`

Defined in: [ai/providers/local-fine-tuning.ts:77](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/local-fine-tuning.ts#L77)

***

### maxSequenceLength

> **maxSequenceLength**: `number`

Defined in: [ai/providers/local-fine-tuning.ts:78](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/local-fine-tuning.ts#L78)

***

### temperature

> **temperature**: `number`

Defined in: [ai/providers/local-fine-tuning.ts:79](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/local-fine-tuning.ts#L79)

***

### dropout?

> `optional` **dropout**: `number`

Defined in: [ai/providers/local-fine-tuning.ts:80](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/local-fine-tuning.ts#L80)

***

### gradientClipping?

> `optional` **gradientClipping**: `number`

Defined in: [ai/providers/local-fine-tuning.ts:81](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/local-fine-tuning.ts#L81)

***

### weightDecay?

> `optional` **weightDecay**: `number`

Defined in: [ai/providers/local-fine-tuning.ts:82](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/local-fine-tuning.ts#L82)

***

### warmupSteps?

> `optional` **warmupSteps**: `number`

Defined in: [ai/providers/local-fine-tuning.ts:83](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/local-fine-tuning.ts#L83)

***

### saveSteps?

> `optional` **saveSteps**: `number`

Defined in: [ai/providers/local-fine-tuning.ts:84](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/local-fine-tuning.ts#L84)

***

### evaluationSteps?

> `optional` **evaluationSteps**: `number`

Defined in: [ai/providers/local-fine-tuning.ts:85](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/local-fine-tuning.ts#L85)

***

### earlyStopping?

> `optional` **earlyStopping**: `object`

Defined in: [ai/providers/local-fine-tuning.ts:86](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/local-fine-tuning.ts#L86)

#### enabled

> **enabled**: `boolean`

#### patience

> **patience**: `number`

#### minDelta

> **minDelta**: `number`

***

### quantization?

> `optional` **quantization**: `object`

Defined in: [ai/providers/local-fine-tuning.ts:91](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/local-fine-tuning.ts#L91)

#### enabled

> **enabled**: `boolean`

#### type

> **type**: `"int8"` \| `"int4"` \| `"float16"`

***

### lora?

> `optional` **lora**: `object`

Defined in: [ai/providers/local-fine-tuning.ts:95](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/local-fine-tuning.ts#L95)

#### enabled

> **enabled**: `boolean`

#### rank

> **rank**: `number`

#### alpha

> **alpha**: `number`

#### dropout

> **dropout**: `number`
