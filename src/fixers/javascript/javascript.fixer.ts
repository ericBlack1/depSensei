import { Fixer, FixerConfig } from '../base.fixer';
import { DependencyIssue, DependencyFix } from '../../core/types';
import { execSync } from 'child_process';
import semver from 'semver';

interface NpmPackageInfo {
  name: string;
  deprecated?: string;
  latest?: string;
  versions: string[];
  time: {
    [version: string]: string;
    created: string;
    modified: string;
  };
  'dist-tags': {
    latest: string;
    next?: string;
    beta?: string;
    alpha?: string;
  };
}

export class JavaScriptFixer implements Fixer {
  name = 'javascript-package-fixer';
  ecosystem = 'javascript';

  canFix(issue: DependencyIssue): boolean {
    return ['outdated', 'deprecated', 'version-conflict'].includes(issue.type);
  }

  async generateFixes(issue: DependencyIssue, config: FixerConfig): Promise<DependencyFix[]> {
    switch (issue.type) {
      case 'outdated':
        return this.resolveOutdatedPackage(issue);
      case 'version-conflict':
        return this.resolveVersionConflicts(issue);
      case 'deprecated':
        return this.resolveDeprecatedPackage(issue);
      case 'abandoned':
        return this.resolveAbandonedPackage(issue);
      default:
        return [];
    }
  }

  async applyFix(fix: DependencyFix, config: FixerConfig): Promise<void> {
    // Implementation will be handled by the sandbox manager
    return;
  }

  private async resolveOutdatedPackage(issue: DependencyIssue): Promise<DependencyFix[]> {
    const fixes: DependencyFix[] = [];
    const packageName = issue.affectedDependencies[0].name;
    const currentVersion = issue.affectedDependencies[0].version;

    try {
      const packageInfo = await this.getPackageInfo(packageName);
      const latestVersion = packageInfo['dist-tags'].latest;

      if (latestVersion && semver.gt(latestVersion, currentVersion)) {
        fixes.push({
          description: `Update ${packageName} to latest version (${latestVersion})`,
          changes: [{
            name: packageName,
            from: currentVersion,
            to: latestVersion,
          }],
          confidence: 'high',
        });
      }
    } catch (error) {
      console.error(`Error resolving outdated package ${packageName}:`, error);
    }

    return fixes;
  }

  private async resolveVersionConflicts(issue: DependencyIssue): Promise<DependencyFix[]> {
    const fixes: DependencyFix[] = [];
    const packageName = issue.affectedDependencies[0].name;
    const currentVersion = issue.affectedDependencies[0].version;

    try {
      const packageInfo = await this.getPackageInfo(packageName);
      const latestVersion = packageInfo['dist-tags'].latest;

      if (latestVersion && semver.gt(latestVersion, currentVersion)) {
        fixes.push({
          description: `Update ${packageName} to latest version (${latestVersion})`,
          changes: issue.affectedDependencies.map(dep => ({
            name: dep.name,
            from: dep.version,
            to: latestVersion,
          })),
          confidence: 'high',
        });
      }
    } catch (error) {
      console.error(`Error resolving version conflicts for ${packageName}:`, error);
    }

    return fixes;
  }

  private async resolveDeprecatedPackage(issue: DependencyIssue): Promise<DependencyFix[]> {
    const fixes: DependencyFix[] = [];
    const packageName = issue.affectedDependencies[0].name;
    const currentVersion = issue.affectedDependencies[0].version;

    try {
      const packageInfo = await this.getPackageInfo(packageName);
      
      if (packageInfo.deprecated) {
        // Check if the deprecation message contains a replacement
        const replacement = this.extractReplacementFromDeprecation(packageInfo.deprecated);
        
        if (replacement) {
          // Get the latest version of the replacement package
          const replacementInfo = await this.getPackageInfo(replacement);
          const replacementVersion = replacementInfo['dist-tags'].latest;

          fixes.push({
            description: `Replace deprecated ${packageName} with ${replacement}@${replacementVersion}`,
            changes: [{
              name: packageName,
              from: currentVersion,
              to: replacementVersion,
            }],
            confidence: 'high',
          });
        } else {
          // If no replacement is suggested, check for the latest non-deprecated version
          const latestVersion = packageInfo['dist-tags'].latest;
          if (latestVersion && semver.gt(latestVersion, currentVersion)) {
            fixes.push({
              description: `Update ${packageName} to latest version (${latestVersion})`,
              changes: [{
                name: packageName,
                from: currentVersion,
                to: latestVersion,
              }],
              confidence: 'medium',
            });
          }

          // Add a manual fix suggestion
          fixes.push({
            description: `Manual intervention required: ${packageInfo.deprecated}`,
            changes: [],
            confidence: 'low',
          });
        }
      }
    } catch (error) {
      console.error(`Error resolving deprecated package ${packageName}:`, error);
    }

    return fixes;
  }

  private async resolveAbandonedPackage(issue: DependencyIssue): Promise<DependencyFix[]> {
    const fixes: DependencyFix[] = [];
    const packageName = issue.affectedDependencies[0].name;

    try {
      const packageInfo = await this.getPackageInfo(packageName);
      const latestVersion = packageInfo['dist-tags'].latest;

      if (latestVersion) {
        fixes.push({
          description: `Update ${packageName} to latest version (${latestVersion})`,
          changes: [{
            name: packageName,
            from: issue.affectedDependencies[0].version,
            to: latestVersion,
          }],
          confidence: 'medium',
        });
      }

      // Add a suggestion to look for alternatives
      fixes.push({
        description: `Consider finding an actively maintained alternative to ${packageName}`,
        changes: [],
        confidence: 'low',
      });
    } catch (error) {
      console.error(`Error resolving abandoned package ${packageName}:`, error);
    }

    return fixes;
  }

  private async getPackageInfo(packageName: string): Promise<NpmPackageInfo> {
    try {
      const response = await fetch(`https://registry.npmjs.org/${packageName}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch package info for ${packageName}`);
      }
      return (await response.json()) as NpmPackageInfo;
    } catch (error) {
      throw new Error(`Failed to get package info for ${packageName}: ${error}`);
    }
  }

  private extractReplacementFromDeprecation(deprecationMessage: string): string | null {
    // Common patterns for replacement suggestions in deprecation messages
    const patterns = [
      /use\s+([@\w/-]+)(?:\s+instead)?/i,
      /replaced\s+by\s+([@\w/-]+)/i,
      /migrate\s+to\s+([@\w/-]+)/i,
    ];

    for (const pattern of patterns) {
      const match = deprecationMessage.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    return null;
  }
} 