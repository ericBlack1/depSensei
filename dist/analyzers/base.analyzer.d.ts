import { AnalysisResult } from '../core/types';
export interface AnalyzerConfig {
    projectRoot: string;
    options?: Record<string, any>;
}
export interface Analyzer {
    name: string;
    ecosystem: string;
    detect(config: AnalyzerConfig): Promise<boolean>;
    analyze(config: AnalyzerConfig): Promise<AnalysisResult>;
    getSupportedFilePatterns(): string[];
}
