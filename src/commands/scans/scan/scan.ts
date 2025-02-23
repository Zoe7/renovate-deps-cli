import { z } from "zod";
import { logger } from "../../../utils/logger.js";
import { OctokitService } from "../../../services/octokit.js";
import { getSpinner } from "../../../utils/spinner.js";
import { extractUpdateInfo } from "../extractUpdateInfo.js";
import { printUpdates } from "../printUpdates.js";

export function getOptions(args: unknown) {
  const options = z
    .object({
      owner: z.string().optional(),
      repos: z.array(z.string()).optional(),
      dependencies: z.array(z.string()).optional(),
      verbose: z.boolean().catch(() => false),
    })
    .parse(args);

  const reposToFilterBy = options.repos
    ?.map((repo) => {
      const [repoOwner, repoName, ...rest] = repo.split("/");
      if (!repoName || !repoOwner || rest.length > 0) {
        logger.debug(
          `Skipping repo ${repo} because it is not valid, it should be in the format "owner/repo".`
        );
        return undefined;
      }
      return { owner: repoOwner, name: repoName };
    })
    .filter((repo) => repo !== undefined);

  return {
    owner: options.owner,
    reposToFilterBy,
    dependenciesToFilterBy: options.dependencies,
    verbose: options.verbose,
  };
}

export async function scan(args: unknown) {
  logger.info("");
  const { owner, reposToFilterBy, dependenciesToFilterBy, verbose } =
    getOptions(args);

  if (verbose) {
    logger.setIsVerbose(true);
  }

  const octokitService = new OctokitService();

  const fetchingReposSpinner = getSpinner(
    "Fetching list of repositories to analyze"
  );

  fetchingReposSpinner.start();

  const repos = reposToFilterBy
    ? await octokitService.fetchListOfRepositories({ repos: reposToFilterBy })
    : await octokitService.fetchReposForAuthenticatedUser({
        owner,
      });

  fetchingReposSpinner.stop();

  if (repos.length === 0) {
    logger.info(
      "Did not find any repositories accessible by the CLI using the given configuration options:"
    );

    if (owner) {
      logger.info(`- Owner: ${owner}`);
    } else {
      logger.info(`- Owner: N/A`);
    }

    if (reposToFilterBy) {
      logger.info(`- Repositories to filter by: ${reposToFilterBy.join(", ")}`);
    } else {
      logger.info(`- Repositories to filter by: N/A`);
    }

    if (dependenciesToFilterBy) {
      logger.info(
        `- Dependencies to filter by: ${dependenciesToFilterBy.join(", ")}`
      );
    } else {
      logger.info(`- Dependencies to filter by: N/A`);
    }

    logger.info("");
    return;
  }

  logger.debug(
    `Found ${repos.length} repositories accessible by the CLI using the given configuration options.`
  );
  logger.debug("");

  for (const repo of repos) {
    const fetchingDependencyDashboardSpinner = getSpinner(
      `Fetching dependency dashboard for ${repo.full_name}`
    );

    fetchingDependencyDashboardSpinner.start();

    const dependencyDashboard = await octokitService.fetchDependencyDashboard({
      repoName: repo.name,
      repoOwner: repo.owner.login,
    });

    fetchingDependencyDashboardSpinner.stop();

    if (!dependencyDashboard) {
      logger.debug(
        `Repository ${repo.owner.login}/${repo.name} is not using Renovate`
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
      dependenciesToFilterBy,
      dependencyDashboardUrl: dependencyDashboard.html_url,
      repo: {
        name: repo.name,
        owner: repo.owner.login,
        url: repo.html_url,
      },
    });
  }
}
