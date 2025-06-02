import { Command } from 'commander';
import { DependencyIssue } from '../core/types';
interface ApplyOptions {
    force: boolean;
    noBackup: boolean;
    noInstall: boolean;
}
export declare class ApplyCommand {
    private issues;
    private projectRoot;
    private packageJsonPath;
    private backupPath;
    constructor(issues: DependencyIssue[], projectRoot: string);
    execute(options: ApplyOptions): Promise<void>;
    private createBackup;
    private applyFixes;
    private runNpmInstall;
}
export declare function createApplyCommand(program: Command): void;
export {};
