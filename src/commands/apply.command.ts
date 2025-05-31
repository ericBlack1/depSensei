import { Command } from 'commander';
import inquirer from 'inquirer';
import { readFileSync, writeFileSync, copyFileSync } from 'fs';
import { join, dirname } from 'path';
import { execSync } from 'child_process';
import chalk from 'chalk';
import { DependencyIssue } from '../core/types';
import { FixFormatter } from '../utils/fix.formatter';

interface ApplyOptions {
  force: boolean;
  noBackup: boolean;
  noInstall: boolean;
}

export class ApplyCommand {
  private issues: DependencyIssue[];
  private projectRoot: string;
  private packageJsonPath: string;
  private backupPath: string;

  constructor(issues: DependencyIssue[], projectRoot: string) {
    this.issues = issues;
    this.projectRoot = projectRoot;
    this.packageJsonPath = join(projectRoot, 'package.json');
    this.backupPath = join(projectRoot, 'package.json.depsensei.backup');
  }

  async execute(options: ApplyOptions): Promise<void> {
    if (this.issues.length === 0) {
      console.log(chalk.green('No issues to fix!'));
      return;
    }

    // Display issues and fixes
    console.log('\nFound the following issues:');
    console.log(FixFormatter.formatAsTable(this.issues));

    // First ask if user wants to proceed
    const { proceed } = await inquirer.prompt([
      {
        type: 'list',
        name: 'proceed',
        message: 'What would you like to do?',
        choices: [
          {
            name: 'Select packages to update',
            value: 'select'
          },
          {
            name: 'Exit without making changes',
            value: 'exit'
          }
        ]
      }
    ]);

    if (proceed === 'exit') {
      console.log(chalk.yellow('Operation cancelled by user.'));
      return;
    }

    // Get user selection for which packages to update
    const { selectedPackages } = await inquirer.prompt([
      {
        type: 'checkbox',
        name: 'selectedPackages',
        message: 'Select packages to update (Press Ctrl+C to cancel):',
        choices: this.issues.map(issue => ({
          name: `${issue.affectedDependencies[0].name} (${issue.type} - ${issue.message})`,
          value: issue,
          checked: true // Default to all selected
        })),
        validate: (input) => input.length > 0 || 'Please select at least one package to update'
      }
    ]);

    if (selectedPackages.length === 0) {
      console.log(chalk.yellow('No packages selected for update.'));
      return;
    }

    // Get user confirmation
    if (!options.force) {
      const { confirm } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirm',
          message: `Do you want to apply fixes for the selected ${selectedPackages.length} package(s)?`,
          default: false,
        },
      ]);

      if (!confirm) {
        console.log(chalk.yellow('Operation cancelled by user.'));
        return;
      }
    }

    // Create backup
    if (!options.noBackup) {
      this.createBackup();
    }

    // Apply fixes only for selected packages
    await this.applyFixes(selectedPackages);

    // Run npm install
    if (!options.noInstall) {
      await this.runNpmInstall();
    }

    console.log(chalk.green('\nFixes applied successfully!'));
    if (!options.noBackup) {
      console.log(chalk.yellow(`Backup saved to: ${this.backupPath}`));
    }
  }

  private createBackup(): void {
    try {
      copyFileSync(this.packageJsonPath, this.backupPath);
      console.log(chalk.yellow(`Created backup at: ${this.backupPath}`));
    } catch (error) {
      console.error(chalk.red('Failed to create backup:'), error);
      throw error;
    }
  }

  private async applyFixes(selectedIssues: DependencyIssue[]): Promise<void> {
    try {
      const packageJson = JSON.parse(readFileSync(this.packageJsonPath, 'utf-8'));
      let changesMade = false;

      for (const issue of selectedIssues) {
        if (!issue.suggestedFixes || issue.suggestedFixes.length === 0) continue;

        // Get user selection for fixes if multiple are available
        let selectedFix = issue.suggestedFixes[0];
        if (issue.suggestedFixes.length > 1) {
          const { fixIndex } = await inquirer.prompt([
            {
              type: 'list',
              name: 'fixIndex',
              message: `Multiple fixes available for: ${issue.message}`,
              choices: issue.suggestedFixes.map((fix, index) => ({
                name: `${fix.description} (confidence: ${fix.confidence})`,
                value: index,
              })),
            },
          ]);
          selectedFix = issue.suggestedFixes[fixIndex];
        }

        // Apply the selected fix
        for (const change of selectedFix.changes) {
          for (const depType of ['dependencies', 'devDependencies', 'peerDependencies']) {
            if (packageJson[depType]?.[change.name]) {
              packageJson[depType][change.name] = change.to;
              changesMade = true;
            }
          }
        }
      }

      if (changesMade) {
        writeFileSync(
          this.packageJsonPath,
          JSON.stringify(packageJson, null, 2) + '\n'
        );
      } else {
        console.log(chalk.yellow('No changes were made to package.json'));
      }
    } catch (error) {
      console.error(chalk.red('Failed to apply fixes:'), error);
      throw error;
    }
  }

  private async runNpmInstall(): Promise<void> {
    try {
      console.log(chalk.blue('\nRunning npm install...'));
      execSync('npm install', {
        cwd: this.projectRoot,
        stdio: 'inherit',
      });
    } catch (error) {
      console.error(chalk.red('Failed to run npm install:'), error);
      throw error;
    }
  }
}

export function createApplyCommand(program: Command): void {
  program
    .command('apply')
    .description('Apply suggested fixes to package.json')
    .option('-f, --force', 'Skip confirmation prompt')
    .option('--no-backup', 'Skip creating a backup of package.json')
    .option('--no-install', 'Skip running npm install after applying fixes')
    .action(async (options: ApplyOptions) => {
      try {
        // TODO: Get issues from analyzer
        const issues: DependencyIssue[] = [];
        const projectRoot = process.cwd();
        
        const applyCommand = new ApplyCommand(issues, projectRoot);
        await applyCommand.execute(options);
      } catch (error) {
        console.error(chalk.red('Error applying fixes:'), error);
        process.exit(1);
      }
    });
} 