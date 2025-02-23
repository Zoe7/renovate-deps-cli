#! /usr/bin/env node
import { Command, Option } from "commander";
import { userConfig } from "./utils/config.js";
import { init } from "./commands/init/init.js";
import { cleanup } from "./commands/cleanup/cleanup.js";
import { withExitPromptErrorHandling } from "./utils/withExitPromptErrorHandling.js";
import { logger } from "./utils/logger.js";
import { createRepoGroups } from "./commands/repoGroups/createRepoGroups.js";
import { deleteRepoGroup } from "./commands/repoGroups/deleteRepoGroup.js";
import { listRepoGroups } from "./commands/repoGroups/listRepoGroups.js";
import { scan } from "./commands/scan/scan.js";

const program = new Command();

program
  .name("renovate-deps")
  .description(
    "CLI for managing dependencies updates in multiple repositories using Renovate dependency dashboards. See https://github.com/Zoe7/renovate-deps-cli for more information."
  )
  .version("1.0.0");

program
  .command("init")
  .action(withExitPromptErrorHandling(init))
  .description(
    "Set up the CLI and all the configuration it is going to need to work."
  );

program
  .command("repo-groups")
  .addCommand(
    new Command("create")
      .description("Create new repository group")
      .argument("<groupName>", "Repository group name")
      .requiredOption(
        "-r, --repos <repos...>",
        'Repositories to add to the repository group, in the format "owner/repo\n"'
      )
      .option("-f, --force", "Overwrite existing repository group")
      .option(
        "--verbose",
        "Print additional debug information to the console\n"
      )
      .action(createRepoGroups)
  )
  .addCommand(
    new Command("delete")
      .description("Delete repository group")
      .argument("<groupName>", "Group name")
      .action(deleteRepoGroup)
  )
  .addCommand(
    new Command("list")
      .description("List all repository groups")
      .action(listRepoGroups)
  )
  .description(
    "Manage repository groups for dependency analysis.\nThese predefined lists can be used with `renovate-deps scan-group` to efficiently check for updates across multiple repositories"
  );

program
  .command("scan")
  .addOption(
    new Option(
      "-r, --repos <repositories...>",
      'A list of repositories to display the pending dependencies updates for, in the format "owner/repo"\nThis option is mutually exclusive with --owner\nTip: if you often scan a specific set of repositories, you can work with predefined repository groups using `renovate-deps repo-groups create <groupName>` and `renovate-deps scan-group <groupName>`.\n'
    ).conflicts("owner")
  )
  .option(
    "-o, --owner <owner>",
    "The Github owner to filter the repositories by\nThis can help narrow down the list of repositories being scanned and speed up the analysis when no repositories are specified\nThis option is mutually exclusive with --repos\n"
  )
  .option(
    "--rga, --renovate-github-author <renovateGithubAuthor>",
    "The Renovate GitHub author responsible for creating dependency dashboard issues."
  )
  .option(
    "-d, --dependencies <dependencies...>",
    "The dependencies for which to find pending updates\n"
  )
  .option("--verbose", "Print additional debug information to the console\n")
  .action(scan)
  .description(
    'List all the pending dependencies updates\n\nThis command is much faster when provided with a list of specific repositories to scan.\nIf no repositories are specified, the CLI will scan all the repositories which might be relevant to the user using Octokit "listRepositoriesForAuthenticatedUser" API call. See https://octokit.github.io/rest.js/v21/#repos-list-for-authenticated-user for more information on which repositories are included in this list.\n'
  );

program
  .command("scan-group")
  .requiredOption(
    "-g, --repo-group <repositoryGroup>",
    "The name of repository groups to display the pending dependencies updates for. Use `manage-repo-groups` to create and manage these predefined groups."
  )
  .option("--verbose", "Print additional debug information to the console")
  .option(
    "-d, --dependencies <dependencies...>",
    "The dependencies for which to find pending updates"
  )
  .action(() => console.log("Not implemented yet"));

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
    logger.info(`defaultOwner: ${userConfig.defaultOwner.get()}`);
    logger.info(`repoGroups: ${userConfig.repoGroup.getAll()}`);
  })
  .description("Run the CLI");

program.parse(process.argv);
