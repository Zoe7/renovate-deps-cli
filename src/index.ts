#! /usr/bin/env node
import { Command } from "commander";

const program = new Command();

program
  .name("renovate-deps-cli")
  .description("CLI for renovate-deps")
  .version("1.0.0")
  .option("-p, --package <package>", "Package name");

const command = program.parse();

console.log(command);
