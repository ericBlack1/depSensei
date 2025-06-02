"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JavaScriptAnalyzer = void 0;
const fs_1 = require("fs");
const path_1 = require("path");
const read_pkg_1 = require("read-pkg");
const child_process_1 = require("child_process");
const semver_1 = __importDefault(require("semver"));
class JavaScriptAnalyzer {
    constructor() {
        this.name = 'javascript-package-analyzer';
        this.ecosystem = 'javascript';
        this.packageJsonPath = '';
        this.lockfilePath = '';
        this.hasLockfile = false;
        this.packageInfoCache = new Map();
    }
    async detect(config) {
        try {
            this.packageJsonPath = (0, path_1.join)(config.projectRoot, 'package.json');
            this.lockfilePath = (0, path_1.join)(config.projectRoot, 'package-lock.json');
            this.hasLockfile = (0, fs_1.existsSync)(this.lockfilePath);
            // Check if package.json exists and is valid
            const packageJson = await (0, read_pkg_1.readPackage)({ cwd: config.projectRoot });
            return !!packageJson;
        }
        catch {
            return false;
        }
    }
    async analyze(config) {
        if (!await this.detect(config)) {
            throw new Error('No valid package.json found in the project root');
        }
        const issues = [];
        const packageJson = await (0, read_pkg_1.readPackage)({ cwd: config.projectRoot });
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
    generateSummary(issues) {
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
    async checkOutdatedDependencies(projectRoot) {
        try {
            const packageJson = await (0, read_pkg_1.readPackage)({ cwd: projectRoot });
            const dependencies = [];
            // Check all dependency types
            const depTypes = ['dependencies', 'devDependencies', 'peerDependencies'];
            // Process dependencies sequentially to avoid overwhelming the npm registry
            for (const depType of depTypes) {
                if (!packageJson[depType])
                    continue;
                for (const [name, version] of Object.entries(packageJson[depType])) {
                    try {
                        const packageInfo = await this.getPackageInfo(name);
                        const latestVersion = packageInfo['dist-tags'].latest;
                        const currentVersion = version;
                        const cleanCurrent = semver_1.default.minVersion(currentVersion);
                        const cleanLatest = semver_1.default.minVersion(latestVersion);
                        // Only mark as outdated if the latest version is greater than current
                        if (cleanLatest && cleanCurrent && semver_1.default.gt(cleanLatest.version, cleanCurrent.version)) {
                            dependencies.push({
                                name,
                                version: currentVersion,
                                type: depType,
                            });
                        }
                        else if (!cleanLatest || !cleanCurrent) {
                            console.error(`Could not parse version for ${name}: current='${currentVersion}', latest='${latestVersion}'`);
                        }
                    }
                    catch (error) {
                        console.error(`Error checking ${name}:`, error);
                    }
                }
            }
            return dependencies;
        }
        catch (error) {
            console.error('Error checking outdated dependencies:', error);
            return [];
        }
    }
    async getPackageInfo(packageName) {
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
        }
        catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                throw new Error(`Timeout fetching package info for ${packageName}`);
            }
            throw error;
        }
    }
    async checkDeprecatedPackages(packageJson) {
        const dependencies = [];
        const depTypes = ['dependencies', 'devDependencies', 'peerDependencies'];
        for (const depType of depTypes) {
            if (!packageJson[depType])
                continue;
            for (const [name, version] of Object.entries(packageJson[depType])) {
                try {
                    const output = (0, child_process_1.execSync)(`npm view ${name} deprecated`, { encoding: 'utf-8' });
                    if (output.trim()) {
                        dependencies.push({
                            name,
                            version: version,
                            type: depType,
                        });
                    }
                }
                catch (error) {
                    // If the command fails, the package is not deprecated
                    continue;
                }
            }
        }
        return dependencies;
    }
    async checkVersionConflicts(packageJson) {
        const conflicts = [];
        const depTypes = ['dependencies', 'devDependencies', 'peerDependencies'];
        const allDeps = new Map();
        // First collect all dependencies and their versions
        for (const depType of depTypes) {
            if (!packageJson[depType])
                continue;
            for (const [name, version] of Object.entries(packageJson[depType])) {
                if (allDeps.has(name)) {
                    const existingVersion = allDeps.get(name);
                    if (existingVersion !== version) {
                        conflicts.push({
                            name,
                            version: version,
                            type: depType,
                        });
                    }
                }
                else {
                    allDeps.set(name, version);
                }
            }
        }
        return conflicts;
    }
    async createOutdatedIssues(dependencies) {
        const issues = [];
        for (const dep of dependencies) {
            try {
                const packageInfo = await this.getPackageInfo(dep.name);
                const latestVersion = packageInfo['dist-tags'].latest;
                const currentVersion = dep.version;
                const cleanCurrent = semver_1.default.minVersion(currentVersion);
                const cleanLatest = semver_1.default.minVersion(latestVersion);
                if (cleanLatest && cleanCurrent && semver_1.default.gt(cleanLatest.version, cleanCurrent.version)) {
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
                }
                else if (!cleanLatest || !cleanCurrent) {
                    console.error(`Could not parse version for ${dep.name}: current='${dep.version}', latest='${latestVersion}'`);
                }
            }
            catch (error) {
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
    createDeprecatedIssues(dependencies) {
        return dependencies.map(dep => ({
            type: 'deprecated',
            message: `Package ${dep.name} is deprecated`,
            severity: 'high',
            affectedDependencies: [dep],
        }));
    }
    createVersionConflictIssues(conflicts) {
        if (conflicts.length === 0)
            return [];
        return [{
                type: 'version-conflict',
                message: 'Version conflicts detected in dependencies',
                severity: 'high',
                affectedDependencies: conflicts,
            }];
    }
    getSupportedFilePatterns() {
        return ['package.json', 'package-lock.json'];
    }
}
exports.JavaScriptAnalyzer = JavaScriptAnalyzer;
