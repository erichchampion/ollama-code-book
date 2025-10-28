const PII_PATTERNS = {
  email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  phone: /(\+\d{1,3}[- ]?)?\d{10}/g,
  ssn: /\d{3}-\d{2}-\d{4}/g,
  creditCard: /\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}/g,
  ipAddress: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g,
  apiKey: /sk-[a-zA-Z0-9]{48}/g
};

class PrivacyFilter {
  filterPII(text: string): string {
    let filtered = text;

    for (const [type, pattern] of Object.entries(PII_PATTERNS)) {
      filtered = filtered.replace(pattern, `[${type.toUpperCase()}_REDACTED]`);
    }

    return filtered;
  }
}