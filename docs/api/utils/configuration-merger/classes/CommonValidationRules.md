[**Ollama Code API Documentation v0.1.0**](../../../README.md)

***

[Ollama Code API Documentation](../../../modules.md) / [utils/configuration-merger](../README.md) / CommonValidationRules

# Class: CommonValidationRules

Defined in: [utils/configuration-merger.ts:181](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/utils/configuration-merger.ts#L181)

Common validation rules for AI provider configurations

## Constructors

### Constructor

> **new CommonValidationRules**(): `CommonValidationRules`

#### Returns

`CommonValidationRules`

## Methods

### positiveNumber()

> `static` **positiveNumber**\<`T`\>(`getter`, `fieldName`): [`ConfigValidationRule`](../interfaces/ConfigValidationRule.md)\<`T`\>

Defined in: [utils/configuration-merger.ts:182](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/utils/configuration-merger.ts#L182)

#### Type Parameters

##### T

`T`

#### Parameters

##### getter

(`config`) => `number`

##### fieldName

`string`

#### Returns

[`ConfigValidationRule`](../interfaces/ConfigValidationRule.md)\<`T`\>

***

### requiredString()

> `static` **requiredString**\<`T`\>(`getter`, `fieldName`): [`ConfigValidationRule`](../interfaces/ConfigValidationRule.md)\<`T`\>

Defined in: [utils/configuration-merger.ts:195](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/utils/configuration-merger.ts#L195)

#### Type Parameters

##### T

`T`

#### Parameters

##### getter

(`config`) => `string`

##### fieldName

`string`

#### Returns

[`ConfigValidationRule`](../interfaces/ConfigValidationRule.md)\<`T`\>

***

### portRange()

> `static` **portRange**\<`T`\>(`getter`, `fieldName`): [`ConfigValidationRule`](../interfaces/ConfigValidationRule.md)\<`T`\>

Defined in: [utils/configuration-merger.ts:208](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/utils/configuration-merger.ts#L208)

#### Type Parameters

##### T

`T`

#### Parameters

##### getter

(`config`) => `number`

##### fieldName

`string`

#### Returns

[`ConfigValidationRule`](../interfaces/ConfigValidationRule.md)\<`T`\>

***

### percentageRange()

> `static` **percentageRange**\<`T`\>(`getter`, `fieldName`): [`ConfigValidationRule`](../interfaces/ConfigValidationRule.md)\<`T`\>

Defined in: [utils/configuration-merger.ts:221](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/utils/configuration-merger.ts#L221)

#### Type Parameters

##### T

`T`

#### Parameters

##### getter

(`config`) => `number`

##### fieldName

`string`

#### Returns

[`ConfigValidationRule`](../interfaces/ConfigValidationRule.md)\<`T`\>
