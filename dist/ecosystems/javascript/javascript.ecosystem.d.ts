import { Ecosystem, DependencyIssue, DependencyFix } from '../../core/types';
export declare class JavaScriptEcosystem implements Ecosystem {
    name: string;
    private packageJsonPath;
    private packageJson;
    constructor(projectRoot: string);
    detect(): Promise<boolean>;
    analyze(): Promise<DependencyIssue[]>;
    resolve(issue: DependencyIssue): Promise<DependencyFix[]>;
    applyFix(fix: DependencyFix): Promise<void>;
    private getAllDependencies;
    private getPeerDependencies;
    private findVersionConflicts;
    private generateVersionConflictFixes;
}
