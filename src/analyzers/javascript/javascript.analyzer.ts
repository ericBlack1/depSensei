import { Analyzer, AnalyzerConfig } from '../base.analyzer';
import { AnalysisResult, DependencyIssue, Dependency } from '../../core/types';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import ncu from 'npm-check-updates';
import { readPackage } from 'read-pkg';
import { execSync } from 'child_process';
import semver from 'semver';

export class JavaScriptAnalyzer implements Analyzer {
  name = 'javascript-package-analyzer';
  ecosystem = 'javascript';

  private packageJsonPath: string = '';
  private lockfilePath: string = '';
  private hasLockfile: boolean = false;
  private packageInfoCache: Map<string, any> = new Map();

  async detect(config: AnalyzerConfig): Promise<boolean> {
    try {
      this.packageJsonPath = join(config.projectRoot, 'package.json');
      this.lockfilePath = join(config.projectRoot, 'package-lock.json');
      this.hasLockfile = existsSync(this.lockfilePath);

      // Check if package.json exists and is valid
      const packageJson = await readPackage({ cwd: config.projectRoot });
      return !!packageJson;
    } catch {
      return false;
    }
  }

  async analyze(config: AnalyzerConfig): Promise<AnalysisResult> {
    if (!await this.detect(config)) {
      throw new Error('No valid package.json found in the project root');
    }

    const issues: DependencyIssue[] = [];
    const packageJson = await readPackage({ cwd: config.projectRoot });

    // Check for outdated dependencies
    const outdatedDeps = await this.checkOutdatedDependencies(config.projectRoot);
    issues.push(...(await this.createOutdatedIssues(outdatedDeps)));

    // Check for deprecated packages
    const deprecatedDeps = await this.checkDeprecatedPackages(packageJson);
    issues.push(...this.createDeprecatedIssues(deprecatedDeps));

    // Check for version conflicts
    const conflicts = await this.checkVersionConflicts(packageJson);
    issues.push(...this.createVersionConflictIssues(conflicts));

    return {
      ecosystem: this.ecosystem,
      issues,
      summary: this.generateSummary(issues),
    };
  }

  private generateSummary(issues: DependencyIssue[]): AnalysisResult['summary'] {
    const summary = {
      totalIssues: issues.length,
      bySeverity: {
        low: 0,
        medium: 0,
        high: 0,
      },
    };

    for (const issue of issues) {
      summary.bySeverity[issue.severity]++;
    }

    return summary;
  }

  private async checkOutdatedDependencies(projectRoot: string): Promise<Dependency[]> {
    try {
      const packageJson = await readPackage({ cwd: projectRoot });
      const dependencies: Dependency[] = [];

      // Check all dependency types
      const depTypes = ['dependencies', 'devDependencies', 'peerDependencies'] as const;
      
      // Process dependencies sequentially to avoid overwhelming the npm registry
      for (const depType of depTypes) {
        if (!packageJson[depType]) continue;

        for (const [name, version] of Object.entries(packageJson[depType])) {
          try {
            const packageInfo = await this.getPackageInfo(name);
            const latestVersion = packageInfo['dist-tags'].latest;
            const currentVersion = version as string;
            const cleanCurrent = semver.minVersion(currentVersion);
            const cleanLatest = semver.minVersion(latestVersion);
            
            // Only mark as outdated if the latest version is greater than current
            if (cleanLatest && cleanCurrent && semver.gt(cleanLatest.version, cleanCurrent.version)) {
              dependencies.push({
                name,
                version: currentVersion,
                type: depType,
              });
            } else if (!cleanLatest || !cleanCurrent) {
              console.error(`Could not parse version for ${name}: current='${currentVersion}', latest='${latestVersion}'`);
            }
          } catch (error) {
            console.error(`Error checking ${name}:`, error);
          }
        }
      }

      return dependencies;
    } catch (error) {
      console.error('Error checking outdated dependencies:', error);
      return [];
    }
  }

