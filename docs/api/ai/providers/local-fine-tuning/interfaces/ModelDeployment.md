[**Ollama Code API Documentation v0.1.0**](../../../../README.md)

***

[Ollama Code API Documentation](../../../../modules.md) / [ai/providers/local-fine-tuning](../README.md) / ModelDeployment

# Interface: ModelDeployment

Defined in: [ai/providers/local-fine-tuning.ts:103](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/local-fine-tuning.ts#L103)

## Properties

### id

> **id**: `string`

Defined in: [ai/providers/local-fine-tuning.ts:104](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/local-fine-tuning.ts#L104)

***

### name

> **name**: `string`

Defined in: [ai/providers/local-fine-tuning.ts:105](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/local-fine-tuning.ts#L105)

***

### modelPath

> **modelPath**: `string`

Defined in: [ai/providers/local-fine-tuning.ts:106](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/local-fine-tuning.ts#L106)

***

### status

> **status**: `"error"` \| `"deployed"` \| `"deploying"` \| `"stopped"`

Defined in: [ai/providers/local-fine-tuning.ts:107](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/local-fine-tuning.ts#L107)

***

### endpoint?

> `optional` **endpoint**: `string`

Defined in: [ai/providers/local-fine-tuning.ts:108](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/local-fine-tuning.ts#L108)

***

### port?

> `optional` **port**: `number`

Defined in: [ai/providers/local-fine-tuning.ts:109](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/local-fine-tuning.ts#L109)

***

### resources

> **resources**: `object`

Defined in: [ai/providers/local-fine-tuning.ts:110](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/local-fine-tuning.ts#L110)

#### memoryUsage

> **memoryUsage**: `number`

#### cpuUsage

> **cpuUsage**: `number`

#### gpuUsage?

> `optional` **gpuUsage**: `number`

***

### performance

> **performance**: `object`

Defined in: [ai/providers/local-fine-tuning.ts:115](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/local-fine-tuning.ts#L115)

#### requestsPerSecond

> **requestsPerSecond**: `number`

#### averageLatency

> **averageLatency**: `number`

#### throughput

> **throughput**: `number`

***

### createdAt

> **createdAt**: `Date`

Defined in: [ai/providers/local-fine-tuning.ts:120](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/local-fine-tuning.ts#L120)

***

### lastAccessed?

> `optional` **lastAccessed**: `Date`

Defined in: [ai/providers/local-fine-tuning.ts:121](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/local-fine-tuning.ts#L121)
