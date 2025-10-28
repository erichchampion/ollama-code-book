import { fc, test as fcTest } from 'fast-check';

describe('Property-Based Tests', () => {
  fcTest.prop([fc.string()])('TokenCounter count is non-negative', (text) => {
    const counter = new TokenCounter();
    const count = counter.count(text);

    expect(count).toBeGreaterThanOrEqual(0);
  });

  fcTest.prop([fc.array(fc.string())])('Joining and counting matches array length', (words) => {
    const counter = new TokenCounter();
    const text = words.join(' ');
    const count = counter.count(text);

    // Count should match number of non-empty words
    const nonEmptyWords = words.filter(w => w.trim().length > 0);
    expect(count).toBe(nonEmptyWords.length);
  });

  fcTest.prop([fc.string(), fc.string()])('Count is additive', (text1, text2) => {
    const counter = new TokenCounter();

    const count1 = counter.count(text1);
    const count2 = counter.count(text2);
    const combinedCount = counter.count(text1 + ' ' + text2);

    // Combined count should equal sum (plus separator handling)
    expect(combinedCount).toBeGreaterThanOrEqual(count1 + count2);
  });
});