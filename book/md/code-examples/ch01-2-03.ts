// Before: Nested callbacks
fs.readFile('data.json', (err, data) => {
  if (err) throw err;
  const parsed = JSON.parse(data);
  processData(parsed, (err, result) => {
    if (err) throw err;
    fs.writeFile('output.json', result, (err) => {
      if (err) throw err;
      console.log('Done!');
    });
  });
});

// After: Async/await (AI-assisted refactor)
async function processFile(): Promise<void> {
  try {
    const data = await fs.promises.readFile('data.json', 'utf-8');
    const parsed = JSON.parse(data);
    const result = await processData(parsed);
    await fs.promises.writeFile('output.json', result);
    console.log('Done!');
  } catch (error) {
    console.error('Error processing file:', error);
    throw error;
  }
}