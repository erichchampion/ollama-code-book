[**Ollama Code API Documentation v0.1.0**](../../../../README.md)

***

[Ollama Code API Documentation](../../../../modules.md) / [ai/providers/local-fine-tuning](../README.md) / LocalFineTuningManager

# Class: LocalFineTuningManager

Defined in: [ai/providers/local-fine-tuning.ts:124](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/local-fine-tuning.ts#L124)

## Extends

- `EventEmitter`

## Constructors

### Constructor

> **new LocalFineTuningManager**(`workspaceDir`): `LocalFineTuningManager`

Defined in: [ai/providers/local-fine-tuning.ts:133](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/local-fine-tuning.ts#L133)

#### Parameters

##### workspaceDir

`string` = `'./ollama-code-workspace'`

#### Returns

`LocalFineTuningManager`

#### Overrides

`EventEmitter.constructor`

## Methods

### initialize()

> **initialize**(): `Promise`\<`void`\>

Defined in: [ai/providers/local-fine-tuning.ts:143](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/local-fine-tuning.ts#L143)

Initialize the fine-tuning workspace

#### Returns

`Promise`\<`void`\>

***

### createDataset()

> **createDataset**(`name`, `description`, `type`, `sourceFiles`, `options`): `Promise`\<[`FineTuningDataset`](../interfaces/FineTuningDataset.md)\>

Defined in: [ai/providers/local-fine-tuning.ts:157](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/local-fine-tuning.ts#L157)

Create a new dataset from files

#### Parameters

##### name

`string`

##### description

`string`

##### type

`"documentation"` | `"code_analysis"` | `"general"` | `"code_completion"`

##### sourceFiles

`string`[]

##### options

###### language?

`string`

###### framework?

`string`

###### domain?

`string`

###### format?

`"csv"` \| `"jsonl"` \| `"parquet"`

###### validateQuality?

`boolean`

#### Returns

`Promise`\<[`FineTuningDataset`](../interfaces/FineTuningDataset.md)\>

***

### startFineTuning()

> **startFineTuning**(`name`, `baseModel`, `datasetId`, `config`): `Promise`\<[`FineTuningJob`](../interfaces/FineTuningJob.md)\>

Defined in: [ai/providers/local-fine-tuning.ts:219](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/local-fine-tuning.ts#L219)

Start a fine-tuning job

#### Parameters

##### name

`string`

##### baseModel

`string`

##### datasetId

`string`

##### config

`Partial`\<[`FineTuningConfig`](../interfaces/FineTuningConfig.md)\> = `{}`

#### Returns

`Promise`\<[`FineTuningJob`](../interfaces/FineTuningJob.md)\>

***

### getJob()

> **getJob**(`jobId`): `undefined` \| [`FineTuningJob`](../interfaces/FineTuningJob.md)

Defined in: [ai/providers/local-fine-tuning.ts:267](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/local-fine-tuning.ts#L267)

Monitor a fine-tuning job

#### Parameters

##### jobId

`string`

#### Returns

`undefined` \| [`FineTuningJob`](../interfaces/FineTuningJob.md)

***

### listJobs()

> **listJobs**(): [`FineTuningJob`](../interfaces/FineTuningJob.md)[]

Defined in: [ai/providers/local-fine-tuning.ts:274](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/local-fine-tuning.ts#L274)

List all jobs

#### Returns

[`FineTuningJob`](../interfaces/FineTuningJob.md)[]

***

### cancelJob()

> **cancelJob**(`jobId`): `Promise`\<`void`\>

Defined in: [ai/providers/local-fine-tuning.ts:281](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/local-fine-tuning.ts#L281)

Cancel a running job

#### Parameters

##### jobId

`string`

#### Returns

`Promise`\<`void`\>

***

### deployModel()

> **deployModel**(`name`, `modelPath`, `options`): `Promise`\<[`ModelDeployment`](../interfaces/ModelDeployment.md)\>

Defined in: [ai/providers/local-fine-tuning.ts:305](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/local-fine-tuning.ts#L305)

Deploy a fine-tuned model

#### Parameters

##### name

`string`

##### modelPath

`string`

##### options

###### port?

`number`

###### resources?

\{ `maxMemory?`: `number`; `maxCpu?`: `number`; `useGpu?`: `boolean`; \}

###### resources.maxMemory?

`number`

###### resources.maxCpu?

`number`

###### resources.useGpu?

`boolean`

#### Returns

`Promise`\<[`ModelDeployment`](../interfaces/ModelDeployment.md)\>

***

### listDatasets()

> **listDatasets**(): [`FineTuningDataset`](../interfaces/FineTuningDataset.md)[]

Defined in: [ai/providers/local-fine-tuning.ts:356](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/local-fine-tuning.ts#L356)

List all datasets

#### Returns

[`FineTuningDataset`](../interfaces/FineTuningDataset.md)[]

***

### listDeployments()

> **listDeployments**(): [`ModelDeployment`](../interfaces/ModelDeployment.md)[]

Defined in: [ai/providers/local-fine-tuning.ts:363](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/local-fine-tuning.ts#L363)

List all deployments

#### Returns

[`ModelDeployment`](../interfaces/ModelDeployment.md)[]

***

### getDeployment()

> **getDeployment**(`deploymentId`): `undefined` \| [`ModelDeployment`](../interfaces/ModelDeployment.md)

Defined in: [ai/providers/local-fine-tuning.ts:370](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/local-fine-tuning.ts#L370)

Get deployment status

#### Parameters

##### deploymentId

`string`

#### Returns

`undefined` \| [`ModelDeployment`](../interfaces/ModelDeployment.md)

***

### stopDeployment()

> **stopDeployment**(`deploymentId`): `Promise`\<`void`\>

Defined in: [ai/providers/local-fine-tuning.ts:377](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/local-fine-tuning.ts#L377)

Stop a model deployment

#### Parameters

##### deploymentId

`string`

#### Returns

`Promise`\<`void`\>

***

### cleanup()

> **cleanup**(): `Promise`\<`void`\>

Defined in: [ai/providers/local-fine-tuning.ts:391](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/local-fine-tuning.ts#L391)

Cleanup resources

#### Returns

`Promise`\<`void`\>
