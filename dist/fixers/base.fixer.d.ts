import { DependencyIssue, DependencyFix } from '../core/types';
import { AnalyzerConfig } from '../analyzers/base.analyzer';
export interface FixerConfig extends AnalyzerConfig {
    dryRun?: boolean;
    interactive?: boolean;
}
export interface Fixer {
    name: string;
    ecosystem: string;
    canFix(issue: DependencyIssue): boolean;
    generateFixes(issue: DependencyIssue, config: FixerConfig): Promise<DependencyFix[]>;
    applyFix(fix: DependencyFix, config: FixerConfig): Promise<void>;
}
