// Small test project - Basic JavaScript application
import { add, multiply } from './math.js';
import { validateInput } from './validation.js';

function main() {
  const a = 5;
  const b = 10;

  if (validateInput(a) && validateInput(b)) {
    console.log(`Add: ${add(a, b)}`);
    console.log(`Multiply: ${multiply(a, b)}`);
  }
}

main();
