import { z } from "zod";
import { logger } from "../../utils/logger.js";
import chalk from "chalk";
import ora from "ora";
import { OctokitService } from "../../services/octokit.js";
import { userConfig } from "../../utils/config.js";

export function getOptions(args: unknown) {
  const options = z
    .object({
      org: z.string().optional(),
      renovateGithubAuthor: z.string().optional(),
      repos: z.array(z.string()).optional(),
      dependencies: z.array(z.string()).optional(),
    })
    .parse(args);

  const org = options.org ?? userConfig.defaultOrg.get();
  const renovateGithubAuthor =
    options.renovateGithubAuthor ??
    userConfig.defaultRenovateGithubAuthor.get();

  return {
    org,
    renovateGithubAuthor,
    reposToFilterBy: options.repos,
    dependenciesToFilterBy: options.dependencies,
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

export async function listDependencies(args: unknown) {
  const { org, renovateGithubAuthor, reposToFilterBy, dependenciesToFilterBy } =
    getOptions(args);

  const octokitService = new OctokitService();

  const fetchingReposSpinner = ora(
    "Fetching list of repositories to analyze"
  ).start();

  const repos = await octokitService.fetchRepos({
    org,
    reposToFilterBy,
  });

  fetchingReposSpinner.stop();

  if (repos.length === 0) {
    logger.info("");
    logger.info("");
    logger.info(
      "Did not find any repositories accessible by the CLI using the given configuration options:"
    );
    logger.info(`- Organization: ${org ?? "N/A"}`);
    logger.info(
      `- Repositories to filter by: ${
        reposToFilterBy ? reposToFilterBy.join(", ") : "N/A"
      }`
    );
    return;
  }

  logger.debug("");
  logger.debug(
    `Found ${repos.length} repository${
      repos.length > 1 ? "s" : ""
    } accessible by the CLI using the given configuration options.`
  );
  logger.debug("");

  for (const repo of repos) {
    const fetchingDependencyDashboardSpinner = ora(
      `Fetching dependency dashboard for ${repo.full_name}`
    ).start();

    const dependencyDashboard = await octokitService.fetchDependencyDashboard({
      repoName: repo.name,
      repoOwner: repo.owner.login,
      renovateGithubAuthor,
    });

    fetchingDependencyDashboardSpinner.stop();

    if (!dependencyDashboard) {
      logger.debug("");
      logger.debug(`${repo.full_name}`);
      logger.debug("  Not using Renovate");
      continue;
    }

    if (!dependencyDashboard.body) {
      logger.debug("");
      logger.debug(`${repo.full_name}`);
      logger.debug(
        `  issue: ${dependencyDashboard.title} - ${dependencyDashboard.user?.login}`
      );
      logger.debug(
        `  dependency dashboard body is unavailable. Can't retrieve list of updates. Skipping this repository.`
      );
      continue;
    }

    const updates = extractUpdateInfo(dependencyDashboard.body);
    const filteredUpdates = dependenciesToFilterBy
      ? updates.filter((update) => {
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
      : updates;

    if (filteredUpdates.length === 0) {
      logger.debug("");
      logger.debug(
        chalk.cyan(
          `${repo.full_name} - ${chalk.underline(dependencyDashboard.html_url)}`
        )
      );
      logger.debug("  No updates found");
      continue;
    }

    logger.info("");
    logger.info(
      chalk.cyan(
        `${repo.full_name} - ${chalk.underline(dependencyDashboard.html_url)}`
      )
    );
    for (const update of filteredUpdates) {
      const logInfo = [
        `  - Update ${update.dependency}`,
        update.fromVersion ? `from ${update.fromVersion}` : null,
        update.toVersion ? `to ${update.toVersion}` : null,
        update.updateType ? `(${update.updateType})` : null,
        update.packages.length > 0
          ? chalk.gray(`[${update.packages.join(", ")}]`)
          : null,
        update.pullRequest
          ? `- ${chalk.underline(
              `${repo.html_url}/pull/${update.pullRequest}`
            )}`
          : null,
      ]
        .filter(Boolean)
        .join(" ");

      logger.info(logInfo);
    }
  }
}
