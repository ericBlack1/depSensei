"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApplyCommand = void 0;
exports.createApplyCommand = createApplyCommand;
const inquirer_1 = __importDefault(require("inquirer"));
const fs_1 = require("fs");
const path_1 = require("path");
const child_process_1 = require("child_process");
const chalk_1 = __importDefault(require("chalk"));
const fix_formatter_1 = require("../utils/fix.formatter");
class ApplyCommand {
    constructor(issues, projectRoot) {
        this.issues = issues;
        this.projectRoot = projectRoot;
        this.packageJsonPath = (0, path_1.join)(projectRoot, 'package.json');
        this.backupPath = (0, path_1.join)(projectRoot, 'package.json.depsensei.backup');
    }
    async execute(options) {
        if (this.issues.length === 0) {
            console.log(chalk_1.default.green('No issues to fix!'));
            return;
        }
        // Display issues and fixes
        console.log('\nFound the following issues:');
        console.log(fix_formatter_1.FixFormatter.formatAsTable(this.issues));
        // First ask if user wants to proceed
        const { proceed } = await inquirer_1.default.prompt([
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
            console.log(chalk_1.default.yellow('Operation cancelled by user.'));
            return;
        }
        // Get user selection for which packages to update
        const { selectedPackages } = await inquirer_1.default.prompt([
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
            console.log(chalk_1.default.yellow('No packages selected for update.'));
            return;
        }
        // Get user confirmation
        if (!options.force) {
            const { confirm } = await inquirer_1.default.prompt([
                {
                    type: 'confirm',
                    name: 'confirm',
                    message: `Do you want to apply fixes for the selected ${selectedPackages.length} package(s)?`,
                    default: false,
                },
            ]);
            if (!confirm) {
                console.log(chalk_1.default.yellow('Operation cancelled by user.'));
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
        console.log(chalk_1.default.green('\nFixes applied successfully!'));
        if (!options.noBackup) {
            console.log(chalk_1.default.yellow(`Backup saved to: ${this.backupPath}`));
        }
    }
    createBackup() {
        try {
            (0, fs_1.copyFileSync)(this.packageJsonPath, this.backupPath);
            console.log(chalk_1.default.yellow(`Created backup at: ${this.backupPath}`));
        }
        catch (error) {
            console.error(chalk_1.default.red('Failed to create backup:'), error);
            throw error;
        }
    }
    async applyFixes(selectedIssues) {
        try {
            const packageJson = JSON.parse((0, fs_1.readFileSync)(this.packageJsonPath, 'utf-8'));
            let changesMade = false;
            for (const issue of selectedIssues) {
                if (!issue.suggestedFixes || issue.suggestedFixes.length === 0)
                    continue;
                // Get user selection for fixes if multiple are available
                let selectedFix = issue.suggestedFixes[0];
                if (issue.suggestedFixes.length > 1) {
                    const { fixIndex } = await inquirer_1.default.prompt([
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
                (0, fs_1.writeFileSync)(this.packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
            }
            else {
                console.log(chalk_1.default.yellow('No changes were made to package.json'));
            }
        }
        catch (error) {
            console.error(chalk_1.default.red('Failed to apply fixes:'), error);
            throw error;
        }
    }
    async runNpmInstall() {
        try {
            console.log(chalk_1.default.blue('\nRunning npm install...'));
            (0, child_process_1.execSync)('npm install', {
                cwd: this.projectRoot,
                stdio: 'inherit',
            });
        }
        catch (error) {
            console.error(chalk_1.default.red('Failed to run npm install:'), error);
            throw error;
        }
    }
}
exports.ApplyCommand = ApplyCommand;
function createApplyCommand(program) {
    program
        .command('apply')
        .description('Apply suggested fixes to package.json')
        .option('-f, --force', 'Skip confirmation prompt')
        .option('--no-backup', 'Skip creating a backup of package.json')
        .option('--no-install', 'Skip running npm install after applying fixes')
        .action(async (options) => {
        try {
            // TODO: Get issues from analyzer
            const issues = [];
            const projectRoot = process.cwd();
            const applyCommand = new ApplyCommand(issues, projectRoot);
            await applyCommand.execute(options);
        }
        catch (error) {
            console.error(chalk_1.default.red('Error applying fixes:'), error);
            process.exit(1);
        }
    });
}
