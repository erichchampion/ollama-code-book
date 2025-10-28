[**Ollama Code API Documentation v0.1.0**](../../../../README.md)

***

[Ollama Code API Documentation](../../../../modules.md) / [ai/providers/model-deployment-manager](../README.md) / DeploymentConfig

# Interface: DeploymentConfig

Defined in: [ai/providers/model-deployment-manager.ts:20](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/model-deployment-manager.ts#L20)

## Properties

### name

> **name**: `string`

Defined in: [ai/providers/model-deployment-manager.ts:21](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/model-deployment-manager.ts#L21)

***

### modelPath

> **modelPath**: `string`

Defined in: [ai/providers/model-deployment-manager.ts:22](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/model-deployment-manager.ts#L22)

***

### modelType

> **modelType**: `"ollama"` \| `"custom"` \| `"huggingface"` \| `"onnx"` \| `"tensorrt"`

Defined in: [ai/providers/model-deployment-manager.ts:23](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/model-deployment-manager.ts#L23)

***

### runtime

> **runtime**: `"auto"` \| `"cpu"` \| `"gpu"`

Defined in: [ai/providers/model-deployment-manager.ts:24](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/model-deployment-manager.ts#L24)

***

### resources

> **resources**: `object`

Defined in: [ai/providers/model-deployment-manager.ts:25](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/model-deployment-manager.ts#L25)

#### maxMemoryMB

> **maxMemoryMB**: `number`

#### maxCpuCores

> **maxCpuCores**: `number`

#### gpuDevices?

> `optional` **gpuDevices**: `number`[]

#### diskSpaceGB

> **diskSpaceGB**: `number`

***

### scaling

> **scaling**: `object`

Defined in: [ai/providers/model-deployment-manager.ts:31](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/model-deployment-manager.ts#L31)

#### minInstances

> **minInstances**: `number`

#### maxInstances

> **maxInstances**: `number`

#### targetConcurrency

> **targetConcurrency**: `number`

#### scaleUpThreshold

> **scaleUpThreshold**: `number`

#### scaleDownThreshold

> **scaleDownThreshold**: `number`

***

### networking

> **networking**: `object`

Defined in: [ai/providers/model-deployment-manager.ts:38](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/model-deployment-manager.ts#L38)

#### port?

> `optional` **port**: `number`

#### host?

> `optional` **host**: `string`

#### ssl?

> `optional` **ssl**: `object`

##### ssl.enabled

> **enabled**: `boolean`

##### ssl.certPath?

> `optional` **certPath**: `string`

##### ssl.keyPath?

> `optional` **keyPath**: `string`

#### cors?

> `optional` **cors**: `object`

##### cors.enabled

> **enabled**: `boolean`

##### cors.origins?

> `optional` **origins**: `string`[]

***

### health

> **health**: `object`

Defined in: [ai/providers/model-deployment-manager.ts:51](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/model-deployment-manager.ts#L51)

#### checkInterval

> **checkInterval**: `number`

#### timeout

> **timeout**: `number`

#### retries

> **retries**: `number`

#### warmupTime

> **warmupTime**: `number`

***

### monitoring

> **monitoring**: `object`

Defined in: [ai/providers/model-deployment-manager.ts:57](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/model-deployment-manager.ts#L57)

#### metricsEnabled

> **metricsEnabled**: `boolean`

#### loggingLevel

> **loggingLevel**: `"error"` \| `"warn"` \| `"info"` \| `"debug"`

#### retentionDays

> **retentionDays**: `number`
