// Traditional: Deterministic
function add(a: number, b: number): number {
  return a + b;
}

test('add function', () => {
  expect(add(2, 2)).toBe(4); // ✓ Always passes
  expect(add(0, 0)).toBe(0); // ✓ Always passes
  expect(add(-1, 1)).toBe(0); // ✓ Always passes
});

// AI: Non-deterministic
async function generateCode(prompt: string): Promise<string> {
  return ai.complete(prompt);
}

test('generate code', async () => {
  const code = await generateCode('Write a function to add numbers');

  // ❌ This fails - output varies every time
  expect(code).toBe('function add(a, b) { return a + b; }');

  // ❓ How do you test this?
});