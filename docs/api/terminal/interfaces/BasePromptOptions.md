[**Ollama Code API Documentation v0.1.0**](../../README.md)

***

[Ollama Code API Documentation](../../modules.md) / [terminal](../README.md) / BasePromptOptions

# Interface: BasePromptOptions

Defined in: [terminal/types.ts:95](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/terminal/types.ts#L95)

Common prompt option properties

## Extended by

- [`InputPromptOptions`](InputPromptOptions.md)
- [`PasswordPromptOptions`](PasswordPromptOptions.md)
- [`ConfirmPromptOptions`](ConfirmPromptOptions.md)
- [`ListPromptOptions`](ListPromptOptions.md)
- [`CheckboxPromptOptions`](CheckboxPromptOptions.md)
- [`EditorPromptOptions`](EditorPromptOptions.md)

## Properties

### type

> **type**: [`PromptType`](../type-aliases/PromptType.md)

Defined in: [terminal/types.ts:99](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/terminal/types.ts#L99)

Prompt type

***

### name

> **name**: `string`

Defined in: [terminal/types.ts:104](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/terminal/types.ts#L104)

Name of the value in the returned object

***

### message

> **message**: `string`

Defined in: [terminal/types.ts:109](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/terminal/types.ts#L109)

Message to display to the user

***

### default?

> `optional` **default**: `any`

Defined in: [terminal/types.ts:114](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/terminal/types.ts#L114)

Default value

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

***

### required?

> `optional` **required**: `boolean`

Defined in: [terminal/types.ts:124](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/terminal/types.ts#L124)

Whether the prompt is required
