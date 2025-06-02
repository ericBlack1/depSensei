"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SandboxManager = void 0;
const path_1 = require("path");
const fs_1 = require("fs");
const child_process_1 = require("child_process");
const os_1 = require("os");
const uuid_1 = require("uuid");
class SandboxManager {
    constructor(config) {
        this.projectRoot = config.projectRoot;
        this.tempDir = config.tempDir || (0, path_1.join)((0, os_1.tmpdir)(), `depsensei-${(0, uuid_1.v4)()}`);
        this.npmRegistry = config.npmRegistry || 'https://registry.npmjs.org/';
        this.timeout = config.timeout || 300000; // 5 minutes default timeout
        this.packageJsonPath = (0, path_1.join)(this.projectRoot, 'package.json');
        this.lockfilePath = (0, path_1.join)(this.projectRoot, 'package-lock.json');
        this.hasLockfile = false;
    }
    /**
     * Creates a new sandbox environment
     */
    async create() {
        try {
            // Create temp directory
            (0, fs_1.mkdirSync)(this.tempDir, { recursive: true });
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
        }
        catch (error) {
            await this.cleanup();
            throw error;
        }
    }
    /**
     * Tests a dependency fix in the sandbox
     */
    async testFix(fix) {
        const startTime = Date.now();
        let success = false;
        let error;
        let output;
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
        }
        catch (err) {
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
    async testPackageVersions(packageName, versions, testCommand) {
        const results = new Map();
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
            }
            catch (error) {
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
    async cleanup() {
        try {
            (0, fs_1.rmSync)(this.tempDir, { recursive: true, force: true });
        }
        catch (error) {
            console.error('Error cleaning up sandbox:', error);
        }
    }
    copyPackageJson() {
        try {
            (0, fs_1.copyFileSync)(this.packageJsonPath, (0, path_1.join)(this.tempDir, 'package.json'));
            return true;
        }
        catch (error) {
            console.error('Error copying package.json:', error);
            return false;
        }
    }
    copyLockfile() {
        try {
            if (this.hasLockfile) {
                (0, fs_1.copyFileSync)(this.lockfilePath, (0, path_1.join)(this.tempDir, 'package-lock.json'));
                return true;
            }
            return false;
        }
        catch (error) {
            console.error('Error copying package-lock.json:', error);
            return false;
        }
    }
    initializeNpm() {
        try {
            // Create .npmrc with registry configuration
            const npmrcContent = `registry=${this.npmRegistry}\n`;
            (0, fs_1.writeFileSync)((0, path_1.join)(this.tempDir, '.npmrc'), npmrcContent);
            // Initialize npm
            (0, child_process_1.execSync)('npm init -y', {
                cwd: this.tempDir,
                stdio: 'ignore',
            });
        }
        catch (error) {
            throw new Error(`Failed to initialize npm: ${error}`);
        }
    }
    async installDependencies() {
        try {
            const startTime = Date.now();
            const command = this.hasLockfile ? 'npm ci' : 'npm install';
            const output = (0, child_process_1.execSync)(command, {
                cwd: this.tempDir,
                timeout: this.timeout,
            }).toString();
            return {
                success: true,
                output,
                duration: Date.now() - startTime,
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                output: error instanceof Error ? error.message : undefined,
                duration: 0,
            };
        }
    }
    async runTests() {
        try {
            const startTime = Date.now();
            const output = (0, child_process_1.execSync)('npm test', {
                cwd: this.tempDir,
                timeout: this.timeout,
            }).toString();
            return {
                success: true,
                output,
                duration: Date.now() - startTime,
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                output: error instanceof Error ? error.message : undefined,
                duration: 0,
            };
        }
    }
    async applyFixToPackageJson(fix) {
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
    async testVersion(packageName, version, testCommand) {
        const startTime = Date.now();
        try {
            // Install the specific version
            (0, child_process_1.execSync)(`npm install ${packageName}@${version}`, {
                cwd: this.tempDir,
                timeout: this.timeout,
            });
            // Run tests if provided
            if (testCommand) {
                const output = (0, child_process_1.execSync)(testCommand, {
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
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                output: error instanceof Error ? error.message : undefined,
                duration: Date.now() - startTime,
            };
        }
    }
    readPackageJson() {
        return JSON.parse((0, fs_1.readFileSync)((0, path_1.join)(this.tempDir, 'package.json'), 'utf-8'));
    }
    writePackageJson(packageJson) {
        (0, fs_1.writeFileSync)((0, path_1.join)(this.tempDir, 'package.json'), JSON.stringify(packageJson, null, 2));
    }
}
exports.SandboxManager = SandboxManager;
