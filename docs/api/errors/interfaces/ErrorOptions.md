[**Ollama Code API Documentation v0.1.0**](../../README.md)

***

[Ollama Code API Documentation](../../modules.md) / [errors](../README.md) / ErrorOptions

# Interface: ErrorOptions

Defined in: [errors/types.ts:166](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/errors/types.ts#L166)

Error options for error handling

## Properties

### level?

> `optional` **level**: [`ErrorLevel`](../enumerations/ErrorLevel.md)

Defined in: [errors/types.ts:170](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/errors/types.ts#L170)

Error level

***

### category?

> `optional` **category**: [`ErrorCategory`](../enumerations/ErrorCategory.md)

Defined in: [errors/types.ts:175](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/errors/types.ts#L175)

Error category

***

### context?

> `optional` **context**: `Record`\<`string`, `any`\>

Defined in: [errors/types.ts:180](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/errors/types.ts#L180)

Additional context for the error

***

### report?

> `optional` **report**: `boolean`

Defined in: [errors/types.ts:185](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/errors/types.ts#L185)

Whether to report the error to monitoring systems

***

### userMessage?

> `optional` **userMessage**: `string`

Defined in: [errors/types.ts:190](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/errors/types.ts#L190)

User message to display

***

### resolution?

> `optional` **resolution**: `string` \| `string`[]

Defined in: [errors/types.ts:195](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/errors/types.ts#L195)

Suggested resolution steps
