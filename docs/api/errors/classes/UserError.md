[**Ollama Code API Documentation v0.1.0**](../../README.md)

***

[Ollama Code API Documentation](../../modules.md) / [errors](../README.md) / UserError

# Class: UserError

Defined in: [errors/types.ts:252](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/errors/types.ts#L252)

User error

## Extends

- `Error`

## Constructors

### Constructor

> **new UserError**(`message`, `options`): `UserError`

Defined in: [errors/types.ts:291](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/errors/types.ts#L291)

Create a new user error

#### Parameters

##### message

`string`

##### options

[`UserErrorOptions`](../interfaces/UserErrorOptions.md) = `{}`

#### Returns

`UserError`

#### Overrides

`Error.constructor`

## Properties

### cause?

> `optional` **cause**: `unknown`

Defined in: [errors/types.ts:256](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/errors/types.ts#L256)

Original error that caused this error

#### Overrides

`Error.cause`

***

### category

> **category**: [`ErrorCategory`](../enumerations/ErrorCategory.md)

Defined in: [errors/types.ts:261](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/errors/types.ts#L261)

Error category

***

### level

> **level**: [`ErrorLevel`](../enumerations/ErrorLevel.md)

Defined in: [errors/types.ts:266](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/errors/types.ts#L266)

Error level

***

### resolution?

> `optional` **resolution**: `string` \| `string`[]

Defined in: [errors/types.ts:271](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/errors/types.ts#L271)

Hint on how to resolve the error

***

### details

> **details**: `Record`\<`string`, `unknown`\>

Defined in: [errors/types.ts:276](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/errors/types.ts#L276)

Additional details about the error

***

### context?

> `optional` **context**: `Record`\<`string`, `any`\>

Defined in: [errors/types.ts:281](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/errors/types.ts#L281)

Error context

***

### code?

> `optional` **code**: `string`

Defined in: [errors/types.ts:286](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/errors/types.ts#L286)

Error code
