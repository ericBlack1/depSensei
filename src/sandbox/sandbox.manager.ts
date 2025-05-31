import { join, dirname } from 'path';
import { mkdirSync, rmSync, copyFileSync, readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';
import { tmpdir } from 'os';
import { v4 as uuidv4 } from 'uuid';
import { DependencyFix } from '../core/types';

export interface SandboxConfig {
  projectRoot: string;
  tempDir?: string;
  npmRegistry?: string;
  timeout?: number;
}

export interface SandboxResult {
  success: boolean;
  error?: string;
  output?: string;
  duration: number;
}

export class SandboxManager {
  private tempDir: string;
  private projectRoot: string;
  private npmRegistry: string;
  private timeout: number;
  private packageJsonPath: string;
  private lockfilePath: string;
  private hasLockfile: boolean;

  constructor(config: SandboxConfig) {
    this.projectRoot = config.projectRoot;
    this.tempDir = config.tempDir || join(tmpdir(), `depsensei-${uuidv4()}`);
    this.npmRegistry = config.npmRegistry || 'https://registry.npmjs.org/';
    this.timeout = config.timeout || 300000; // 5 minutes default timeout
    this.packageJsonPath = join(this.projectRoot, 'package.json');
    this.lockfilePath = join(this.projectRoot, 'package-lock.json');
    this.hasLockfile = false;
  }

  /**
   * Creates a new sandbox environment
   */
  async create(): Promise<void> {
    try {
      // Create temp directory
      mkdirSync(this.tempDir, { recursive: true });

      // Copy package.json
      if (!this.copyPackageJson()) {
        throw new Error('Failed to copy package.json');
      }

      // Copy package-lock.json if it exists
      this.hasLockfile = this.copyLockfile();

      // Initialize npm in the sandbox
      this.initializeNpm();

      // Install dependencies
      await this.installDependencies();
    } catch (error) {
      await this.cleanup();
      throw error;
    }
  }

  /**
   * Tests a dependency fix in the sandbox
   */
  async testFix(fix: DependencyFix): Promise<SandboxResult> {
    const startTime = Date.now();
    let success = false;
    let error: string | undefined;
    let output: string | undefined;

    try {
      // Apply the fix to package.json
      await this.applyFixToPackageJson(fix);

      // Install dependencies with the fix
      const installResult = await this.installDependencies();
      success = installResult.success;
      output = installResult.output;
      error = installResult.error;

      // If installation succeeded, run tests if they exist
      if (success) {
        const testResult = await this.runTests();
        success = testResult.success;
        output = testResult.output;
        error = testResult.error;
      }
    } catch (err) {
      success = false;
      error = err instanceof Error ? err.message : 'Unknown error occurred';
    }

    return {
      success,
      error,
      output,
      duration: Date.now() - startTime,
    };
  }

  /**
   * Tests multiple versions of a package to find compatible ones
   */
  async testPackageVersions(
    packageName: string,
    versions: string[],
    testCommand?: string
  ): Promise<Map<string, SandboxResult>> {
    const results = new Map<string, SandboxResult>();
    const originalPackageJson = this.readPackageJson();

    for (const version of versions) {
      try {
        // Update package.json with the test version
        const testPackageJson = { ...originalPackageJson };
        for (const depType of ['dependencies', 'devDependencies', 'peerDependencies']) {
          if (testPackageJson[depType]?.[packageName]) {
            testPackageJson[depType][packageName] = version;
          }
        }
        this.writePackageJson(testPackageJson);

        // Test the version
        const result = await this.testVersion(packageName, version, testCommand);
        results.set(version, result);
      } catch (error) {
        results.set(version, {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          duration: 0,
        });
      }
    }

    // Restore original package.json
    this.writePackageJson(originalPackageJson);
    return results;
  }

  /**
   * Cleans up the sandbox environment
   */
  async cleanup(): Promise<void> {
    try {
      rmSync(this.tempDir, { recursive: true, force: true });
    } catch (error) {
      console.error('Error cleaning up sandbox:', error);
    }
  }

  private copyPackageJson(): boolean {
    try {
      copyFileSync(this.packageJsonPath, join(this.tempDir, 'package.json'));
      return true;
    } catch (error) {
      console.error('Error copying package.json:', error);
      return false;
    }
  }

  private copyLockfile(): boolean {
    try {
      if (this.hasLockfile) {
        copyFileSync(this.lockfilePath, join(this.tempDir, 'package-lock.json'));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error copying package-lock.json:', error);
      return false;
    }
  }

  private initializeNpm(): void {
    try {
      // Create .npmrc with registry configuration
      const npmrcContent = `registry=${this.npmRegistry}\n`;
      writeFileSync(join(this.tempDir, '.npmrc'), npmrcContent);

      // Initialize npm
      execSync('npm init -y', {
        cwd: this.tempDir,
        stdio: 'ignore',
      });
    } catch (error) {
      throw new Error(`Failed to initialize npm: ${error}`);
    }
  }

  private async installDependencies(): Promise<SandboxResult> {
    try {
      const startTime = Date.now();
      const command = this.hasLockfile ? 'npm ci' : 'npm install';
      const output = execSync(command, {
        cwd: this.tempDir,
        timeout: this.timeout,
      }).toString();

      return {
        success: true,
        output,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        output: error instanceof Error ? error.message : undefined,
        duration: 0,
      };
    }
  }

  private async runTests(): Promise<SandboxResult> {
    try {
      const startTime = Date.now();
      const output = execSync('npm test', {
        cwd: this.tempDir,
        timeout: this.timeout,
      }).toString();

      return {
        success: true,
        output,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        output: error instanceof Error ? error.message : undefined,
        duration: 0,
      };
    }
  }

  private async applyFixToPackageJson(fix: DependencyFix): Promise<void> {
    const packageJson = this.readPackageJson();

    for (const change of fix.changes) {
      for (const depType of ['dependencies', 'devDependencies', 'peerDependencies']) {
        if (packageJson[depType]?.[change.name]) {
          packageJson[depType][change.name] = change.to;
        }
      }
    }

    this.writePackageJson(packageJson);
  }

  private async testVersion(
    packageName: string,
    version: string,
    testCommand?: string
  ): Promise<SandboxResult> {
    const startTime = Date.now();

    try {
      // Install the specific version
      execSync(`npm install ${packageName}@${version}`, {
        cwd: this.tempDir,
        timeout: this.timeout,
      });

      // Run tests if provided
      if (testCommand) {
        const output = execSync(testCommand, {
          cwd: this.tempDir,
          timeout: this.timeout,
        }).toString();

        return {
          success: true,
          output,
          duration: Date.now() - startTime,
        };
      }

      return {
        success: true,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        output: error instanceof Error ? error.message : undefined,
        duration: Date.now() - startTime,
      };
    }
  }

  private readPackageJson(): any {
    return JSON.parse(readFileSync(join(this.tempDir, 'package.json'), 'utf-8'));
  }

  private writePackageJson(packageJson: any): void {
    writeFileSync(
      join(this.tempDir, 'package.json'),
      JSON.stringify(packageJson, null, 2)
    );
  }
} 