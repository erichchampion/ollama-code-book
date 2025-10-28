function validatePath(userPath: string, allowedPaths: string[]): boolean {
  // Resolve to absolute path
  const absolutePath = path.resolve(userPath);

  // Check for directory traversal
  if (absolutePath.includes('..')) {
    return false;
  }

  // Check if within allowed paths
  return allowedPaths.some(allowed => {
    const allowedAbsolute = path.resolve(allowed);
    return absolutePath.startsWith(allowedAbsolute);
  });
}