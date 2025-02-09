import { Octokit } from "@octokit/rest";
import { userConfig } from "../utils/config.js";
import { logger } from "../utils/logger.js";

type Repository = Awaited<
  ReturnType<Octokit["repos"]["listForAuthenticatedUser"]>
>["data"][number];

export class OctokitService {
  private octokit: Octokit;

  constructor() {
    this.octokit = new Octokit({
      auth: userConfig.githubToken.get(),
    });
  }

  async fetchRepos({
    org,
    reposToFilterBy,
  }: {
    org: string | undefined;
    reposToFilterBy?: string[] | undefined;
  }) {
    const repos = (
      await this.octokit.paginate(this.octokit.repos.listForAuthenticatedUser)
    ).filter((repo) => {
      const conditions: ((repo: Repository) => boolean)[] = [
        // default conditions we want to be true for every repo
        (repo) => repo.archived === false,
      ];

      if (org) {
        conditions.push((repo) => repo.owner.login === org);
      }

      if (reposToFilterBy) {
        conditions.push(
          (repo) =>
            reposToFilterBy.includes(repo.full_name) ||
            reposToFilterBy.includes(repo.name)
        );
      }

      return conditions.every((condition) => condition(repo));
    });

    return repos;
  }

  async fetchDependencyDashboard({
    repoName,
    repoOwner,
    renovateGithubAuthor,
  }: {
    repoName: string;
    repoOwner: string;
    renovateGithubAuthor: string;
  }) {
    const issues = (
      await this.octokit.paginate(this.octokit.issues.listForRepo, {
        repo: repoName,
        owner: repoOwner,
        creator: renovateGithubAuthor,
      })
    ).filter(
      (issue) =>
        issue.pull_request === undefined &&
        issue.title.includes("Dependency Dashboard")
    );

    if (issues.length > 1) {
      logger.debug("");
      logger.debug(
        `Multiple dependency dashboard issues found for repo ${repoName} and renovate bot ${renovateGithubAuthor}`
      );
      for (const issue of issues) {
        logger.debug(`Issue title: ${issue.title}`);
      }
      logger.debug("");
    }

    return issues[0];
  }
}
