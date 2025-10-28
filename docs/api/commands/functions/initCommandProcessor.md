[**Ollama Code API Documentation v0.1.0**](../../README.md)

***

[Ollama Code API Documentation](../../modules.md) / [commands](../README.md) / initCommandProcessor

# Function: initCommandProcessor()

> **initCommandProcessor**(`config`, `dependencies`): `Promise`\<`CommandProcessor`\>

Defined in: [commands/index.ts:509](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/commands/index.ts#L509)

Initialize the command processor

## Parameters

### config

`AppConfig`

Configuration options

### dependencies

Application dependencies needed by commands

#### terminal

[`TerminalInterface`](../../terminal/interfaces/TerminalInterface.md)

#### ai

`AIClient`

#### codebase

`CodebaseAnalysis`

#### fileOps

`FileOperations`

#### execution

`ExecutionEnvironment`

#### errors

`ErrorHandler`

## Returns

`Promise`\<`CommandProcessor`\>
