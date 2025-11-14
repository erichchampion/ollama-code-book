/**
 * Project Utilities - Package.json reader (Task 14: 8 duplicates)
 */
import * as fs from 'fs/promises';
import * as path from 'path';

let packageJsonCache: { path: string; data: any } | null = null;

export async function readPackageJson(dir: string = process.cwd()): Promise<any> {
  const pkgPath = path.join(dir, 'package.json');
  if (packageJsonCache && packageJsonCache.path === pkgPath) {
    return packageJsonCache.data;
  }
  const content = await fs.readFile(pkgPath, 'utf-8');
  const data = JSON.parse(content);
  packageJsonCache = { path: pkgPath, data };
  return data;
}

export function clearPackageJsonCache(): void {
  packageJsonCache = null;
}
