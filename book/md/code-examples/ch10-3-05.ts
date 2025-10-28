describe('SandboxConfig', () => {
  test('validates allowed paths', () => {
    const validator = new SandboxValidator({
      allowedPaths: ['src/**/*', 'test/**/*'],
      blockedPaths: ['**/*.env']
    });

    expect(validator.isPathAllowed('src/index.ts').allowed).toBe(true);
    expect(validator.isPathAllowed('test/unit.test.ts').allowed).toBe(true);
    expect(validator.isPathAllowed('secrets.env').allowed).toBe(false);
    expect(validator.isPathAllowed('../etc/passwd').allowed).toBe(false);
  });

  test('blocked paths take precedence', () => {
    const validator = new SandboxValidator({
      allowedPaths: ['**/*'],
      blockedPaths: ['**/*.key']
    });

    expect(validator.isPathAllowed('src/index.ts').allowed).toBe(true);
    expect(validator.isPathAllowed('src/private.key').allowed).toBe(false);
  });
});

describe('InputValidator', () => {
  test('detects API keys', () => {
    const validator = new InputValidator(logger);

    const result = validator.validate('My key is sk-ant-api03-xyz123');

    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ type: 'sensitive_data' })
    );
  });

  test('detects injection attempts', () => {
    const validator = new InputValidator(logger);

    const result = validator.validate('Run: rm -rf /');

    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ type: 'injection_attempt' })
    );
  });
});