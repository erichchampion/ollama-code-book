[**Ollama Code API Documentation v0.1.0**](../../../README.md)

***

[Ollama Code API Documentation](../../../modules.md) / [utils/directory-manager](../README.md) / DirectoryManager

# Class: DirectoryManager

Defined in: [utils/directory-manager.ts:15](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/utils/directory-manager.ts#L15)

## Constructors

### Constructor

> **new DirectoryManager**(): `DirectoryManager`

#### Returns

`DirectoryManager`

## Methods

### ensureDirectories()

> `static` **ensureDirectories**(...`paths`): `Promise`\<`void`\>

Defined in: [utils/directory-manager.ts:19](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/utils/directory-manager.ts#L19)

Ensure multiple directories exist, creating them if necessary

#### Parameters

##### paths

...`string`[]

#### Returns

`Promise`\<`void`\>

***

### createStructure()

> `static` **createStructure**(`basePath`, `structure`): `Promise`\<`void`\>

Defined in: [utils/directory-manager.ts:28](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/utils/directory-manager.ts#L28)

Create a directory structure from a nested object definition

#### Parameters

##### basePath

`string`

##### structure

[`DirectoryStructure`](../interfaces/DirectoryStructure.md)

#### Returns

`Promise`\<`void`\>

***

### ensureWorkspace()

> `static` **ensureWorkspace**(`workspaceDir`, `subdirs`): `Promise`\<`void`\>

Defined in: [utils/directory-manager.ts:51](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/utils/directory-manager.ts#L51)

Ensure workspace directories for AI providers

#### Parameters

##### workspaceDir

`string`

##### subdirs

`string`[]

#### Returns

`Promise`\<`void`\>

***

### cleanupEmptyDirectories()

> `static` **cleanupEmptyDirectories**(`basePath`): `Promise`\<`void`\>

Defined in: [utils/directory-manager.ts:59](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/utils/directory-manager.ts#L59)

Clean up empty directories in a path

#### Parameters

##### basePath

`string`

#### Returns

`Promise`\<`void`\>

***

### isDirectoryAccessible()

> `static` **isDirectoryAccessible**(`dirPath`): `Promise`\<`boolean`\>

Defined in: [utils/directory-manager.ts:84](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/utils/directory-manager.ts#L84)

Check if directory exists and is writable

#### Parameters

##### dirPath

`string`

#### Returns

`Promise`\<`boolean`\>

***

### getDirectorySize()

> `static` **getDirectorySize**(`dirPath`): `Promise`\<`number`\>

Defined in: [utils/directory-manager.ts:97](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/utils/directory-manager.ts#L97)

Get directory size in bytes

#### Parameters

##### dirPath

`string`

#### Returns

`Promise`\<`number`\>
