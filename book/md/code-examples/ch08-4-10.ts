// Example 1: Simple single intent
const input1 = "commit my changes";
const matches1 = await classifier.classify(input1, context);
/*
[
  {
    intent: { name: 'COMMIT', ... },
    confidence: 0.98,
    extractedParams: {},
    missingParams: []
  }
]
*/

// Example 2: Intent with parameters
const input2 = "review PR 123 with full depth";
const matches2 = await classifier.classify(input2, context);
/*
[
  {
    intent: { name: 'REVIEW', ... },
    confidence: 0.95,
    extractedParams: {
      pr: 123,
      depth: 'full'
    },
    missingParams: []
  }
]
*/

// Example 3: Compound request (multiple intents)
const input3 = "commit my auth changes and run tests";
const matches3 = await classifier.classify(input3, context);
/*
[
  {
    intent: { name: 'COMMIT', ... },
    confidence: 0.96,
    extractedParams: {
      scope: 'auth'
    },
    missingParams: []
  },
  {
    intent: { name: 'TEST', ... },
    confidence: 0.94,
    extractedParams: {},
    missingParams: []
  }
]
*/

// Example 4: Context-dependent
const input4 = "review the changes";
const contextWithPR = {
  ...context,
  conversationHistory: [
    {
      role: MessageRole.USER,
      content: "I just created PR 456"
    }
  ]
};
const matches4 = await classifier.classify(input4, contextWithPR);
/*
[
  {
    intent: { name: 'REVIEW', ... },
    confidence: 0.92,
    extractedParams: {
      pr: 456  // Inferred from conversation!
    },
    missingParams: []
  }
]
*/