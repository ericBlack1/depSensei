#!/usr/bin/env node

import { Command } from 'commander';
import { createAnalyzeCommand } from './commands/analyze.command';
import { createApplyCommand } from './commands/apply.command';

const program = new Command();

program
  .name('depsensei')
  .description('A CLI tool to detect and resolve dependency issues across various programming environments')
  .version('0.1.0');

createAnalyzeCommand(program);
createApplyCommand(program);

program.parse(); 