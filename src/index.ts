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
import { scanGroup } from "./commands/scans/scanGroup/scanGroup.js";
import { scan } from "./commands/scans/scan/scan.js";
import { listRepos } from "./commands/listRepos/listRepos.js";

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
  .addCommand(
    new Command("scan")
      .description(
        "List all the pending dependencies updates for a specific repository group"
      )
      .argument("<groupName>", "Group name")
      .option(
        "-d, --dependencies <dependencies...>",
        "The dependencies for which to find pending updates\n"
      )
      .option(
        "--verbose",
        "Print additional debug information to the console\n"
      )
      .action(scanGroup)
  )
  .description(
    "Manage repository groups for dependency analysis.\nThese predefined groups can help narrow down the list of repositories being scanned and speed up the analysis\n"
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
    "-d, --dependencies <dependencies...>",
    "The dependencies for which to find pending updates\n"
  )
  .option("--verbose", "Print additional debug information to the console\n")
  .action(scan)
  .description(
    'List all the pending dependencies updates\n\nThis command is much faster when provided with a list of specific repositories to scan.\nIf no repositories are specified, the CLI will scan all the repositories which might be relevant to the user using Octokit "listRepositoriesForAuthenticatedUser" API call. See https://octokit.github.io/rest.js/v21/#repos-list-for-authenticated-user for more information on which repositories are included in this list.\n'
  );

program
  .command("list-repos")
  .description(
    "Display the repositories accessible to the authenticated user.\nThese repositories are the default targets for the `scan` command unless filtering options are used.\nThis command can also help determine which repositories to include in repository groups.\n"
  )
  .option("--verbose", "Print additional debug information to the console\n")
  .action(listRepos);

program
  .command("cleanup")
  .action(withExitPromptErrorHandling(cleanup))
  .description(
    "Cleanup the persisted configuration used by the CLI from your machine\n"
  );

program.parse(process.argv);
