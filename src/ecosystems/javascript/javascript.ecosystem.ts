import { Ecosystem, Dependency, DependencyIssue, DependencyFix } from '../../core/types';
import { readFileSync } from 'fs';
import { join } from 'path';
import ncu from 'npm-check-updates';
import semver from 'semver';

export class JavaScriptEcosystem implements Ecosystem {
  name = 'javascript';
  private packageJsonPath: string;
  private packageJson: any;

  constructor(projectRoot: string) {
    this.packageJsonPath = join(projectRoot, 'package.json');
  }

  async detect(): Promise<boolean> {
    try {
      this.packageJson = JSON.parse(readFileSync(this.packageJsonPath, 'utf-8'));
      return true;
    } catch {
      return false;
    }
  }

  async analyze(): Promise<DependencyIssue[]> {
    const issues: DependencyIssue[] = [];
    const dependencies = this.getAllDependencies();

    try {
      // Check for deprecated packages
      const ncuResult = await ncu({
        packageFile: this.packageJsonPath,
        jsonUpgraded: true,
        silent: true,
      });

      if (ncuResult && typeof ncuResult === 'object') {
        for (const [name, version] of Object.entries(ncuResult)) {
          const dep = dependencies.find(d => d.name === name);
          if (dep) {
            issues.push({
              type: 'deprecated',
              severity: 'medium',
              message: `Package ${name} has a newer version available`,
              affectedDependencies: [dep],
              suggestedFixes: [{
                description: `Update ${name} to version ${version}`,
                changes: [{
                  name,
                  from: dep.version,
                  to: String(version),
                }],
                confidence: 'high',
              }],
            });
          }
        }
      }
    } catch (error) {
      console.error('Error checking for updates:', error);
    }

    // Check for version conflicts
    const peerDeps = this.getPeerDependencies();
    for (const dep of peerDeps) {
      const conflicts = this.findVersionConflicts(dep, dependencies);
      if (conflicts.length > 0) {
        issues.push({
          type: 'version-conflict',
          severity: 'high',
          message: `Version conflict detected for ${dep.name}`,
          affectedDependencies: conflicts,
          suggestedFixes: this.generateVersionConflictFixes(dep, conflicts),
        });
      }
    }

    return issues;
  }

  async resolve(issue: DependencyIssue): Promise<DependencyFix[]> {
    // Ensure we always return an array, even if suggestedFixes is undefined
    return issue.suggestedFixes || [];
  }

  async applyFix(fix: DependencyFix): Promise<void> {
    // Implementation for applying fixes
    // This would involve updating package.json and running npm install
  }

  private getAllDependencies(): Dependency[] {
    const deps: Dependency[] = [];
    
    for (const type of ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']) {
      const typeDeps = this.packageJson[type] || {};
      for (const [name, version] of Object.entries(typeDeps)) {
        deps.push({
          name,
          version: version as string,
          type: type as Dependency['type'],
        });
      }
    }

    return deps;
  }

  private getPeerDependencies(): Dependency[] {
    return this.getAllDependencies().filter(dep => dep.type === 'peerDependencies');
  }

  private findVersionConflicts(dep: Dependency, allDeps: Dependency[]): Dependency[] {
    return allDeps.filter(d => 
      d.name === dep.name && 
      !semver.satisfies(d.version, dep.version)
    );
  }

  private generateVersionConflictFixes(dep: Dependency, conflicts: Dependency[]): DependencyFix[] {
    // Generate possible fixes for version conflicts
    // This is a simplified version - in reality, you'd want to analyze the dependency tree
    // and suggest the most compatible versions
    return [{
      description: `Update ${dep.name} to a compatible version`,
      changes: conflicts.map(c => ({
        name: c.name,
        from: c.version,
        to: dep.version,
      })),
      confidence: 'medium',
    }];
  }
} 