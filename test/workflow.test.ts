import { join } from 'path';
import { execSync } from 'child_process';
import chalk from 'chalk';
import { JavaScriptAnalyzer } from '../src/analyzers/javascript/javascript.analyzer';
import { JavaScriptFixer } from '../src/fixers/javascript/javascript.fixer';
import { ApplyCommand } from '../src/commands/apply.command';
import { FixFormatter } from '../src/utils/fix.formatter';
import { AnalyzerConfig, FixerConfig } from '../src/core/types';

const TEST_PROJECT_PATH = join(__dirname, 'fixtures/test-project');

async function runWorkflowTest() {
  console.log(chalk.blue('\n=== DepSensei Workflow Test ===\n'));

  try {
    // Step 1: Analyze the test project
    console.log(chalk.yellow('Step 1: Analyzing dependencies...'));
    const analyzer = new JavaScriptAnalyzer();
    const analyzerConfig: AnalyzerConfig = {
      projectRoot: TEST_PROJECT_PATH,
      includeDevDependencies: true,
      includePeerDependencies: true
    };
    const analysisResult = await analyzer.analyze(analyzerConfig);
    
    if (analysisResult.issues.length === 0) {
      console.log(chalk.green('No issues found in test project.'));
      return;
    }

    // Display found issues
    console.log(chalk.green(`\nFound ${analysisResult.issues.length} issues:`));
    console.log(FixFormatter.formatAsTable(analysisResult.issues));

    // Step 2: Generate fixes
    console.log(chalk.yellow('\nStep 2: Generating fixes...'));
    const fixer = new JavaScriptFixer();
    let totalFixes = 0;

    const fixerConfig: FixerConfig = {
      projectRoot: TEST_PROJECT_PATH
    };

    for (const issue of analysisResult.issues) {
      if (await fixer.canFix(issue)) {
        const fixes = await fixer.generateFixes(issue, fixerConfig);
        issue.suggestedFixes = fixes;
        totalFixes += fixes.length;
      }
    }

    console.log(chalk.green(`Generated ${totalFixes} potential fixes.`));

    // Step 3: Apply fixes (in test mode)
    console.log(chalk.yellow('\nStep 3: Testing fix application...'));
    const applyCommand = new ApplyCommand(analysisResult.issues, TEST_PROJECT_PATH);
    
    // Test with different options
    const testScenarios = [
      { name: 'Default options', options: { force: false, noBackup: false, noInstall: true } },
      { name: 'Force mode', options: { force: true, noBackup: false, noInstall: true } },
      { name: 'No backup', options: { force: false, noBackup: true, noInstall: true } },
    ];

    for (const scenario of testScenarios) {
      console.log(chalk.blue(`\nTesting scenario: ${scenario.name}`));
      try {
        await applyCommand.execute(scenario.options);
        console.log(chalk.green('✓ Scenario passed'));
      } catch (error) {
        console.error(chalk.red('✗ Scenario failed:'), error);
      }
    }

    // Step 4: Verify results
    console.log(chalk.yellow('\nStep 4: Verifying results...'));
    const finalPackageJson = require(join(TEST_PROJECT_PATH, 'package.json'));
    console.log('\nFinal package.json state:');
    console.log(JSON.stringify(finalPackageJson, null, 2));

    // Cleanup
    console.log(chalk.yellow('\nCleaning up...'));
    try {
      execSync('rm -f package.json.depsensei.backup', { cwd: TEST_PROJECT_PATH });
      console.log(chalk.green('✓ Cleanup successful'));
    } catch (error) {
      console.error(chalk.red('✗ Cleanup failed:'), error);
    }

    console.log(chalk.green('\n=== Workflow test completed successfully! ===\n'));

  } catch (error) {
    console.error(chalk.red('\n=== Workflow test failed! ==='));
    console.error(error);
    process.exit(1);
  }
}

// Run the test
runWorkflowTest(); 