[**Ollama Code API Documentation v0.1.0**](../../../README.md)

***

[Ollama Code API Documentation](../../../modules.md) / [ai/providers](../README.md) / ProviderError

# Class: ProviderError

Defined in: [ai/providers/base-provider.ts:384](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/base-provider.ts#L384)

Provider error types

## Extends

- `Error`

## Extended by

- [`ProviderRateLimitError`](ProviderRateLimitError.md)
- [`ProviderConnectionError`](ProviderConnectionError.md)
- [`ProviderAuthenticationError`](ProviderAuthenticationError.md)

## Constructors

### Constructor

> **new ProviderError**(`message`, `provider`, `code?`, `retryable?`): `ProviderError`

Defined in: [ai/providers/base-provider.ts:385](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/base-provider.ts#L385)

#### Parameters

##### message

`string`

##### provider

`string`

##### code?

`string`

##### retryable?

`boolean` = `false`

#### Returns

`ProviderError`

#### Overrides

`Error.constructor`

## Properties

### provider

> **provider**: `string`

Defined in: [ai/providers/base-provider.ts:387](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/base-provider.ts#L387)

***

### code?

> `optional` **code**: `string`

Defined in: [ai/providers/base-provider.ts:388](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/base-provider.ts#L388)

***

### retryable

> **retryable**: `boolean` = `false`

Defined in: [ai/providers/base-provider.ts:389](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/base-provider.ts#L389)
