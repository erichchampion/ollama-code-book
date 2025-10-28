// Bad: Shared mutable state across requests
container.register('requestContext', RequestContext, { singleton: true });
// Multiple requests will overwrite each other's data!