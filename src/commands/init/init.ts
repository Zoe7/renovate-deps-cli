import { confirm, password } from "@inquirer/prompts";
import { userConfig } from "../../utils/config.js";
import chalk from "chalk";
import { z } from "zod";
import { logger } from "../../utils/logger.js";

export async function init() {
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
  logger.success("Setup complete, you can now use the CLI.");
}
