#! /usr/bin/env node
import { Command } from "commander";
import { userConfig } from "./utils/config.js";
import { init } from "./commands/init/init.js";
import { listDependencies } from "./commands/listDependencies/listDependencies.js";
import { cleanup } from "./commands/cleanup/cleanup.js";
import { withExitPromptErrorHandling } from "./utils/withExitPromptErrorHandling.js";
import { withVerboseLogging } from "./utils/withVerboseLogging.js";
import { logger } from "./utils/logger.js";

const program = new Command();

program
  .name("renovate-deps-cli")
  .description("CLI for renovate-deps")
  .version("1.0.0");

program
  .command("init")
  .action(withExitPromptErrorHandling(init))
  .description(
    "Set up the CLI and all the configuration it is going to need to work."
  );

program
  .command("list-deps")
  .option(
    "-o, --org <organization>",
    "The Github organization to filter the repositories by"
  )
  .option(
    "--rga, --renovate-github-author <renovateGithubAuthor>",
    "The Github username of the renovate bot to filter the repositories by"
  )
  .option(
    "-r, --repos <repositories...>",
    "A list of repositories to display the pending dependencies updates for"
  )
  .option(
    "-d, --dependencies <dependencies...>",
    "The dependencies for which to find pending updates"
  )
  .option("--verbose", "Print additional debug information to the console")
  .action(withExitPromptErrorHandling(withVerboseLogging(listDependencies)))
  .description(
    "List all the pending dependencies updates in all the repositories accessible by the CLI based on your configuration"
  );

program
  .command("cleanup")
  .action(withExitPromptErrorHandling(cleanup))
  .description(
    "Cleanup the persisted configuration used by the CLI from your machine"
  );

// TODO: remove this temp command for me to debug stuff
program
  .command("checkConfig")
  .action(() => {
    logger.info(`githubToken: ${userConfig.githubToken.get()}`);
    logger.info(
      `defaultRenovateGithubAuthor: ${userConfig.defaultRenovateGithubAuthor.get()}`
    );
    logger.info(`defaultOrg: ${userConfig.defaultOrg.get()}`);
  })
  .description("Run the CLI");

program.parse(process.argv);
