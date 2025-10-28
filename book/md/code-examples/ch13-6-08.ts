/**
 * Manages plugin versions and compatibility
 */
export class PluginVersionManager {
  /**
   * Check if plugin version is compatible
   */
  isCompatible(
    pluginVersion: string,
    platformVersion: string,
    requiredVersion?: string
  ): boolean {
    if (!requiredVersion) return true;

    return this.satisfiesVersion(platformVersion, requiredVersion);
  }

  /**
   * Get migration path between versions
   */
  getMigrationPath(
    fromVersion: string,
    toVersion: string
  ): string[] {
    const migrations: string[] = [];

    // Would return list of migration versions
    // e.g., ['1.0.0', '1.1.0', '2.0.0']

    return migrations;
  }

  /**
   * Check for breaking changes
   */
  hasBreakingChanges(fromVersion: string, toVersion: string): boolean {
    const fromMajor = this.getMajorVersion(fromVersion);
    const toMajor = this.getMajorVersion(toVersion);

    return toMajor > fromMajor;
  }

  /**
   * Parse semver version
   */
  parseVersion(version: string): {
    major: number;
    minor: number;
    patch: number;
  } {
    const match = version.match(/^(\d+)\.(\d+)\.(\d+)/);

    if (!match) {
      throw new Error(`Invalid version: ${version}`);
    }

    return {
      major: parseInt(match[1]),
      minor: parseInt(match[2]),
      patch: parseInt(match[3])
    };
  }

  /**
   * Compare versions
   */
  compareVersions(v1: string, v2: string): number {
    const parsed1 = this.parseVersion(v1);
    const parsed2 = this.parseVersion(v2);

    if (parsed1.major !== parsed2.major) {
      return parsed1.major - parsed2.major;
    }

    if (parsed1.minor !== parsed2.minor) {
      return parsed1.minor - parsed2.minor;
    }

    return parsed1.patch - parsed2.patch;
  }

  private getMajorVersion(version: string): number {
    return this.parseVersion(version).major;
  }

  private satisfiesVersion(version: string, range: string): boolean {
    // Simple range check (would use semver package in production)
    if (range.startsWith('^')) {
      const requiredMajor = this.getMajorVersion(range.substring(1));
      const actualMajor = this.getMajorVersion(version);
      return actualMajor === requiredMajor;
    }

    if (range.startsWith('~')) {
      const required = this.parseVersion(range.substring(1));
      const actual = this.parseVersion(version);
      return actual.major === required.major && actual.minor === required.minor;
    }

    return this.compareVersions(version, range) >= 0;
  }
}