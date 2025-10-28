[**Ollama Code API Documentation v0.1.0**](../../../../README.md)

***

[Ollama Code API Documentation](../../../../modules.md) / [ai/providers/response-fusion](../README.md) / ValidationResult

# Interface: ValidationResult

Defined in: [ai/providers/response-fusion.ts:76](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/response-fusion.ts#L76)

## Properties

### isValid

> **isValid**: `boolean`

Defined in: [ai/providers/response-fusion.ts:77](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/response-fusion.ts#L77)

***

### confidence

> **confidence**: `number`

Defined in: [ai/providers/response-fusion.ts:78](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/response-fusion.ts#L78)

***

### issues

> **issues**: `object`[]

Defined in: [ai/providers/response-fusion.ts:79](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/response-fusion.ts#L79)

#### type

> **type**: `"factual"` \| `"logical"` \| `"consistency"` \| `"completeness"` \| `"relevance"`

#### severity

> **severity**: `"low"` \| `"medium"` \| `"high"`

#### description

> **description**: `string`

#### affectedProviders

> **affectedProviders**: `string`[]

***

### suggestions

> **suggestions**: `string`[]

Defined in: [ai/providers/response-fusion.ts:85](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/ai/providers/response-fusion.ts#L85)
