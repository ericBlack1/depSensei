export interface Dependency {
    name: string;
    version: string;
    type: 'dependencies' | 'devDependencies' | 'peerDependencies' | 'optionalDependencies';
}
export interface DependencyIssue {
    type: string;
    message: string;
    severity: 'high' | 'medium' | 'low';
    affectedDependencies: Dependency[];
    suggestedFixes?: DependencyFix[];
}
export interface DependencyFix {
    description: string;
    changes: {
        name: string;
        from: string;
        to: string;
    }[];
    confidence: 'high' | 'medium' | 'low';
}
export interface Ecosystem {
    name: string;
    detect(): Promise<boolean>;
    analyze(): Promise<DependencyIssue[]>;
    resolve(issue: DependencyIssue): Promise<DependencyFix[]>;
    applyFix(fix: DependencyFix): Promise<void>;
}
export interface AnalysisResult {
    ecosystem: string;
    issues: DependencyIssue[];
    summary: {
        totalIssues: number;
        bySeverity: {
            low: number;
            medium: number;
            high: number;
        };
    };
}
export interface AnalyzerConfig {
    projectRoot: string;
    includeDevDependencies?: boolean;
    includePeerDependencies?: boolean;
    registry?: string;
}
export interface FixerConfig {
    projectRoot: string;
    registry?: string;
    timeout?: number;
}
