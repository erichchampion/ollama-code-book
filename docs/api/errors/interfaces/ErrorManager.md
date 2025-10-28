[**Ollama Code API Documentation v0.1.0**](../../README.md)

***

[Ollama Code API Documentation](../../modules.md) / [errors](../README.md) / ErrorManager

# Interface: ErrorManager

Defined in: [errors/types.ts:241](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/errors/types.ts#L241)

Error manager interface

## Methods

### handleError()

> **handleError**(`error`, `options?`): `void`

Defined in: [errors/types.ts:242](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/errors/types.ts#L242)

#### Parameters

##### error

`unknown`

##### options?

[`ErrorOptions`](ErrorOptions.md)

#### Returns

`void`

***

### handleFatalError()

> **handleFatalError**(`error`): `never`

Defined in: [errors/types.ts:243](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/errors/types.ts#L243)

#### Parameters

##### error

`unknown`

#### Returns

`never`

***

### formatError()

> **formatError**(`error`, `options?`): `string`

Defined in: [errors/types.ts:244](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/errors/types.ts#L244)

#### Parameters

##### error

`unknown`

##### options?

[`ErrorOptions`](ErrorOptions.md)

#### Returns

`string`

***

### getErrorCount()

> **getErrorCount**(`category?`): `number`

Defined in: [errors/types.ts:245](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/errors/types.ts#L245)

#### Parameters

##### category?

[`ErrorCategory`](../enumerations/ErrorCategory.md)

#### Returns

`number`

***

### clearErrorCount()

> **clearErrorCount**(`category?`): `void`

Defined in: [errors/types.ts:246](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/errors/types.ts#L246)

#### Parameters

##### category?

[`ErrorCategory`](../enumerations/ErrorCategory.md)

#### Returns

`void`
