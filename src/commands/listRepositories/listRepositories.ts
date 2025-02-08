import { Octokit } from "@octokit/rest";
import { userConfig } from "../../utils/config.js";
import { z } from "zod";
import { logger } from "../../utils/logger.js";
import chalk from "chalk";
import ora from "ora";

interface UpdateInfo {
  dependency: string;
  fromVersion: string | null;
  toVersion: string | null;
  updateType: string | null;
  pullRequest: string | null;
  packages: string[];
}

class InfoExtractor {
  public info: UpdateInfo;
  private message: string;

  constructor() {
    this.info = {
      dependency: "",
      fromVersion: null,
      toVersion: null,
      updateType: null,
      pullRequest: null,
      packages: [],
    };
    this.message = "";
  }

  extract(message: string) {
    this.info = {
      dependency: "",
      fromVersion: null,
      toVersion: null,
      updateType: null,
      pullRequest: null,
      packages: [],
    };
    this.message = message;

    this.extractPullRequest();
    this.extractUpdateType();
    this.extractPackages();
    this.extractVersions();
    this.extractDependency();
  }

  private extractPullRequest() {
    const regex = /\[(.+)]\(\.\.\/pull\/(\d+)\)(.*)/g;
    const match = regex.exec(this.message);
    if (match) {
      this.info.pullRequest = match[2] as string;
      this.message = ((match[1] as string) + match[3]) as string;
    }
  }

  private extractUpdateType() {
    const regex = /(.+)\((minor|major|patch)\)(.*)/g;
    const match = regex.exec(this.message);
    if (match) {
      this.info.updateType = match[2] as string;
      this.message = ((match[1] as string) + match[3]) as string;
    }
  }

  private extractPackages() {
    const regex = /^(.+)(\((?<packages>`[^`]+`(?:, `[^`]+`)*)\))$/g;
    const match = regex.exec(this.message);
    if (match) {
      this.info.packages =
        match
          .groups!["packages"]?.split(", ")
          .map((pkg: string) => pkg.replace(/`/g, "").trim()) ?? [];
      this.message = match[1] as string;
    }
  }

  private extractVersions() {
    const regex =
      /^(.+?)(?:from (?<fromVersion>\S+))? ?(?:to (?<toVersion>\S+))?\s*$/g;
    const match = regex.exec(this.message);
    if (match) {
      this.info.fromVersion = match.groups!["fromVersion"] || null;
      this.info.toVersion = match.groups!["toVersion"] || null;
      this.message = match[1] as string;
    }
  }

  private extractDependency() {
    const regex =
      /Update (buildkite plugin |dependency |module |)(\S+)( monorepo|)/g;
    const match = regex.exec(this.message);
    if (match) {
      this.info.dependency = match[2] as string;
      this.message = "";
    }
  }
}

export const extractUpdateInfo = (text: string): UpdateInfo[] => {
  const results: UpdateInfo[] = [];
  const regex = /-->([^\n]+Update[^\n]+)/g;
  let match;
  const extractor = new InfoExtractor();

  while ((match = regex.exec(text)) !== null) {
    extractor.extract(match[1] as string);
    results.push(extractor.info);
  }

  return results;
};

type Repository = Awaited<
  ReturnType<Octokit["repos"]["listForAuthenticatedUser"]>
>["data"][number];

export async function listRepositories(args: unknown) {
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
      for (const update of updates) {
        const logInfo = [
          `  - Update ${update.dependency.trim()}`,
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
