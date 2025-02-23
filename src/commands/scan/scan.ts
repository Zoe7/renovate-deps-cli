import { z } from "zod";
import { logger } from "../../utils/logger.js";
import chalk from "chalk";
import { OctokitService } from "../../services/octokit.js";
import { userConfig } from "../../utils/config.js";
import { getSpinner } from "../../utils/spinner.js";

export function getOptions(args: unknown) {
  const options = z
    .object({
      owner: z.string().optional(),
      renovateGithubAuthor: z.string().optional(),
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

  const owner = options.owner ?? userConfig.defaultOwner.get();
  const renovateGithubAuthor =
    options.renovateGithubAuthor ??
    userConfig.defaultRenovateGithubAuthor.get();
  return {
    owner,
    renovateGithubAuthor,
    reposToFilterBy,
    dependenciesToFilterBy: options.dependencies,
    verbose: options.verbose,
  };
}

type UpdateInfo = {
  dependency: string | null;
  fromVersion: string | null;
  toVersion: string | null;
  updateType: string | null;
  pullRequest: string | null;
  packages: string[];
};

const extractPullRequest = (text: string) => {
  const regex =
    /\[(?<prefix>.+)]\(\.\.\/pull\/(?<pullRequest>\d+)\)(?<postfix>.*)/g;
  const match = regex.exec(text);

  if (match) {
    const groups = z
      .object({
        pullRequest: z.string().optional(),
        prefix: z.string(),
        postfix: z.string(),
      })
      .parse(match.groups);

    return {
      pullRequest: groups.pullRequest ?? null,
      remainingText: `${groups.prefix}${groups.postfix}`,
    };
  }

  return { pullRequest: null, remainingText: text };
};

const extractUpdateType = (text: string) => {
  const regex =
    /(?<prefix>.+)\((?<updateType>minor|major|patch)\)(?<postfix>.*)/g;
  const match = regex.exec(text);

  if (match) {
    const groups = z
      .object({
        updateType: z.enum(["minor", "major", "patch"]),
        prefix: z.string(),
        postfix: z.string(),
      })
      .parse(match.groups);

    return {
      updateType: groups.updateType,
      remainingText: `${groups.prefix}${groups.postfix}`,
    };
  }

  return { updateType: null, remainingText: text };
};

const extractPackages = (text: string) => {
  const regex = /^(?<prefix>.+)(\((?<packages>`[^`]+`(?:, `[^`]+`)*)\))$/g;
  const match = regex.exec(text);

  if (match) {
    const groups = z
      .object({
        packages: z.string(),
        prefix: z.string(),
      })
      .parse(match.groups);

    return {
      packages:
        groups.packages
          .split(", ")
          .map((pkg) => pkg.replace(/`/g, "").trim()) ?? [],
      remainingText: groups.prefix,
    };
  }

  return { packages: [], remainingText: text };
};

const extractDependency = (text: string) => {
  const regex =
    /Update (buildkite plugin |dependency |module |)(?<name>\S+)(monorepo|)/g;
  const match = regex.exec(text);

  if (match) {
    const groups = z
      .object({
        name: z.string(),
      })
      .parse(match.groups);
    return {
      dependency: groups.name.trim(),
      remainingText: "",
    };
  }

  return { dependency: null, remainingText: text };
};

const extractVersions = (text: string) => {
  const regex =
    /^(?<prefix>.+?)(?:from (?<fromVersion>\S+))? ?(?:to (?<toVersion>\S+))?\s*$/g;
  const match = regex.exec(text);

  if (match) {
    const groups = z
      .object({
        fromVersion: z.string().optional(),
        toVersion: z.string().optional(),
        prefix: z.string(),
      })
      .parse(match.groups);

    return {
      fromVersion: groups.fromVersion ?? null,
      toVersion: groups.toVersion ?? null,
      remainingText: groups.prefix,
    };
  }

  return { fromVersion: null, toVersion: null, remainingText: text };
};

export const extractUpdateInfo = (text: string) => {
  const pendingUpdates: UpdateInfo[] = [];

  for (const match of text.matchAll(/-->(?<_line>[^\n]+Update[^\n]+)/g)) {
    const line = match.groups?.["_line"];
    if (!line) {
      continue;
    }

    const pullRequestInfo = extractPullRequest(line);
    const updateTypeInfo = extractUpdateType(pullRequestInfo.remainingText);
    const packagesInfo = extractPackages(updateTypeInfo.remainingText);
    const versionsInfo = extractVersions(packagesInfo.remainingText);
    const dependencyInfo = extractDependency(versionsInfo.remainingText);

    pendingUpdates.push({
      dependency: dependencyInfo.dependency,
      fromVersion: versionsInfo.fromVersion,
      toVersion: versionsInfo.toVersion,
      updateType: updateTypeInfo.updateType,
      pullRequest: pullRequestInfo.pullRequest,
      packages: packagesInfo.packages,
    });
  }

  return pendingUpdates;
};

export async function scan(args: unknown) {
  logger.info("");
  const {
    owner,
    renovateGithubAuthor,
    reposToFilterBy,
    dependenciesToFilterBy,
    verbose,
  } = getOptions(args);

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

    if (renovateGithubAuthor) {
      logger.info(`- Renovate GitHub author: ${renovateGithubAuthor}`);
    } else {
      logger.info(`- Renovate GitHub author: N/A`);
    }

    logger.info("");
    return;
  }

  logger.debug(
    `Found ${repos.length} repositories accessible by the CLI using the given configuration options.`
  );
  logger.debug("");

  let hasUpdates = false;

  for (const repo of repos) {
    const fetchingDependencyDashboardSpinner = getSpinner(
      `Fetching dependency dashboard for ${repo.full_name}`
    );

    fetchingDependencyDashboardSpinner.start();

    const dependencyDashboard = await octokitService.fetchDependencyDashboard({
      repoName: repo.name,
      repoOwner: repo.owner.login,
      renovateGithubAuthor,
    });

    fetchingDependencyDashboardSpinner.stop();

    if (!dependencyDashboard) {
      logger.debug(`${repo.full_name}`);
      logger.debug("  Not using Renovate");
      logger.debug("");
      continue;
    }

    if (!dependencyDashboard.body) {
      logger.debug(`${repo.full_name}`);
      logger.debug(
        `  issue: ${dependencyDashboard.title} - ${dependencyDashboard.user?.login}`
      );
      logger.debug(
        `  dependency dashboard body is unavailable. Can't retrieve list of updates. Skipping this repository.`
      );
      logger.debug("");
      continue;
    }

    const allUpdates = extractUpdateInfo(dependencyDashboard.body);
    const updates = dependenciesToFilterBy
      ? allUpdates.filter((update) => {
          if (
            update.dependency &&
            dependenciesToFilterBy.includes(update.dependency)
          ) {
            return true;
          }

          if (
            update.packages &&
            update.packages.some((p) => dependenciesToFilterBy.includes(p))
          ) {
            return true;
          }

          return false;
        })
      : allUpdates;

    if (updates.length === 0) {
      logger.debug(
        chalk.blue(
          `${repo.full_name} - ${chalk.underline(dependencyDashboard.html_url)}`
        )
      );
      logger.debug("  No updates found");
      logger.debug("");
      continue;
    }

    logger.info(
      chalk.blue(
        `${repo.full_name} - ${chalk.underline(dependencyDashboard.html_url)}`
      )
    );

    for (const update of updates) {
      hasUpdates = true;
      const logInfo: string[] = [];

      logInfo.push(`  - Update ${update.dependency}`);
      if (update.fromVersion) {
        logInfo.push(`from ${update.fromVersion}`);
      }

      if (update.toVersion) {
        logInfo.push(`to ${update.toVersion}`);
      }

      if (update.updateType) {
        logInfo.push(`(${update.updateType})`);
      }

      if (update.packages.length > 0) {
        logInfo.push(chalk.gray(`[${update.packages.join(", ")}]`));
      }

      if (update.pullRequest) {
        logInfo.push(
          `- ${chalk.underline(`${repo.html_url}/pull/${update.pullRequest}`)}`
        );
      }

      logger.info(logInfo.join(" "));
    }

    logger.info("");
  }

  if (!hasUpdates) {
    logger.info(`Scanned ${repos.length} repositories. No updates found.\n`);
  }
}
