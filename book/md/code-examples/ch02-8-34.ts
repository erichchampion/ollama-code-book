// Good: Set reasonable budgets
providerManager.setBudget({
  providerId: 'openai-main',
  dailyLimit: 10.00,
  monthlyLimit: 200.00,
  alertThresholds: [0.50, 0.75, 0.90]
});

providerManager.on('budget_warning', ({ id, percentage }) => {
  logger.warn(`Provider ${id} at ${percentage}% of budget`);
  // Consider switching to cheaper provider
});