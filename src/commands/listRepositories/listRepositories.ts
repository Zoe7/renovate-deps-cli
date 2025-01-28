import { Octokit } from "@octokit/rest";
import { userConfig } from "../../utils/config.js";
import chalk from "chalk";

const singlePackageRegex =
  /Update dependency ([^\s]+) from ([^\s]+) to ([^\]\s]+)(?:\]\(\.\.\/pull\/(\d+)\))?/g;
const monorepoRegex =
  /Update ([^\s]+) monorepo.*\(\s*`([^`]*)`\s*(?:,\s*`([^`]*)`\s*)*\)(?:.*\/pull\/(\d+))?/g;

type Repository = Awaited<
  ReturnType<Octokit["repos"]["listForAuthenticatedUser"]>
>["data"][number];

export async function listRepositories() {
  const org = userConfig.defaultOrg.get();
  const renovateGithubAuthor = userConfig.defaultRenovateGithubAuthor.get();

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

  console.log("");
  console.log(
    chalk.white(
      `Found ${repos.length} repository${
        repos.length > 1 ? "s" : ""
      } accessible by the CLI using your current configuration.`
    )
  );

  console.log("");
  for (const repo of repos) {
    console.log(chalk.white(`- ${repo.full_name}`));

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

    // no issues
    if (issues.length === 0) {
      console.log(chalk.yellow("  - Not using Renovate"));
      continue;
    }

    // only one issue per repository
    if (issues.length > 1) {
      console.log(
        chalk.yellow(
          `- ${issues.length} issues found. We should only have one issue per repository. Skipping this one.`
        )
      );
      continue;
    }

    for (const issue of issues) {
      if (!issue.body) {
        console.log(
          chalk.yellow(
            "no issue body, skipping",
            `- ${issue.title} - ${issue.user?.login}`
          )
        );
        continue;
      }

      let match = issue.body.match(singlePackageRegex);

      while ((match = singlePackageRegex.exec(issue.body)) !== null) {
        const [_, packageName, fromVersion, toVersion, pullRequestNumber] =
          match;

        console.log(
          chalk.green(
            `${`  - Update ${packageName} from ${fromVersion} to ${toVersion}`} - ${
              pullRequestNumber
                ? `${repo.html_url}/pull/${pullRequestNumber}`
                : ""
            }`
          )
        );
      }
    }
  }
}
