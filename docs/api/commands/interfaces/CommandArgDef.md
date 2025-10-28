[**Ollama Code API Documentation v0.1.0**](../../README.md)

***

[Ollama Code API Documentation](../../modules.md) / [commands](../README.md) / CommandArgDef

# Interface: CommandArgDef

Defined in: [commands/types.ts:14](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/commands/types.ts#L14)

Command argument definition

## Properties

### name

> **name**: `string`

Defined in: [commands/types.ts:18](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/commands/types.ts#L18)

Argument name

***

### description

> **description**: `string`

Defined in: [commands/types.ts:23](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/commands/types.ts#L23)

Argument description

***

### type

> **type**: [`ArgType`](../enumerations/ArgType.md)

Defined in: [commands/types.ts:28](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/commands/types.ts#L28)

Argument type

***

### position?

> `optional` **position**: `number`

Defined in: [commands/types.ts:33](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/commands/types.ts#L33)

Argument position in positional args

***

### required?

> `optional` **required**: `boolean`

Defined in: [commands/types.ts:38](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/commands/types.ts#L38)

Whether the argument is required

***

### default?

> `optional` **default**: `any`

Defined in: [commands/types.ts:43](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/commands/types.ts#L43)

Default value

***

### choices?

> `optional` **choices**: `string`[]

Defined in: [commands/types.ts:48](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/commands/types.ts#L48)

Choices for the argument (if applicable)

***

### shortFlag?

> `optional` **shortFlag**: `string`

Defined in: [commands/types.ts:53](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/commands/types.ts#L53)

Short flag (e.g., -v for --verbose)

***

### flag?

> `optional` **flag**: `string`

Defined in: [commands/types.ts:58](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/commands/types.ts#L58)

Long flag (e.g., --verbose)

***

### hidden?

> `optional` **hidden**: `boolean`

Defined in: [commands/types.ts:63](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/commands/types.ts#L63)

Whether to hide from help
