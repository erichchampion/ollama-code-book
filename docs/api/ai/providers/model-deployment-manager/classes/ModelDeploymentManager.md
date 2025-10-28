[**Ollama Code API Documentation v0.1.0**](../../../../README.md)

***

[Ollama Code API Documentation](../../../../modules.md) / [ai/providers/model-deployment-manager](../README.md) / ModelDeploymentManager

# Class: ModelDeploymentManager

Defined in: [ai/providers/model-deployment-manager.ts:126](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/model-deployment-manager.ts#L126)

## Extends

- `EventEmitter`

## Constructors

### Constructor

> **new ModelDeploymentManager**(`workspaceDir`): `ModelDeploymentManager`

Defined in: [ai/providers/model-deployment-manager.ts:134](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/model-deployment-manager.ts#L134)

#### Parameters

##### workspaceDir

`string` = `'./ollama-code-workspace'`

#### Returns

`ModelDeploymentManager`

#### Overrides

`EventEmitter.constructor`

## Methods

### initialize()

> **initialize**(): `Promise`\<`void`\>

Defined in: [ai/providers/model-deployment-manager.ts:153](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/model-deployment-manager.ts#L153)

Initialize the deployment manager

#### Returns

`Promise`\<`void`\>

***

### registerModel()

> **registerModel**(`name`, `version`, `type`, `modelPath`, `metadata`): `Promise`\<[`ModelRegistryEntry`](../interfaces/ModelRegistryEntry.md)\>

Defined in: [ai/providers/model-deployment-manager.ts:168](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/model-deployment-manager.ts#L168)

Register a new model in the registry

#### Parameters

##### name

`string`

##### version

`string`

##### type

`"ollama"` | `"custom"` | `"huggingface"` | `"onnx"` | `"tensorrt"`

##### modelPath

`string`

##### metadata

###### description?

`string`

###### author?

`string`

###### license?

`string`

###### tags?

`string`[]

###### capabilities?

`string`[]

#### Returns

`Promise`\<[`ModelRegistryEntry`](../interfaces/ModelRegistryEntry.md)\>

***

### deployModel()

> **deployModel**(`modelId`, `config`): `Promise`\<[`ModelDeployment`](../../local-fine-tuning/interfaces/ModelDeployment.md)\>

Defined in: [ai/providers/model-deployment-manager.ts:203](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/model-deployment-manager.ts#L203)

Deploy a registered model

#### Parameters

##### modelId

`string`

##### config

`Partial`\<[`DeploymentConfig`](../interfaces/DeploymentConfig.md)\>

#### Returns

`Promise`\<[`ModelDeployment`](../../local-fine-tuning/interfaces/ModelDeployment.md)\>

***

### scaleDeployment()

> **scaleDeployment**(`deploymentId`, `targetInstances`): `Promise`\<`void`\>

Defined in: [ai/providers/model-deployment-manager.ts:260](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/model-deployment-manager.ts#L260)

Scale a deployment up or down

#### Parameters

##### deploymentId

`string`

##### targetInstances

`number`

#### Returns

`Promise`\<`void`\>

***

### startInstance()

> **startInstance**(`deploymentId`): `Promise`\<[`DeploymentInstance`](../interfaces/DeploymentInstance.md)\>

Defined in: [ai/providers/model-deployment-manager.ts:291](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/model-deployment-manager.ts#L291)

Start a new instance of a deployment

#### Parameters

##### deploymentId

`string`

#### Returns

`Promise`\<[`DeploymentInstance`](../interfaces/DeploymentInstance.md)\>

***

### stopInstance()

> **stopInstance**(`instanceId`): `Promise`\<`void`\>

Defined in: [ai/providers/model-deployment-manager.ts:349](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/model-deployment-manager.ts#L349)

Stop an instance

#### Parameters

##### instanceId

`string`

#### Returns

`Promise`\<`void`\>

***

### getDeployment()

> **getDeployment**(`deploymentId`): `undefined` \| [`ModelDeployment`](../../local-fine-tuning/interfaces/ModelDeployment.md)

Defined in: [ai/providers/model-deployment-manager.ts:391](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/model-deployment-manager.ts#L391)

Get deployment status

#### Parameters

##### deploymentId

`string`

#### Returns

`undefined` \| [`ModelDeployment`](../../local-fine-tuning/interfaces/ModelDeployment.md)

***

### listDeployments()

> **listDeployments**(): [`ModelDeployment`](../../local-fine-tuning/interfaces/ModelDeployment.md)[]

Defined in: [ai/providers/model-deployment-manager.ts:398](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/model-deployment-manager.ts#L398)

List all deployments

#### Returns

[`ModelDeployment`](../../local-fine-tuning/interfaces/ModelDeployment.md)[]

***

### getInstances()

> **getInstances**(`deploymentId`): [`DeploymentInstance`](../interfaces/DeploymentInstance.md)[]

Defined in: [ai/providers/model-deployment-manager.ts:405](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/model-deployment-manager.ts#L405)

Get instances for a deployment

#### Parameters

##### deploymentId

`string`

#### Returns

[`DeploymentInstance`](../interfaces/DeploymentInstance.md)[]

***

### getLoadBalancer()

> **getLoadBalancer**(`deploymentId`): `undefined` \| [`LoadBalancer`](../interfaces/LoadBalancer.md)

Defined in: [ai/providers/model-deployment-manager.ts:413](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/model-deployment-manager.ts#L413)

Get load balancer for a deployment

#### Parameters

##### deploymentId

`string`

#### Returns

`undefined` \| [`LoadBalancer`](../interfaces/LoadBalancer.md)

***

### routeRequest()

> **routeRequest**(`deploymentId`): `null` \| [`DeploymentInstance`](../interfaces/DeploymentInstance.md)

Defined in: [ai/providers/model-deployment-manager.ts:420](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/model-deployment-manager.ts#L420)

Route request to healthy instance

#### Parameters

##### deploymentId

`string`

#### Returns

`null` \| [`DeploymentInstance`](../interfaces/DeploymentInstance.md)

***

### updateInstanceMetrics()

> **updateInstanceMetrics**(`instanceId`, `metrics`): `void`

Defined in: [ai/providers/model-deployment-manager.ts:453](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/model-deployment-manager.ts#L453)

Update instance metrics

#### Parameters

##### instanceId

`string`

##### metrics

`Partial`\<[`DeploymentInstance`](../interfaces/DeploymentInstance.md)\[`"performance"`\]\>

#### Returns

`void`

***

### cleanup()

> **cleanup**(): `Promise`\<`void`\>

Defined in: [ai/providers/model-deployment-manager.ts:464](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/model-deployment-manager.ts#L464)

Cleanup all resources

#### Returns

`Promise`\<`void`\>
