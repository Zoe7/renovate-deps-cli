import { confirm, input, password } from "@inquirer/prompts";
import { userConfig } from "../../utils/config.js";
import chalk from "chalk";
import { z } from "zod";
import { logger } from "../../utils/logger.js";

export async function init() {
  // Prompt the user for their GitHub token
  const githubToken = userConfig.githubToken.get();
  let keepExistingToken = false;
  // user has already set a token, we can re-use the existing one
  if (githubToken) {
    logger.info("");
    keepExistingToken = await confirm({
      message:
        "Your GitHub token is already set. Continue using the same token?",
      default: true,
    });
  }

  if (!keepExistingToken) {
    logger.info("");
    logger.info(
      "To let the CLI pull data from your repositories and authenticate with GitHub, it will need a Personal Access Token (classic)."
    );
    logger.info(
      "Learn more about GitHub tokens and how to create one here:",
      chalk.underline(
        "https://docs.github.com/en/github/authenticating-to-github/creating-a-personal-access-token"
      )
    );
    logger.info(
      "\nPlease ensure the token has the following scope enabled:\n",
      "  - repo (to access your repositories)\n"
    );

    const promptedGithubToken = await password({
      message: "Enter your GitHub token:",
      mask: "*",
      validate: (input) => {
        if (z.string().min(10).safeParse(input).success) {
          return true;
        } else {
          return "Please enter a valid GitHub token.";
        }
      },
    });
    userConfig.githubToken.set(promptedGithubToken);
  }

  logger.info("");
  logger.info("Set your CLI defaults for faster commands!");
  logger.info("");
  logger.info(
    "To streamline your experience, you can configure default values for the CLI to use."
  );
  logger.info(
    "These defaults will automatically be applied when searching through repositories, so you don't have to set them manually on every command."
  );
  logger.info(
    "You can always override these parameters on a per-command basis if needed."
  );

  logger.info("");
  const owner = await input({
    message: "Github Repository Owner (optional):",
  });

  if (owner.length > 0) {
    userConfig.defaultOwner.set(owner);
  } else {
    userConfig.defaultOwner.delete();
  }

  logger.info("");

  const defaultRenovateGithubAuthor = await input({
    message: "Renovate GitHub author:",
    default: "renovate[bot]",
    validate: (input) => {
      if (z.string().min(1).safeParse(input).success) {
        return true;
      } else {
        return "Please enter a valid Renovate GitHub author.";
      }
    },
  });

  userConfig.defaultRenovateGithubAuthor.set(defaultRenovateGithubAuthor);

  logger.info("");
  logger.success("Setup complete, you can now use the CLI.");
}
