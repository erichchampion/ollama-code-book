// User: "Create a function that validates email addresses"
// AI generates:
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!email || typeof email !== 'string') {
    return false;
  }

  if (email.length > 254) {
    return false;
  }

  return emailRegex.test(email);
}