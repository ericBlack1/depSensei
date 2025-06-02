"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FixFormatter = void 0;
const chalk_1 = __importDefault(require("chalk"));
const cli_table3_1 = __importDefault(require("cli-table3"));
class FixFormatter {
    static formatAsTable(issues) {
        const table = new cli_table3_1.default({
            head: ['Type', 'Severity', 'Message', 'Dependencies', 'Suggested Fixes'],
            colWidths: [15, 10, 30, 20, 30],
        });
        issues.forEach(issue => {
            const dependencies = issue.affectedDependencies
                .map(d => `${d.name}@${d.version}`)
                .join(', ');
            const suggestedFixes = issue.suggestedFixes?.map((fix, index) => {
                const changes = fix.changes
                    .map(c => `${c.name}: ${c.from} → ${c.to}`)
                    .join(', ');
                return `${index + 1}. ${fix.description} (${changes})`;
            }).join('\n') || 'No fixes suggested';
            table.push([
                issue.type,
                issue.severity,
                issue.message,
                dependencies,
                suggestedFixes,
            ]);
        });
        return table.toString();
    }
    static formatAsJson(issues) {
        const formattedIssues = issues.map(issue => ({
            type: issue.type,
            severity: issue.severity,
            message: issue.message,
            dependencies: issue.affectedDependencies.map(d => ({
                name: d.name,
                version: d.version,
                type: d.type,
            })),
            fixes: issue.suggestedFixes?.map(fix => ({
                description: fix.description,
                changes: fix.changes,
                confidence: fix.confidence,
            })) || [],
        }));
        return JSON.stringify(formattedIssues, null, 2);
    }
    static formatSeverity(severity) {
        switch (severity) {
            case 'high':
                return chalk_1.default.red(severity);
            case 'medium':
                return chalk_1.default.yellow(severity);
            case 'low':
                return chalk_1.default.green(severity);
            default:
                return severity;
        }
    }
    static formatConfidence(confidence) {
        switch (confidence) {
            case 'high':
                return chalk_1.default.green(confidence);
            case 'medium':
                return chalk_1.default.yellow(confidence);
            case 'low':
                return chalk_1.default.red(confidence);
            default:
                return confidence;
        }
    }
}
exports.FixFormatter = FixFormatter;
