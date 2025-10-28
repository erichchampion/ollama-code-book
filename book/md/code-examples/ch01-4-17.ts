// ❌ BAD: Load everything upfront
async function initialize() {
  await loadAllProviders();
  await analyzeEntireCodebase();
  await buildCompleteCodeGraph();
  // Slow startup!
}

// ✅ GOOD: Lazy loading
async function initialize(level: 'minimal' | 'standard' | 'full' = 'standard') {
  switch (level) {
    case 'minimal':
      await loadEssentialServices();
      break;
    case 'standard':
      await loadEssentialServices();
      await loadCommonProviders();
      break;
    case 'full':
      await loadAllServices();
      await buildCodeGraph();
      break;
  }
}

// Load heavy components on demand
async function getCodeGraph(): Promise<CodeKnowledgeGraph> {
  if (!this.codeGraph) {
    this.codeGraph = await buildCodeGraph();
  }
  return this.codeGraph;
}