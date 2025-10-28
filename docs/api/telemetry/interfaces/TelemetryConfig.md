[**Ollama Code API Documentation v0.1.0**](../../README.md)

***

[Ollama Code API Documentation](../../modules.md) / [telemetry](../README.md) / TelemetryConfig

# Interface: TelemetryConfig

Defined in: [telemetry/index.ts:81](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/telemetry/index.ts#L81)

Telemetry configuration

## Properties

### enabled

> **enabled**: `boolean`

Defined in: [telemetry/index.ts:85](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/telemetry/index.ts#L85)

Whether telemetry is enabled

***

### clientId

> **clientId**: `string`

Defined in: [telemetry/index.ts:90](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/telemetry/index.ts#L90)

Client ID (anonymous)

***

### endpoint?

> `optional` **endpoint**: `string`

Defined in: [telemetry/index.ts:95](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/telemetry/index.ts#L95)

Endpoint for sending telemetry data

***

### additionalData?

> `optional` **additionalData**: `Record`\<`string`, `any`\>

Defined in: [telemetry/index.ts:100](https://github.com/erichchampion/ollama-code/blob/1174940021f16bcb3532cf8cda9d6c9f9b0e072f/ollama-code/src/telemetry/index.ts#L100)

Additional data to include with all events
