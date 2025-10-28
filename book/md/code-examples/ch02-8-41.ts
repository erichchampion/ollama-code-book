// Bad: Sequential requests (slow)
const result1 = await provider1.complete(prompt);
const result2 = await provider2.complete(prompt);
const result3 = await provider3.complete(prompt);