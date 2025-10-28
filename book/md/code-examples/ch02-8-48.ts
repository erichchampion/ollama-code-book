// Good: Fusion only for high-stakes decisions
const isCritical = task.type === 'refactoring' || task.type === 'security';

if (isCritical) {
  // Use fusion for accuracy
  const result = await fusion.fuse(prompt, {
    minAgreement: 0.70,
    complexity: 'complex'
  });

  if (result.confidence < 0.70) {
    logger.warn('Low confidence, requesting human review');
    await requestHumanReview(result);
  }
} else {
  // Single provider is fine
  const result = await router.executeWithFallback(context, executeFn);
}