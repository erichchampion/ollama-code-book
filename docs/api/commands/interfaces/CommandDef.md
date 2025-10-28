[**Ollama Code API Documentation v0.1.0**](../../README.md)

***

[Ollama Code API Documentation](../../modules.md) / [commands](../README.md) / CommandDef

# Interface: CommandDef

Defined in: [commands/index.ts:23](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/commands/index.ts#L23)

Command definition

## Properties

### name

> **name**: `string`

Defined in: [commands/index.ts:27](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/commands/index.ts#L27)

Command name

***

### description

> **description**: `string`

Defined in: [commands/index.ts:32](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/commands/index.ts#L32)

Command description

***

### examples?

> `optional` **examples**: `string`[]

Defined in: [commands/index.ts:37](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/commands/index.ts#L37)

Command usage examples

***

### args?

> `optional` **args**: [`CommandArgDef`](CommandArgDef.md)[]

Defined in: [commands/index.ts:42](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/commands/index.ts#L42)

Command arguments

***

### handler()

> **handler**: (`args`) => `Promise`\<`any`\>

Defined in: [commands/index.ts:47](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/commands/index.ts#L47)

Command handler function

#### Parameters

##### args

`Record`\<`string`, `any`\>

#### Returns

`Promise`\<`any`\>

***

### aliases?

> `optional` **aliases**: `string`[]

Defined in: [commands/index.ts:52](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/commands/index.ts#L52)

Command aliases

***

### category?

> `optional` **category**: `string`

Defined in: [commands/index.ts:57](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/commands/index.ts#L57)

Command category for grouping in help

***

### interactive?

> `optional` **interactive**: `boolean`

Defined in: [commands/index.ts:63](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/commands/index.ts#L63)

Whether the command can be used in interactive mode

***

### hidden?

> `optional` **hidden**: `boolean`

Defined in: [commands/index.ts:68](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/commands/index.ts#L68)

Whether to hide from help
