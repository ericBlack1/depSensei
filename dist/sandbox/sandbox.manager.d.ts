import { DependencyFix } from '../core/types';
export interface SandboxConfig {
    projectRoot: string;
    tempDir?: string;
    npmRegistry?: string;
    timeout?: number;
}
export interface SandboxResult {
    success: boolean;
    error?: string;
    output?: string;
    duration: number;
}
export declare class SandboxManager {
    private tempDir;
    private projectRoot;
    private npmRegistry;
    private timeout;
    private packageJsonPath;
    private lockfilePath;
    private hasLockfile;
    constructor(config: SandboxConfig);
    /**
     * Creates a new sandbox environment
     */
    create(): Promise<void>;
    /**
     * Tests a dependency fix in the sandbox
     */
    testFix(fix: DependencyFix): Promise<SandboxResult>;
    /**
     * Tests multiple versions of a package to find compatible ones
     */
    testPackageVersions(packageName: string, versions: string[], testCommand?: string): Promise<Map<string, SandboxResult>>;
    /**
     * Cleans up the sandbox environment
     */
    cleanup(): Promise<void>;
    private copyPackageJson;
    private copyLockfile;
    private initializeNpm;
    private installDependencies;
    private runTests;
    private applyFixToPackageJson;
    private testVersion;
    private readPackageJson;
    private writePackageJson;
}
