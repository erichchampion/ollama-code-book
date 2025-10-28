/**
 * Input validation utilities
 */

export function validateInput(value) {
  if (typeof value !== 'number') {
    return false;
  }
  if (isNaN(value)) {
    return false;
  }
  return value >= 0;
}

export function validateString(str) {
  return typeof str === 'string' && str.length > 0;
}
