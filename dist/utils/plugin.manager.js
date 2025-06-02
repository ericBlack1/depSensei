"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PluginManager = void 0;
class PluginManager {
    constructor() {
        this.analyzers = new Map();
        this.fixers = new Map();
    }
    registerAnalyzer(analyzer) {
        this.analyzers.set(analyzer.name, analyzer);
    }
    registerFixer(fixer) {
        this.fixers.set(fixer.name, fixer);
    }
    getAnalyzer(name) {
        return this.analyzers.get(name);
    }
    getFixer(name) {
        return this.fixers.get(name);
    }
    getAnalyzersForEcosystem(ecosystem) {
        return Array.from(this.analyzers.values())
            .filter(analyzer => analyzer.ecosystem === ecosystem);
    }
    getFixersForEcosystem(ecosystem) {
        return Array.from(this.fixers.values())
            .filter(fixer => fixer.ecosystem === ecosystem);
    }
}
exports.PluginManager = PluginManager;
