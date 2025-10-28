[**Ollama Code API Documentation v0.1.0**](../../../../README.md)

***

[Ollama Code API Documentation](../../../../modules.md) / [ai/providers/model-deployment-manager](../README.md) / DeploymentInstance

# Interface: DeploymentInstance

Defined in: [ai/providers/model-deployment-manager.ts:64](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/model-deployment-manager.ts#L64)

## Properties

### id

> **id**: `string`

Defined in: [ai/providers/model-deployment-manager.ts:65](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/model-deployment-manager.ts#L65)

***

### deploymentId

> **deploymentId**: `string`

Defined in: [ai/providers/model-deployment-manager.ts:66](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/model-deployment-manager.ts#L66)

***

### pid?

> `optional` **pid**: `number`

Defined in: [ai/providers/model-deployment-manager.ts:67](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/model-deployment-manager.ts#L67)

***

### port

> **port**: `number`

Defined in: [ai/providers/model-deployment-manager.ts:68](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/model-deployment-manager.ts#L68)

***

### status

> **status**: `"error"` \| `"running"` \| `"starting"` \| `"stopped"` \| `"stopping"`

Defined in: [ai/providers/model-deployment-manager.ts:69](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/model-deployment-manager.ts#L69)

***

### startedAt?

> `optional` **startedAt**: `Date`

Defined in: [ai/providers/model-deployment-manager.ts:70](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/model-deployment-manager.ts#L70)

***

### lastHealthCheck?

> `optional` **lastHealthCheck**: `Date`

Defined in: [ai/providers/model-deployment-manager.ts:71](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/model-deployment-manager.ts#L71)

***

### healthStatus

> **healthStatus**: `"unknown"` \| `"healthy"` \| `"unhealthy"`

Defined in: [ai/providers/model-deployment-manager.ts:72](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/model-deployment-manager.ts#L72)

***

### resources

> **resources**: `object`

Defined in: [ai/providers/model-deployment-manager.ts:73](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/model-deployment-manager.ts#L73)

#### memoryUsageMB

> **memoryUsageMB**: `number`

#### cpuUsagePercent

> **cpuUsagePercent**: `number`

#### gpuUsagePercent?

> `optional` **gpuUsagePercent**: `number`

***

### performance

> **performance**: `object`

Defined in: [ai/providers/model-deployment-manager.ts:78](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/model-deployment-manager.ts#L78)

#### requestCount

> **requestCount**: `number`

#### averageLatency

> **averageLatency**: `number`

#### errorRate

> **errorRate**: `number`

#### throughput

> **throughput**: `number`

***

### logs

> **logs**: `string`[]

Defined in: [ai/providers/model-deployment-manager.ts:84](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/model-deployment-manager.ts#L84)

***

### process?

> `optional` **process**: `ChildProcess`

Defined in: [ai/providers/model-deployment-manager.ts:85](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/model-deployment-manager.ts#L85)
