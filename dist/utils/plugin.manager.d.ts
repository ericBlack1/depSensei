import { Analyzer } from '../analyzers/base.analyzer';
import { Fixer } from '../fixers/base.fixer';
export declare class PluginManager {
    private analyzers;
    private fixers;
    registerAnalyzer(analyzer: Analyzer): void;
    registerFixer(fixer: Fixer): void;
    getAnalyzer(name: string): Analyzer | undefined;
    getFixer(name: string): Fixer | undefined;
    getAnalyzersForEcosystem(ecosystem: string): Analyzer[];
    getFixersForEcosystem(ecosystem: string): Fixer[];
}
