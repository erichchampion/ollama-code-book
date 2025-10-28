[**Ollama Code API Documentation v0.1.0**](../../README.md)

***

[Ollama Code API Documentation](../../modules.md) / [terminal](../README.md) / SpinnerInstance

# Interface: SpinnerInstance

Defined in: [terminal/types.ts:50](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/terminal/types.ts#L50)

Spinner instance for progress indicators

## Methods

### update()

> **update**(`text`): `SpinnerInstance`

Defined in: [terminal/types.ts:59](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/terminal/types.ts#L59)

Update spinner text

#### Parameters

##### text

`string`

#### Returns

`SpinnerInstance`

***

### succeed()

> **succeed**(`text?`): `SpinnerInstance`

Defined in: [terminal/types.ts:64](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/terminal/types.ts#L64)

Mark spinner as successful and stop

#### Parameters

##### text?

`string`

#### Returns

`SpinnerInstance`

***

### fail()

> **fail**(`text?`): `SpinnerInstance`

Defined in: [terminal/types.ts:69](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/terminal/types.ts#L69)

Mark spinner as failed and stop

#### Parameters

##### text?

`string`

#### Returns

`SpinnerInstance`

***

### warn()

> **warn**(`text?`): `SpinnerInstance`

Defined in: [terminal/types.ts:74](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/terminal/types.ts#L74)

Mark spinner with warning and stop

#### Parameters

##### text?

`string`

#### Returns

`SpinnerInstance`

***

### info()

> **info**(`text?`): `SpinnerInstance`

Defined in: [terminal/types.ts:79](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/terminal/types.ts#L79)

Mark spinner with info and stop

#### Parameters

##### text?

`string`

#### Returns

`SpinnerInstance`

***

### stop()

> **stop**(): `SpinnerInstance`

Defined in: [terminal/types.ts:84](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/terminal/types.ts#L84)

Stop spinner without any indicator

#### Returns

`SpinnerInstance`

## Properties

### id

> **id**: `string`

Defined in: [terminal/types.ts:54](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/terminal/types.ts#L54)

Spinner identifier
