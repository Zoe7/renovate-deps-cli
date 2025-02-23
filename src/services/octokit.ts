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
      // todo: handle error if this isn't set yet
      auth: userConfig.githubToken.get(),
      log: {
        debug: (message: string) => logger.debug(`    ${message}`),
        info: (message: string) => logger.debug(`    ${message}`),
        warn: (message: string) => logger.debug(`    ${message}`),
        error: (message: string) => logger.debug(`    ${message}`),
      },
    });
  }

  async fetchReposForAuthenticatedUser({
    owner,
  }: {
    owner: string | undefined;
  }) {
    try {
      const repos = (
        await this.octokit.paginate(this.octokit.repos.listForAuthenticatedUser)
      ).filter((repo) => {
        const conditions: ((repo: Repository) => boolean)[] = [
          // default conditions we want to be true for every repo
          (repo) => repo.archived === false,
        ];

        if (owner) {
          conditions.push((repo) => repo.owner.login === owner);
        }

        return conditions.every((condition) => condition(repo));
      });

      return repos;
    } catch {
      return [];
    }
  }

  async fetchListOfRepositories({
    repos,
  }: {
    repos: Array<{
      owner: string;
      name: string;
    }>;
  }) {
    const fetchedRepos = [];
    try {
      for (const repo of repos) {
        const response = await this.fetchRepository(repo.name, repo.owner);
        if (response) {
          fetchedRepos.push(response);
        }
      }
    } catch {
      return [];
    }
    return fetchedRepos;
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
    try {
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
    } catch {}
    return undefined;
  }

  async fetchRepository(repoName: string, repoOwner: string) {
    try {
      const response = await this.octokit.repos.get({
        owner: repoOwner,
        repo: repoName,
      });
      return response.data;
    } catch {
      return undefined;
    }
  }
}
