// Set budget limits
providerManager.setBudget({
  providerId: 'openai-main',
  dailyLimit: 10.00,    // $10/day
  monthlyLimit: 200.00, // $200/month
  alertThresholds: [
    { percentage: 80, cost: 8.00 },   // Alert at 80% of daily
    { percentage: 90, cost: 9.00 }    // Alert at 90% of daily
  ]
});

// Check before making request
if (!providerManager.checkBudget('openai-main', estimatedCost)) {
  throw new Error('Budget exceeded');
}

// Listen for budget events
providerManager.on('budget_alert', ({ id, percentage }) => {
  console.warn(`${id} reached ${percentage}% of daily budget`);
});

providerManager.on('budget_exceeded', ({ id, type, limit }) => {
  console.error(`${id} exceeded ${type} budget of $${limit}`);
});