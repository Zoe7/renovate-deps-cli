import chalk from "chalk";
import { userConfig } from "../../utils/config.js";
import { logger } from "../../utils/logger.js";

export function listRepoGroups() {
  logger.info("");
  const groups = userConfig.repoGroup.getAll();

  if (groups.length === 0) {
    logger.info("No repository groups found");
    return;
  }

  logger.info(
    groups
      .map(({ groupName, repos }) => {
        const repoGroupInfo: Array<string> = [];

        repoGroupInfo.push(
          `${chalk.blue(groupName)} ${chalk.grey(
            `(${repos.length} repositories)`
          )}`
        );

        for (const repo of repos) {
          repoGroupInfo.push(`  - ${repo.owner}/${repo.name}`);
        }

        return repoGroupInfo.join("\n");
      })
      .join("\n\n")
  );
  logger.info("");
}
