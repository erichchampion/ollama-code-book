[**Ollama Code API Documentation v0.1.0**](../../../README.md)

***

[Ollama Code API Documentation](../../../modules.md) / [utils/configuration-merger](../README.md) / ConfigurationMerger

# Class: ConfigurationMerger

Defined in: [utils/configuration-merger.ts:19](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/utils/configuration-merger.ts#L19)

## Constructors

### Constructor

> **new ConfigurationMerger**(): `ConfigurationMerger`

#### Returns

`ConfigurationMerger`

## Methods

### mergeWithDefaults()

> `static` **mergeWithDefaults**\<`T`\>(`partialConfig`, `defaults`, `options`): `T`

Defined in: [utils/configuration-merger.ts:23](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/utils/configuration-merger.ts#L23)

Merge partial configuration with defaults

#### Type Parameters

##### T

`T`

#### Parameters

##### partialConfig

`Partial`\<`T`\>

##### defaults

`T`

##### options

[`MergeOptions`](../interfaces/MergeOptions.md) = `{}`

#### Returns

`T`

***

### mergeWithValidation()

> `static` **mergeWithValidation**\<`T`\>(`partialConfig`, `defaults`, `validationRules`, `options`): `T`

Defined in: [utils/configuration-merger.ts:44](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/utils/configuration-merger.ts#L44)

Merge configuration with validation

#### Type Parameters

##### T

`T`

#### Parameters

##### partialConfig

`Partial`\<`T`\>

##### defaults

`T`

##### validationRules

[`ConfigValidationRule`](../interfaces/ConfigValidationRule.md)\<`T`\>[] = `[]`

##### options

[`MergeOptions`](../interfaces/MergeOptions.md) = `{}`

#### Returns

`T`

***

### deepMerge()

> `static` **deepMerge**\<`T`\>(`target`, `source`, `allowUndefined`): `T`

Defined in: [utils/configuration-merger.ts:62](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/utils/configuration-merger.ts#L62)

Deep merge two objects

#### Type Parameters

##### T

`T`

#### Parameters

##### target

`T`

##### source

`Partial`\<`T`\>

##### allowUndefined

`boolean` = `false`

#### Returns

`T`

***

### validateConfig()

> `static` **validateConfig**\<`T`\>(`config`, `validationRules`): `void`

Defined in: [utils/configuration-merger.ts:87](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/utils/configuration-merger.ts#L87)

Validate configuration against rules

#### Type Parameters

##### T

`T`

#### Parameters

##### config

`T`

##### validationRules

[`ConfigValidationRule`](../interfaces/ConfigValidationRule.md)\<`T`\>[]

#### Returns

`void`

***

### filterUndefined()

> `static` **filterUndefined**\<`T`\>(`obj`): `Partial`\<`T`\>

Defined in: [utils/configuration-merger.ts:107](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/utils/configuration-merger.ts#L107)

Filter out undefined values from partial config

#### Type Parameters

##### T

`T`

#### Parameters

##### obj

`Partial`\<`T`\>

#### Returns

`Partial`\<`T`\>

***

### createEnvironmentOverrides()

> `static` **createEnvironmentOverrides**\<`T`\>(`baseConfig`, `environmentOverrides`, `environment`): `T`

Defined in: [utils/configuration-merger.ts:122](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/utils/configuration-merger.ts#L122)

Create environment-specific configuration overrides

#### Type Parameters

##### T

`T`

#### Parameters

##### baseConfig

`T`

##### environmentOverrides

`Record`\<`string`, `Partial`\<`T`\>\>

##### environment

`string` = `...`

#### Returns

`T`

***

### mergeMultiple()

> `static` **mergeMultiple**\<`T`\>(`defaultConfig`, ...`configs`): `T`

Defined in: [utils/configuration-merger.ts:134](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/utils/configuration-merger.ts#L134)

Merge multiple configuration sources in order of priority

#### Type Parameters

##### T

`T`

#### Parameters

##### defaultConfig

`T`

##### configs

...(`undefined` \| `Partial`\<`T`\>)[]

#### Returns

`T`

***

### extractSubset()

> `static` **extractSubset**\<`T`, `K`\>(`config`, `keys`): `Pick`\<`T`, `K`\>

Defined in: [utils/configuration-merger.ts:149](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/utils/configuration-merger.ts#L149)

Extract subset of configuration based on keys

#### Type Parameters

##### T

`T` *extends* `object`

##### K

`K` *extends* `string` \| `number` \| `symbol`

#### Parameters

##### config

`T`

##### keys

`K`[]

#### Returns

`Pick`\<`T`, `K`\>
