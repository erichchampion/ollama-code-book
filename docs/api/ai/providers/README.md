[**Ollama Code API Documentation v0.1.0**](../../README.md)

***

[Ollama Code API Documentation](../../modules.md) / ai/providers

# ai/providers

## Classes

- [AnthropicProvider](classes/AnthropicProvider.md)
- [BaseAIProvider](classes/BaseAIProvider.md)
- [ProviderError](classes/ProviderError.md)
- [ProviderRateLimitError](classes/ProviderRateLimitError.md)
- [ProviderConnectionError](classes/ProviderConnectionError.md)
- [ProviderAuthenticationError](classes/ProviderAuthenticationError.md)
- [GoogleProvider](classes/GoogleProvider.md)
- [IntelligentAIRouter](classes/IntelligentAIRouter.md)
- [OllamaProvider](classes/OllamaProvider.md)
- [OpenAIProvider](classes/OpenAIProvider.md)

## Interfaces

- [AIMessage](interfaces/AIMessage.md)
- [AICompletionOptions](interfaces/AICompletionOptions.md)
- [AICompletionResponse](interfaces/AICompletionResponse.md)
- [AIStreamEvent](interfaces/AIStreamEvent.md)
- [AIModel](interfaces/AIModel.md)
- [ProviderCapabilities](interfaces/ProviderCapabilities.md)
- [ProviderConfig](interfaces/ProviderConfig.md)
- [ProviderHealth](interfaces/ProviderHealth.md)
- [ProviderMetrics](interfaces/ProviderMetrics.md)
- [RoutingStrategy](interfaces/RoutingStrategy.md)
- [RoutingContext](interfaces/RoutingContext.md)
- [RoutingDecision](interfaces/RoutingDecision.md)
- [RouterConfig](interfaces/RouterConfig.md)
- [RouterMetrics](interfaces/RouterMetrics.md)

## Functions

- [createProvider](functions/createProvider.md)
- [getAvailableProviderTypes](functions/getAvailableProviderTypes.md)
- [validateProviderConfig](functions/validateProviderConfig.md)

## Enumerations

- [AICapability](enumerations/AICapability.md)

## References

### LocalFineTuningManager

Re-exports [LocalFineTuningManager](local-fine-tuning/classes/LocalFineTuningManager.md)

***

### CustomLocalProvider

Re-exports [CustomLocalProvider](local-fine-tuning/classes/CustomLocalProvider.md)

***

### ModelDeploymentManager

Re-exports [ModelDeploymentManager](model-deployment-manager/classes/ModelDeploymentManager.md)

***

### ResponseFusionEngine

Re-exports [ResponseFusionEngine](response-fusion/classes/ResponseFusionEngine.md)
