import { Analyzer, AnalyzerConfig } from '../base.analyzer';
import { AnalysisResult } from '../../core/types';
export declare class JavaScriptAnalyzer implements Analyzer {
    name: string;
    ecosystem: string;
    private packageJsonPath;
    private lockfilePath;
    private hasLockfile;
    private packageInfoCache;
    detect(config: AnalyzerConfig): Promise<boolean>;
    analyze(config: AnalyzerConfig): Promise<AnalysisResult>;
    private generateSummary;
    private checkOutdatedDependencies;
    private getPackageInfo;
    private checkDeprecatedPackages;
    private checkVersionConflicts;
    private createOutdatedIssues;
    private createDeprecatedIssues;
    private createVersionConflictIssues;
    getSupportedFilePatterns(): string[];
}
