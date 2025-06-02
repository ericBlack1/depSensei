"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JavaScriptEcosystem = void 0;
const fs_1 = require("fs");
const path_1 = require("path");
const npm_check_updates_1 = __importDefault(require("npm-check-updates"));
const semver_1 = __importDefault(require("semver"));
class JavaScriptEcosystem {
    constructor(projectRoot) {
        this.name = 'javascript';
        this.packageJsonPath = (0, path_1.join)(projectRoot, 'package.json');
    }
    async detect() {
        try {
            this.packageJson = JSON.parse((0, fs_1.readFileSync)(this.packageJsonPath, 'utf-8'));
            return true;
        }
        catch {
            return false;
        }
    }
    async analyze() {
        const issues = [];
        const dependencies = this.getAllDependencies();
        try {
            // Check for deprecated packages
            const ncuResult = await (0, npm_check_updates_1.default)({
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
        }
        catch (error) {
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
    async resolve(issue) {
        // Ensure we always return an array, even if suggestedFixes is undefined
        return issue.suggestedFixes || [];
    }
    async applyFix(fix) {
        // Implementation for applying fixes
        // This would involve updating package.json and running npm install
    }
    getAllDependencies() {
        const deps = [];
        for (const type of ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']) {
            const typeDeps = this.packageJson[type] || {};
            for (const [name, version] of Object.entries(typeDeps)) {
                deps.push({
                    name,
                    version: version,
                    type: type,
                });
            }
        }
        return deps;
    }
    getPeerDependencies() {
        return this.getAllDependencies().filter(dep => dep.type === 'peerDependencies');
    }
    findVersionConflicts(dep, allDeps) {
        return allDeps.filter(d => d.name === dep.name &&
            !semver_1.default.satisfies(d.version, dep.version));
    }
    generateVersionConflictFixes(dep, conflicts) {
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
exports.JavaScriptEcosystem = JavaScriptEcosystem;
