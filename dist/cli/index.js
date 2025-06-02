#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const chalk_1 = __importDefault(require("chalk"));
const plugin_manager_1 = require("../utils/plugin.manager");
const javascript_analyzer_1 = require("../analyzers/javascript/javascript.analyzer");
const apply_command_1 = require("../commands/apply.command");
const program = new commander_1.Command();
const pluginManager = new plugin_manager_1.PluginManager();
// Register analyzers
pluginManager.registerAnalyzer(new javascript_analyzer_1.JavaScriptAnalyzer());
program
    .name('depsensei')
    .description('Universal CLI devtool for detecting and resolving dependency issues')
    .version('1.0.0');
program
    .command('analyze')
    .description('Analyze project dependencies for issues')
    .option('-p, --path <path>', 'Project path to analyze', process.cwd())
    .option('-e, --ecosystem <ecosystem>', 'Specific ecosystem to analyze')
    .action(async (options) => {
    console.log(chalk_1.default.blue('🔍 Analyzing dependencies...'));
    const analyzers = options.ecosystem
        ? pluginManager.getAnalyzersForEcosystem(options.ecosystem)
        : Array.from(pluginManager.getAnalyzersForEcosystem('javascript'));
    for (const analyzer of analyzers) {
        const isDetected = await analyzer.detect({ projectRoot: options.path });
        if (isDetected) {
            console.log(chalk_1.default.green(`\n📦 Detected ${analyzer.ecosystem} ecosystem`));
            const result = await analyzer.analyze({ projectRoot: options.path });
            if (result.issues.length === 0) {
                console.log(chalk_1.default.green('✨ No issues found!'));
                continue;
            }
            console.log(chalk_1.default.yellow(`\n⚠️  Found ${result.issues.length} issues:`));
            result.issues.forEach((issue, index) => {
                console.log(`\n${index + 1}. ${chalk_1.default.red(issue.message)}`);
                console.log(`   Severity: ${chalk_1.default.yellow(issue.severity)}`);
                console.log('   Affected dependencies:');
                issue.affectedDependencies.forEach(dep => {
                    console.log(`   - ${dep.name}@${dep.version}`);
                });
                if (issue.suggestedFixes && issue.suggestedFixes.length > 0) {
                    console.log('   Suggested fixes:');
                    issue.suggestedFixes.forEach(fix => {
                        console.log(`   - ${fix.description}`);
                    });
                }
            });
            // Print summary
            console.log(chalk_1.default.blue('\n📊 Summary:'));
            console.log(`Total issues: ${result.summary.totalIssues}`);
            console.log(`High severity: ${result.summary.bySeverity.high}`);
            console.log(`Medium severity: ${result.summary.bySeverity.medium}`);
            console.log(`Low severity: ${result.summary.bySeverity.low}`);
        }
    }
});
program
    .command('fix')
    .description('Apply fixes to dependency issues')
    .option('-p, --path <path>', 'Project path to fix', process.cwd())
    .option('-e, --ecosystem <ecosystem>', 'Specific ecosystem to fix')
    .option('-d, --dry-run', 'Show what would be fixed without making changes')
    .option('-i, --interactive', 'Prompt before applying each fix')
    .option('--no-backup', 'Skip creating a backup of package.json')
    .option('--no-install', 'Skip running npm install after applying fixes')
    .option('--force', 'Skip confirmation prompt')
    .action(async (options) => {
    console.log(chalk_1.default.blue('🔧 Applying fixes...'));
    // Analyze the project
    const analyzer = new javascript_analyzer_1.JavaScriptAnalyzer();
    const isDetected = await analyzer.detect({ projectRoot: options.path });
    if (!isDetected) {
        console.log(chalk_1.default.red('No valid package.json found in the project root.'));
        return;
    }
    const result = await analyzer.analyze({ projectRoot: options.path });
    if (result.issues.length === 0) {
        console.log(chalk_1.default.green('✨ No issues found!'));
        return;
    }
    // Apply fixes
    const applyCommand = new apply_command_1.ApplyCommand(result.issues, options.path);
    await applyCommand.execute({
        force: !!options.force,
        noBackup: !!options.noBackup,
        noInstall: !!options.noInstall,
    });
});
program.parse();
