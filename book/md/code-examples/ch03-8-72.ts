// Request-scoped container
async function handleRequest(req: Request) {
  const requestScope = container.createScope();

  // Register request-specific services
  requestScope.registerInstance('request', req);
  requestScope.registerInstance('user', req.user);

  try {
    const handler = await requestScope.resolve('requestHandler');
    return await handler.handle();
  } finally {
    await requestScope.dispose(); // Clean up request scope
  }
}