  private async getPackageInfo(packageName: string): Promise<any> {
    // Check cache first
    if (this.packageInfoCache.has(packageName)) {
      return this.packageInfoCache.get(packageName);
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      const response = await fetch(`https://registry.npmjs.org/${packageName}`, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
        },
      });

      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`Failed to fetch package info for ${packageName}`);
      }

      const data = await response.json();
      this.packageInfoCache.set(packageName, data);
      return data;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Timeout fetching package info for ${packageName}`);
      }
      throw error;
    }
  }

  private async checkDeprecatedPackages(packageJson: any): Promise<Dependency[]> {
    const dependencies: Dependency[] = [];
    const depTypes = ['dependencies', 'devDependencies', 'peerDependencies'] as const;

    for (const depType of depTypes) {
      if (!packageJson[depType]) continue;

      for (const [name, version] of Object.entries(packageJson[depType])) {
        try {
          const output = execSync(`npm view ${name} deprecated`, { encoding: 'utf-8' });
          if (output.trim()) {
            dependencies.push({
              name,
              version: version as string,
              type: depType,
            });
          }
        } catch (error) {
          // If the command fails, the package is not deprecated
          continue;
        }
      }
    }

    return dependencies;
  }

  private async checkVersionConflicts(packageJson: any): Promise<Dependency[]> {
    const conflicts: Dependency[] = [];
    const depTypes = ['dependencies', 'devDependencies', 'peerDependencies'] as const;
    const allDeps = new Map<string, string>();

    // First collect all dependencies and their versions
    for (const depType of depTypes) {
      if (!packageJson[depType]) continue;

      for (const [name, version] of Object.entries(packageJson[depType])) {
        if (allDeps.has(name)) {
          const existingVersion = allDeps.get(name)!;
          if (existingVersion !== version) {
            conflicts.push({
              name,
              version: version as string,
              type: depType,
            });
          }
        } else {
          allDeps.set(name, version as string);
        }
      }
    }

    return conflicts;
  }

  private async createOutdatedIssues(dependencies: Dependency[]): Promise<DependencyIssue[]> {
    const issues: DependencyIssue[] = [];
    
    for (const dep of dependencies) {
      try {
        const packageInfo = await this.getPackageInfo(dep.name);
        const latestVersion = packageInfo['dist-tags'].latest;
        const currentVersion = dep.version as string;
        const cleanCurrent = semver.minVersion(currentVersion);
        const cleanLatest = semver.minVersion(latestVersion);
        
        if (cleanLatest && cleanCurrent && semver.gt(cleanLatest.version, cleanCurrent.version)) {
          issues.push({
            type: 'outdated',
            message: `Package ${dep.name} is outdated (current: ${dep.version}, latest: ${latestVersion})`,
            severity: 'medium',
            affectedDependencies: [dep],
            suggestedFixes: [{
              description: `Update ${dep.name} to latest version (${latestVersion})`,
              changes: [{
                name: dep.name,
                from: dep.version,
                to: latestVersion,
              }],
              confidence: 'high',
            }],
          });
        } else if (!cleanLatest || !cleanCurrent) {
          console.error(`Could not parse version for ${dep.name}: current='${dep.version}', latest='${latestVersion}'`);
        }
      } catch (error) {
        console.error(`Error getting package info for ${dep.name}:`, error);
        // Still create the issue without suggested fixes if we can't get package info
        issues.push({
          type: 'outdated',
          message: `Package ${dep.name} is outdated (current: ${dep.version})`,
          severity: 'medium',
          affectedDependencies: [dep],
        });
      }
    }
     
    return issues;
  }

  private createDeprecatedIssues(dependencies: Dependency[]): DependencyIssue[] {
    return dependencies.map(dep => ({
      type: 'deprecated',
      message: `Package ${dep.name} is deprecated`,
      severity: 'high',
      affectedDependencies: [dep],
    }));
  }

  private createVersionConflictIssues(conflicts: Dependency[]): DependencyIssue[] {
    if (conflicts.length === 0) return [];

    return [{
      type: 'version-conflict',
      message: 'Version conflicts detected in dependencies',
      severity: 'high',
      affectedDependencies: conflicts,
    }];
  }

  getSupportedFilePatterns(): string[] {
    return ['package.json', 'package-lock.json'];
  }
} 