import { Octokit } from "@octokit/rest";
import { userConfig } from "../../utils/config.js";
import { z } from "zod";
import { logger } from "../../utils/logger.js";
import chalk from "chalk";
import ora from "ora";

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

type Repository = Awaited<
  ReturnType<Octokit["repos"]["listForAuthenticatedUser"]>
>["data"][number];

export async function listDependencies(args: unknown) {
  const fetchingReposSpinner = ora(
    "Fetching list of repositories to analyze"
  ).start();

  const options = z
    .object({
      org: z.string().optional(),
      renovateGithubAuthor: z.string().optional(),
    })
    .parse(args);

  const org = options.org ?? userConfig.defaultOrg.get();
  const renovateGithubAuthor =
    options.renovateGithubAuthor ??
    userConfig.defaultRenovateGithubAuthor.get();

  const octokit = new Octokit({
    auth: userConfig.githubToken.get(),
  });

  const repos = (
    await octokit.paginate(octokit.repos.listForAuthenticatedUser)
  ).filter((repo) => {
    const conditions: ((repo: Repository) => boolean)[] = [
      // default conditions we want to be true for every repo
      (repo) => repo.archived === false,
    ];

    if (org) {
      conditions.push((repo) => repo.owner.login === org);
    }

    return conditions.every((condition) => condition(repo));
  });

  logger.debug("");
  logger.debug(
    `Found ${repos.length} repository${
      repos.length > 1 ? "s" : ""
    } accessible by the CLI using the given configuration options.`
  );
  logger.debug("");
  fetchingReposSpinner.stop();

  for (const repo of repos) {
    const fetchingDependencyDashboardSpinner = ora(
      `Fetching dependency dashboard for ${repo.full_name}`
    ).start();
    const issues = (
      await octokit.paginate(octokit.issues.listForRepo, {
        repo: repo.name,
        owner: repo.owner.login,
        creator: renovateGithubAuthor,
      })
    ).filter(
      (issue) =>
        issue.pull_request === undefined &&
        issue.title.includes("Dependency Dashboard")
    );

    fetchingDependencyDashboardSpinner.stop();

    // no issues
    if (issues.length === 0) {
      logger.debug("");
      logger.debug(`${repo.full_name}`);
      logger.debug("  Not using Renovate");
      continue;
    }

    // only one issue per repository
    if (issues.length > 1) {
      logger.debug("");
      logger.debug(`${repo.full_name}`);
      logger.debug(
        `  ${issues.length} dependency dashboard issues found. There should only be one per repository. Skipping this repository.`
      );
      continue;
    }

    for (const issue of issues) {
      if (!issue.body) {
        logger.debug("");
        logger.debug(`${repo.full_name}`);
        logger.debug(`  issue: ${issue.title} - ${issue.user?.login}`);
        logger.debug(
          `  dependency dashboard body is unavailable. Can't retrieve list of updates. Skipping this repository.`
        );
        continue;
      }

      logger.info("");
      logger.info(
        chalk.cyan(`${repo.full_name} - ${chalk.underline(issue.html_url)}`)
      );

      const updates = extractUpdateInfo(issue.body);

      if (updates.length === 0) {
        logger.info("  No updates found");
        continue;
      }

      for (const update of updates) {
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
}
