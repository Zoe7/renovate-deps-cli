import chalk from "chalk";
import { logger } from "../../utils/logger.js";
import { UpdateInfo } from "./extractUpdateInfo.js";

export function printUpdates({
  updates: allUpdates,
  dependenciesToFilterBy,
  updateType,
  dependencyDashboardUrl,
  repo,
}: {
  updates: Array<UpdateInfo>;
  dependenciesToFilterBy?: Array<string> | undefined;
  updateType?: "major" | "minor" | "patch" | undefined;
  dependencyDashboardUrl: string;
  repo: {
    name: string;
    owner: string;
    url: string;
  };
}) {
  const lowerCaseDependenciesToFilterBy = dependenciesToFilterBy?.map((d) =>
    d.toLowerCase()
  );
  const updates =
    lowerCaseDependenciesToFilterBy || updateType
      ? allUpdates.filter((update) => {
          if (updateType && update.updateType !== updateType) {
            return false;
          }

          if (!lowerCaseDependenciesToFilterBy) {
            return true;
          }

          if (
            update.dependency &&
            lowerCaseDependenciesToFilterBy.includes(
              update.dependency.toLocaleLowerCase()
            )
          ) {
            return true;
          }

          if (
            update.packages &&
            update.packages.some((p) =>
              lowerCaseDependenciesToFilterBy.includes(p.toLocaleLowerCase())
            )
          ) {
            return true;
          }

          return false;
        })
      : allUpdates;

  logger.info(
    chalk.blue(
      `${repo.owner}/${repo.name} - ${chalk.underline(dependencyDashboardUrl)}`
    )
  );

  if (updates.length === 0) {
    logger.info(
      chalk.dim(
        updates.length !== allUpdates.length
          ? "  - No pending updates matching the dependency filter"
          : "  - No pending updates"
      )
    );
  }

  for (const update of updates) {
    const logInfo: string[] = [];

    logInfo.push(`  - Update ${update.dependency}`);
    if (update.fromVersion) {
      logInfo.push(`from ${update.fromVersion}`);
    }

    if (update.toVersion) {
      logInfo.push(`to ${update.toVersion}`);
    }

    if (update.updateType) {
      logInfo.push(`(${update.updateType})`);
    }

    if (update.packages.length > 0) {
      logInfo.push(chalk.gray(`[${update.packages.join(", ")}]`));
    }

    if (update.pullRequest) {
      logInfo.push(
        `- ${chalk.underline(`${repo.url}/pull/${update.pullRequest}`)}`
      );
    }

    logger.info(logInfo.join(" "));
  }

  logger.info("");
}
