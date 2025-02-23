import { z } from "zod";
import { userConfig } from "../../utils/config.js";
import { logger } from "../../utils/logger.js";
import chalk from "chalk";
import { OctokitService } from "../../services/octokit.js";

import { symbols } from "../../utils/symbols.js";

type Repository = { name: string; owner: string; url: string };
type RepositoryGroupCreationError = {
  repo: string;
  message: string;
  suggestion?: string;
};

export async function createRepoGroups(...args: unknown[]) {
  logger.info("");
  const [groupName, options] = z
    .tuple([
      z.string(),
      z.object({
        repos: z.array(z.string()),
        verbose: z.boolean().catch(() => false),
        force: z.boolean().catch(() => false),
      }),
    ])
    .rest(z.unknown())
    .parse(args);

  if (options.verbose) {
    logger.setIsVerbose(true);
  }

  const repoGroup = userConfig.repoGroup.get(groupName);

  if (repoGroup && !options.force) {
    logger.error(
      `A repository group with the name "${chalk.blue(
        groupName
      )}" already exists\n`
    );

    logger.info("Group content:");
    for (const repo of repoGroup) {
      logger.info(`  - ${repo.owner}/${repo.name}`);
    }

    logger.info("");
    logger.info("Tips:");
    logger.info(
      `  - use the ${chalk.blue(
        "--force"
      )} flag to overwrite the existing repository group`
    );
    logger.info(
      `  - use ${chalk.blue(
        "deps-cli repo-groups delete <groupName>"
      )} to delete the existing repository group`
    );
    logger.info("");
    return;
  }

  const errors: Array<RepositoryGroupCreationError> = [];
  const repos: Array<Repository> = [];

  const octokitService = new OctokitService();

  for (const repo of options.repos) {
    const [repoOwner, repoName, ...rest] = repo.split("/");
    if (!repoName || !repoOwner || rest.length > 0) {
      errors.push({
        repo,
        message: "Invalid repository name",
        suggestion:
          "Verify that the repository name follows the format owner/repo",
      });
      continue;
    }

    const repoData = await octokitService.fetchRepository(repoName, repoOwner);
    if (!repoData) {
      errors.push({
        repo,
        message: "Repository data not found",
        suggestion:
          "Verify that the repository exists on Github, or check that your Github personal access token gives the CLI access to the repository",
      });
      continue;
    }

    repos.push({
      name: repoData.name,
      owner: repoData.owner.login,
      url: repoData.html_url,
    });
  }

  userConfig.repoGroup.set(groupName, repos);

  logger.info(
    formatGroupResults({
      groupName,
      repos,
      errors,
    })
  );
  logger.info("");
}

export function formatGroupResults({
  groupName,
  repos,
  errors,
}: {
  groupName: string;
  repos: Array<Repository>;
  errors: Array<RepositoryGroupCreationError>;
}) {
  const content: string[] = [];

  content.push(
    chalk.white(`Created repository group "${chalk.blue(groupName)}"`)
  );

  // Added repos content
  if (repos.length > 0) {
    const reposInfo: Array<string> = [];

    reposInfo.push(
      chalk.green(`${symbols.success} ${repos.length} repositories added`)
    );

    for (const repo of repos) {
      reposInfo.push(`  - ${repo.owner}/${repo.name}`);
    }

    content.push(reposInfo.join("\n"));
  }

  // Skipped repos content
  if (errors.length > 0) {
    const skippedReposInfo: Array<string> = [];

    skippedReposInfo.push(
      chalk.yellow(`${symbols.warning} ${errors.length} repositories skipped`)
    );

    for (const error of errors) {
      skippedReposInfo.push(chalk.white(`  - ${error.repo}`));

      skippedReposInfo.push(`    ${chalk.yellow(error.message)}`);

      if (error.suggestion) {
        skippedReposInfo.push(`    ${chalk.grey(error.suggestion)}`);
      }
    }

    content.push(skippedReposInfo.join("\n"));
  }

  return content.join("\n\n");
}
