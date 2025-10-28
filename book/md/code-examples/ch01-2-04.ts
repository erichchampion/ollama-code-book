// User: "This function sometimes crashes, help me debug it"
function divide(a: number, b: number): number {
  return a / b;  // ⚠️ No check for division by zero!
}

// AI suggests:
function divide(a: number, b: number): number {
  if (b === 0) {
    throw new Error('Division by zero is not allowed');
  }
  return a / b;
}

// Or with safer handling:
function divide(a: number, b: number): number | null {
  if (b === 0) {
    console.warn('Attempted division by zero');
    return null;
  }
  return a / b;
}