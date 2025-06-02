#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
// import { createAnalyzeCommand } from './commands/analyze.command';
const apply_command_1 = require("./commands/apply.command");
const program = new commander_1.Command();
program
    .name('depsensei')
    .description('A CLI tool to detect and resolve dependency issues across various programming environments')
    .version('0.1.0');
// createAnalyzeCommand(program);
(0, apply_command_1.createApplyCommand)(program);
program.parse();
