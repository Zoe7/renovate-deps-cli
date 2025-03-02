import { z } from "zod";
import { logger } from "../../utils/logger.js";
import { OctokitService } from "../../services/octokit.js";

export async function listRepos(...args: unknown[]) {
  logger.info("");
  const [options] = z
    .tuple([
      z.object({
        verbose: z.boolean().catch(false),
      }),
    ])
    .rest(z.unknown())
    .parse(args);

  if (options.verbose) {
    logger.setIsVerbose(true);
  }

  const octokitService = new OctokitService();
  const repos = await octokitService.fetchReposForAuthenticatedUser({});

  for (const repo of repos) {
    logger.info(`- ${repo.owner.login}/${repo.name}`);
  }

  if (repos.length === 0) {
    logger.info("No repositories found");
  }

  logger.info("");
}
