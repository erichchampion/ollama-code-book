try {
  const completion = await aiClient.complete(request);
  return completion.content;
} catch (error) {
  // Don't show error to user for every failed completion
  // Log silently and return empty
  console.error('Completion failed:', error);
  return null;
}