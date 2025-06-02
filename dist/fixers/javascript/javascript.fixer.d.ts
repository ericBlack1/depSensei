import { Fixer, FixerConfig } from '../base.fixer';
import { DependencyIssue, DependencyFix } from '../../core/types';
export declare class JavaScriptFixer implements Fixer {
    name: string;
    ecosystem: string;
    canFix(issue: DependencyIssue): boolean;
    generateFixes(issue: DependencyIssue, config: FixerConfig): Promise<DependencyFix[]>;
    applyFix(fix: DependencyFix, config: FixerConfig): Promise<void>;
    private resolveOutdatedPackage;
    private resolveVersionConflicts;
    private resolveDeprecatedPackage;
    private resolveAbandonedPackage;
    private getPackageInfo;
    private extractReplacementFromDeprecation;
}
