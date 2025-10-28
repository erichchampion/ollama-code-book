[**Ollama Code API Documentation v0.1.0**](../../README.md)

***

[Ollama Code API Documentation](../../modules.md) / [errors](../README.md) / UserErrorOptions

# Interface: UserErrorOptions

Defined in: [errors/types.ts:201](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/errors/types.ts#L201)

User error options

## Properties

### cause?

> `optional` **cause**: `unknown`

Defined in: [errors/types.ts:205](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/errors/types.ts#L205)

Original error that caused this error

***

### category?

> `optional` **category**: [`ErrorCategory`](../enumerations/ErrorCategory.md)

Defined in: [errors/types.ts:210](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/errors/types.ts#L210)

Error category

***

### level?

> `optional` **level**: [`ErrorLevel`](../enumerations/ErrorLevel.md)

Defined in: [errors/types.ts:215](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/errors/types.ts#L215)

Error level

***

### resolution?

> `optional` **resolution**: `string` \| `string`[]

Defined in: [errors/types.ts:220](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/errors/types.ts#L220)

Hint on how to resolve the error

***

### details?

> `optional` **details**: `Record`\<`string`, `unknown`\>

Defined in: [errors/types.ts:225](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/errors/types.ts#L225)

Additional details about the error

***

### context?

> `optional` **context**: `Record`\<`string`, `any`\>

Defined in: [errors/types.ts:230](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/errors/types.ts#L230)

Error context

***

### code?

> `optional` **code**: `string`

Defined in: [errors/types.ts:235](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/errors/types.ts#L235)

Error code
