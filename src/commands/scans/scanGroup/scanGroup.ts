import { z } from "zod";
import { userConfig } from "../../../utils/config.js";
import { logger } from "../../../utils/logger.js";
import chalk from "chalk";
import { OctokitService } from "../../../services/octokit.js";
import { printUpdates } from "../printUpdates.js";
import { extractUpdateInfo } from "../extractUpdateInfo.js";
import { getSpinner } from "../../../utils/spinner.js";

export async function scanGroup(...args: Array<unknown>) {
  logger.info("");

  const [groupName, options] = z
    .tuple([
      z.string(),
      z.object({
        verbose: z.boolean().catch(false),
        dependencies: z.array(z.string()).optional(),
        updateType: z.enum(["major", "minor", "patch"]).optional(),
      }),
    ])
    .rest(z.unknown())
    .parse(args);
  const repoGroup = userConfig.repoGroup.get(groupName);

  if (options.verbose) {
    logger.setIsVerbose(true);
  }

  if (!repoGroup) {
    logger.error(
      `Could not find a repository group with the name ${chalk.blue(groupName)}`
    );

    return;
  }

  const octokitService = new OctokitService();

  for (const repo of repoGroup) {
    const spinner = getSpinner(
      `Fetching dependency dashboard for ${repo.owner}/${repo.name}`
    );

    spinner.start();
    const dependencyDashboard = await octokitService.fetchDependencyDashboard({
      repoName: repo.name,
      repoOwner: repo.owner,
    });

    spinner.stop();

    if (!dependencyDashboard) {
      logger.debug(
        `Repository ${repo.owner}/${repo.name} is not using Renovate`
      );
      logger.debug("");
      continue;
    }

    if (!dependencyDashboard.body) {
      logger.debug(
        `Dependency dashboard for ${repo.owner}/${repo.name} has an empty body`
      );
      logger.debug("");
      continue;
    }

    const updates = extractUpdateInfo(dependencyDashboard.body);

    printUpdates({
      updates,
      dependencyDashboardUrl: dependencyDashboard.html_url,
      dependenciesToFilterBy: options.dependencies,
      updateType: options.updateType,
      repo,
    });
  }
}
