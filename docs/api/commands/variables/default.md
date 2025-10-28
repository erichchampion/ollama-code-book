[**Ollama Code API Documentation v0.1.0**](../../README.md)

***

[Ollama Code API Documentation](../../modules.md) / [commands](../README.md) / default

# Variable: default

> **default**: `object`

Defined in: [commands/index.ts:631](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/commands/index.ts#L631)

## Type Declaration

### commandRegistry

> **commandRegistry**: `CommandRegistry`

### parseArgs()

> **parseArgs**: (`args`, `command`) => `Record`\<`string`, `any`\>

Parse command-line arguments

#### Parameters

##### args

`string`[]

##### command

[`CommandDef`](../interfaces/CommandDef.md)

#### Returns

`Record`\<`string`, `any`\>

### executeCommand()

> **executeCommand**: (`commandName`, `args`) => `Promise`\<`any`\>

Execute a command

#### Parameters

##### commandName

`string`

##### args

`string`[]

#### Returns

`Promise`\<`any`\>

### generateCommandHelp()

> **generateCommandHelp**: (`command`) => `string`

Generate help text for a command

#### Parameters

##### command

[`CommandDef`](../interfaces/CommandDef.md)

#### Returns

`string`
