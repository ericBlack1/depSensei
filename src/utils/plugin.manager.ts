import { Analyzer } from '../analyzers/base.analyzer';
import { Fixer } from '../fixers/base.fixer';

export class PluginManager {
  private analyzers: Map<string, Analyzer> = new Map();
  private fixers: Map<string, Fixer> = new Map();

  registerAnalyzer(analyzer: Analyzer): void {
    this.analyzers.set(analyzer.name, analyzer);
  }

  registerFixer(fixer: Fixer): void {
    this.fixers.set(fixer.name, fixer);
  }

  getAnalyzer(name: string): Analyzer | undefined {
    return this.analyzers.get(name);
  }

  getFixer(name: string): Fixer | undefined {
    return this.fixers.get(name);
  }

  getAnalyzersForEcosystem(ecosystem: string): Analyzer[] {
    return Array.from(this.analyzers.values())
      .filter(analyzer => analyzer.ecosystem === ecosystem);
  }

  getFixersForEcosystem(ecosystem: string): Fixer[] {
    return Array.from(this.fixers.values())
      .filter(fixer => fixer.ecosystem === ecosystem);
  }
} 