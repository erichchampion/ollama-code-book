[**Ollama Code API Documentation v0.1.0**](../../README.md)

***

[Ollama Code API Documentation](../../modules.md) / [terminal](../README.md) / TerminalInterface

# Interface: TerminalInterface

Defined in: [terminal/types.ts:191](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/terminal/types.ts#L191)

Terminal interface for user interaction

## Methods

### clear()

> **clear**(): `void`

Defined in: [terminal/types.ts:195](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/terminal/types.ts#L195)

Clear the terminal screen

#### Returns

`void`

***

### display()

> **display**(`content`): `void`

Defined in: [terminal/types.ts:200](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/terminal/types.ts#L200)

Display formatted content

#### Parameters

##### content

`string`

#### Returns

`void`

***

### displayWelcome()

> **displayWelcome**(): `void`

Defined in: [terminal/types.ts:205](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/terminal/types.ts#L205)

Display a welcome message

#### Returns

`void`

***

### emphasize()

> **emphasize**(`message`): `void`

Defined in: [terminal/types.ts:210](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/terminal/types.ts#L210)

Display a message with emphasis

#### Parameters

##### message

`string`

#### Returns

`void`

***

### info()

> **info**(`message`): `void`

Defined in: [terminal/types.ts:215](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/terminal/types.ts#L215)

Display an informational message

#### Parameters

##### message

`string`

#### Returns

`void`

***

### success()

> **success**(`message`): `void`

Defined in: [terminal/types.ts:220](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/terminal/types.ts#L220)

Display a success message

#### Parameters

##### message

`string`

#### Returns

`void`

***

### warn()

> **warn**(`message`): `void`

Defined in: [terminal/types.ts:225](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/terminal/types.ts#L225)

Display a warning message

#### Parameters

##### message

`string`

#### Returns

`void`

***

### error()

> **error**(`message`): `void`

Defined in: [terminal/types.ts:230](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/terminal/types.ts#L230)

Display an error message

#### Parameters

##### message

`string`

#### Returns

`void`

***

### text()

> **text**(`message`): `void`

Defined in: [terminal/types.ts:235](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/terminal/types.ts#L235)

Display plain text without special formatting

#### Parameters

##### message

`string`

#### Returns

`void`

***

### link()

> **link**(`text`, `url`): `string`

Defined in: [terminal/types.ts:240](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/terminal/types.ts#L240)

Create a clickable link in the terminal if supported

#### Parameters

##### text

`string`

##### url

`string`

#### Returns

`string`

***

### table()

> **table**(`data`, `options?`): `void`

Defined in: [terminal/types.ts:245](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/terminal/types.ts#L245)

Display a table of data

#### Parameters

##### data

`any`[][]

##### options?

###### header?

`string`[]

###### border?

`boolean`

#### Returns

`void`

***

### prompt()

> **prompt**\<`T`\>(`options`): `Promise`\<`T`\>

Defined in: [terminal/types.ts:250](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/terminal/types.ts#L250)

Prompt user for input

#### Type Parameters

##### T

`T`

#### Parameters

##### options

[`PromptOptions`](../type-aliases/PromptOptions.md)

#### Returns

`Promise`\<`T`\>

***

### spinner()

> **spinner**(`text`, `id?`): [`SpinnerInstance`](SpinnerInstance.md)

Defined in: [terminal/types.ts:255](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/terminal/types.ts#L255)

Create a spinner for showing progress

#### Parameters

##### text

`string`

##### id?

`string`

#### Returns

[`SpinnerInstance`](SpinnerInstance.md)
