import { Octokit } from "@octokit/rest";
import { userConfig } from "../../utils/config.js";
import { z } from "zod";
import { logger } from "../../utils/logger.js";
import chalk from "chalk";
import ora from "ora";

const singlePackageRegex =
  /Update dependency ([^\s]+) from ([^\s]+) to ([^\]\s]+)(?:\]\(\.\.\/pull\/(\d+)\))?/g;
const monorepoRegex =
  /Update (?<monorepo>[^\s]+) (?:monorepo )?(?:from (?<from_version>\d+\.\d+\.\d+))? (?:to (?<to_version>\d+\.\d+\.\d+))? \((?<update_type>major|minor|patch)\)(?:\]\(\.\.\/pull\/(?<pull_request>\d+)\))? \((?<packages>`[^`]+`(?:, `[^`]+`)*)\)/g;

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

      const singlePackagesMatch = issue.body.matchAll(singlePackageRegex);
      for (const match of singlePackagesMatch) {
        const [_, packageName, fromVersion, toVersion, pullRequestNumber] =
          match;

        const logInfo = [
          `  - Update ${packageName} from ${fromVersion} to ${toVersion}`,
          pullRequestNumber
            ? `- ${chalk.underline(
                `${repo.html_url}/pull/${pullRequestNumber}`
              )}`
            : "",
        ]
          .filter(Boolean)
          .join(" ");

        logger.info(logInfo);
      }

      const monorepoMatch = issue.body.matchAll(monorepoRegex);
      for (const match of monorepoMatch) {
        const [
          _,
          monorepo,
          fromVersion,
          toVersion,
          updateType,
          pullRequest,
          packages,
        ] = match;

        const logInfo = [
          `  - Update ${monorepo}`,
          fromVersion && toVersion
            ? `from ${fromVersion} to ${toVersion}`
            : updateType
            ? `(${updateType})`
            : null,
          packages
            ? chalk.gray(
                `[${packages
                  .split(", ")
                  .map((pkg: any) => pkg.replace(/`/g, "").trim())
                  .join(", ")}]`
              )
            : null,
          pullRequest
            ? chalk.underline(`${repo.html_url}/pull/${pullRequest}`)
            : null,
        ]
          .filter(Boolean)
          .join(" ");

        logger.info(logInfo);
      }
    }
  }
}
