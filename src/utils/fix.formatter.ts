import { DependencyIssue } from '../core/types';
import chalk from 'chalk';
import Table from 'cli-table3';

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

export class FixFormatter {
  static formatAsTable(issues: DependencyIssue[]): string {
    const table = new Table({
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

  static formatAsJson(issues: DependencyIssue[]): string {
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

  private static formatSeverity(severity: string): string {
    switch (severity) {
      case 'high':
        return chalk.red(severity);
      case 'medium':
        return chalk.yellow(severity);
      case 'low':
        return chalk.green(severity);
      default:
        return severity;
    }
  }

  private static formatConfidence(confidence: string): string {
    switch (confidence) {
      case 'high':
        return chalk.green(confidence);
      case 'medium':
        return chalk.yellow(confidence);
      case 'low':
        return chalk.red(confidence);
      default:
        return confidence;
    }
  }
} 