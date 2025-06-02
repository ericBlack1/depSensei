import { DependencyIssue } from '../core/types';
export interface FormattedFix {
    issue: string;
    severity: string;
    fixes: {
        description: string;
        confidence: string;
        changes: {
            package: string;
            from: string;
            to: string;
        }[];
    }[];
}
export declare class FixFormatter {
    static formatAsTable(issues: DependencyIssue[]): string;
    static formatAsJson(issues: DependencyIssue[]): string;
    private static formatSeverity;
    private static formatConfidence;
}
