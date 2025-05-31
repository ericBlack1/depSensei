#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { PluginManager } from '../utils/plugin.manager';
import { JavaScriptAnalyzer } from '../analyzers/javascript/javascript.analyzer';
import { SandboxManager } from '../sandbox/sandbox.manager';

const program = new Command();
const pluginManager = new PluginManager();

// Register analyzers
pluginManager.registerAnalyzer(new JavaScriptAnalyzer());

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
    console.log(chalk.blue('🔍 Analyzing dependencies...'));
    
    const analyzers = options.ecosystem
      ? pluginManager.getAnalyzersForEcosystem(options.ecosystem)
      : Array.from(pluginManager.getAnalyzersForEcosystem('javascript'));

    for (const analyzer of analyzers) {
      const isDetected = await analyzer.detect({ projectRoot: options.path });
      if (isDetected) {
        console.log(chalk.green(`\n📦 Detected ${analyzer.ecosystem} ecosystem`));
        const result = await analyzer.analyze({ projectRoot: options.path });
        
        if (result.issues.length === 0) {
          console.log(chalk.green('✨ No issues found!'));
          continue;
        }

        console.log(chalk.yellow(`\n⚠️  Found ${result.issues.length} issues:`));
        result.issues.forEach((issue, index) => {
          console.log(`\n${index + 1}. ${chalk.red(issue.message)}`);
          console.log(`   Severity: ${chalk.yellow(issue.severity)}`);
          console.log('   Affected dependencies:');
          issue.affectedDependencies.forEach(dep => {
            console.log(`   - ${dep.name}@${dep.version}`);
          });
          
          if (issue.suggestedFixes.length > 0) {
            console.log('   Suggested fixes:');
            issue.suggestedFixes.forEach(fix => {
              console.log(`   - ${fix.description}`);
            });
          }
        });

        // Print summary
        console.log(chalk.blue('\n📊 Summary:'));
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
  .action(async (options) => {
    console.log(chalk.blue('🔧 Applying fixes...'));
    
    const sandbox = new SandboxManager({ projectRoot: options.path });
    await sandbox.create();

    try {
      // Implementation for applying fixes
      // This would use the plugin manager to get appropriate fixers
      // and apply them in the sandbox first
    } finally {
      await sandbox.cleanup();
    }
  });

program.parse(); 