import { z } from "zod";
import { logger } from "../../utils/logger.js";
import { userConfig } from "../../utils/config.js";
import chalk from "chalk";

export function deleteRepoGroup(...args: unknown[]) {
  logger.info("");
  const [groupName] = z.tuple([z.string()]).rest(z.unknown()).parse(args);

  userConfig.repoGroup.delete(groupName);

  logger.info(`Deleted repository group "${chalk.blue(groupName)}"`);
  logger.info("");
}
