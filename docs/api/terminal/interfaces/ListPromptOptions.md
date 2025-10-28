[**Ollama Code API Documentation v0.1.0**](../../README.md)

***

[Ollama Code API Documentation](../../modules.md) / [terminal](../README.md) / ListPromptOptions

# Interface: ListPromptOptions

Defined in: [terminal/types.ts:154](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/terminal/types.ts#L154)

List prompt options

## Extends

- [`BasePromptOptions`](BasePromptOptions.md)

## Properties

### name

> **name**: `string`

Defined in: [terminal/types.ts:104](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/terminal/types.ts#L104)

Name of the value in the returned object

#### Inherited from

[`BasePromptOptions`](BasePromptOptions.md).[`name`](BasePromptOptions.md#name)

***

### message

> **message**: `string`

Defined in: [terminal/types.ts:109](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/terminal/types.ts#L109)

Message to display to the user

#### Inherited from

[`BasePromptOptions`](BasePromptOptions.md).[`message`](BasePromptOptions.md#message)

***

### default?

> `optional` **default**: `any`

Defined in: [terminal/types.ts:114](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/terminal/types.ts#L114)

Default value

#### Inherited from

[`BasePromptOptions`](BasePromptOptions.md).[`default`](BasePromptOptions.md#default)

***

### validate()?

> `optional` **validate**: (`input`) => `string` \| `boolean` \| `Promise`\<`string` \| `boolean`\>

Defined in: [terminal/types.ts:119](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/terminal/types.ts#L119)

Validation function

#### Parameters

##### input

`any`

#### Returns

`string` \| `boolean` \| `Promise`\<`string` \| `boolean`\>

#### Inherited from

[`BasePromptOptions`](BasePromptOptions.md).[`validate`](BasePromptOptions.md#validate)

***

### required?

> `optional` **required**: `boolean`

Defined in: [terminal/types.ts:124](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/terminal/types.ts#L124)

Whether the prompt is required

#### Inherited from

[`BasePromptOptions`](BasePromptOptions.md).[`required`](BasePromptOptions.md#required)

***

### type

> **type**: `"list"` \| `"rawlist"`

Defined in: [terminal/types.ts:155](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/terminal/types.ts#L155)

Prompt type

#### Overrides

[`BasePromptOptions`](BasePromptOptions.md).[`type`](BasePromptOptions.md#type)

***

### choices

> **choices**: (`string` \| \{ `name`: `string`; `value`: `any`; `short?`: `string`; \})[]

Defined in: [terminal/types.ts:156](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/terminal/types.ts#L156)

***

### pageSize?

> `optional` **pageSize**: `number`

Defined in: [terminal/types.ts:157](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/terminal/types.ts#L157)
