import { Octokit } from "@octokit/rest";
import { userConfig } from "../utils/config.js";
import { logger } from "../utils/logger.js";
import { throttling } from "@octokit/plugin-throttling";

type Repository = Awaited<
  ReturnType<Octokit["repos"]["listForAuthenticatedUser"]>
>["data"][number];

const ThrottledOctokit = Octokit.plugin(throttling);

export class OctokitService {
  private octokit: Octokit;

  constructor() {
    this.octokit = new ThrottledOctokit({
      // todo: handle error if this isn't set yet
      auth: userConfig.githubToken.get(),
      log: {
        debug: (message: string) => logger.debug(`    ${message}`),
        info: (message: string) => logger.debug(`    ${message}`),
        warn: (message: string) => logger.debug(`    ${message}`),
        error: (message: string) => logger.debug(`    ${message}`),
      },
      throttle: {
        onRateLimit: (retryAfter, options, _, retryCount) => {
          logger.debug(
            `Request quota exhausted for request ${options.method} ${options.url}`
          );

          if (retryCount < 1) {
            logger.debug(`Retrying after ${retryAfter} seconds!`);
            return true;
          }
          return false;
        },
        onSecondaryRateLimit: (_, options) => {
          logger.debug(
            `SecondaryRateLimit detected for request ${options.method} ${options.url}`
          );
        },
      },
    });
  }

  async fetchReposForAuthenticatedUser({
    owner,
  }: {
    owner?: string | undefined;
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
  }: {
    repoName: string;
    repoOwner: string;
  }) {
    try {
      let page = 1;
      const perPage = 50;
      let dashboardIssue = null;

      while (!dashboardIssue) {
        const response = await this.octokit.issues.listForRepo({
          owner: repoOwner,
          repo: repoName,
          state: "open",
          per_page: perPage,
          sort: "created",
          direction: "asc",
          page,
        });

        dashboardIssue = response.data.find(
          (issue) => issue.title === "Dependency Dashboard"
        );

        if (dashboardIssue) {
          return dashboardIssue;
        }

        // Stop if there are no more issues
        if (response.data.length < perPage) break;
        page++;
      }

      logger.debug("No open 'Dependency Dashboard' issue found.");
      return undefined;
    } catch (error) {
      return undefined;
    }
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
